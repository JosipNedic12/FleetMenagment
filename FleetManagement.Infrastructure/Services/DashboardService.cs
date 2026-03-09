using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Npgsql;

namespace FleetManagement.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly FleetDbContext _db;
    private readonly IMemoryCache _cache;

    public DashboardService(FleetDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<DashboardDto> GetDashboardAsync()
    {
        if (_cache.TryGetValue("dashboard", out DashboardDto? cached) && cached != null)
            return cached;

        var result = await BuildDashboardInternalAsync();
        _cache.Set("dashboard", result, TimeSpan.FromSeconds(45));
        return result;
    }

    private async Task<DashboardDto> BuildDashboardInternalAsync()
    {
        var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
        var wasOpen = conn.State == System.Data.ConnectionState.Open;
        if (!wasOpen) await conn.OpenAsync();

        try
        {
            var (stats, kmThisMonth) = await ReadStatsAsync(conn);
            var charts = await ReadChartDataAsync(conn);
            var compliance = await ReadComplianceRemindersAsync(conn);

            return new DashboardDto
            {
                ActiveVehicles = stats.ActiveVehicles,
                OpenMaintenanceOrders = stats.OpenOrders,
                KmThisMonth = kmThisMonth,
                UnpaidFines = stats.UnpaidFines,
                ExpiredInsurance = stats.ExpiredInsurance,
                AccidentCount = stats.TotalAccidents,
                FuelCostThisMonth = stats.FuelCostThisMonth,
                InspectionsDue = stats.ExpiringInspections,
                ComplianceReminders = compliance,
                AssignmentSummary = new AssignmentSummaryDto
                {
                    TotalVehicles = stats.TotalVehicles,
                    Assigned = stats.AssignedVehicles,
                    Unassigned = stats.TotalVehicles - stats.AssignedVehicles
                },
                WorkOrderSummary = new WorkOrderSummaryDto
                {
                    Open = stats.OpenOnlyOrders,
                    InProgress = stats.InProgressOrders,
                    Completed = stats.CompletedOrders,
                    Overdue = stats.OverdueOrders
                },
                VehicleStatusBreakdown = new VehicleStatusBreakdownDto
                {
                    Active = stats.ActiveVehicles,
                    InService = stats.InShopVehicles,
                    Retired = stats.RetiredVehicles,
                    Sold = stats.SoldVehicles
                },
                FuelCostByMonth = charts.Select(c => c.FuelCost).ToList(),
                MaintenanceCostByMonth = charts.Select(c => c.MaintCost).ToList(),
                AccidentsByMonth = charts.Select(c => c.Accidents).ToList(),
                FinesByMonth = charts.Select(c => c.Fines).ToList()
            };
        }
        finally
        {
            if (!wasOpen) await conn.CloseAsync();
        }
    }

    // ── Query 1: All scalar stat counts in one round-trip ────────────────────
    private static async Task<(DashboardStats stats, int kmThisMonth)> ReadStatsAsync(NpgsqlConnection conn)
    {
        const string sql = """
            SELECT
              (SELECT count(*) FROM fleet.vehicle WHERE NOT is_deleted) AS total_vehicles,
              (SELECT count(*) FROM fleet.vehicle WHERE NOT is_deleted AND status = 'active') AS active_vehicles,
              (SELECT count(*) FROM fleet.vehicle WHERE NOT is_deleted AND status = 'service') AS in_shop_vehicles,
              (SELECT count(*) FROM fleet.vehicle WHERE NOT is_deleted AND status = 'retired') AS retired_vehicles,
              (SELECT count(*) FROM fleet.vehicle WHERE NOT is_deleted AND status = 'sold') AS sold_vehicles,
              (SELECT count(*) FROM fleet.maintenance_order WHERE status IN ('open','in_progress')) AS open_orders,
              (SELECT count(*) FROM fleet.maintenance_order WHERE status = 'open') AS open_only_orders,
              (SELECT count(*) FROM fleet.maintenance_order WHERE status = 'in_progress') AS in_progress_orders,
              (SELECT count(*) FROM fleet.maintenance_order WHERE status = 'closed') AS completed_orders,
              (SELECT count(*) FROM fleet.maintenance_order WHERE status = 'open' AND reported_at < now() - interval '14 days') AS overdue_orders,
              (SELECT count(*) FROM fleet.fine WHERE paid_at IS NULL) AS unpaid_fines,
              (SELECT count(*) FROM fleet.insurance_policy WHERE valid_to < now()::date) AS expired_insurance,
              (SELECT count(*) FROM fleet.accident) AS total_accidents,
              (SELECT count(*) FROM fleet.inspection WHERE valid_to IS NOT NULL AND valid_to BETWEEN now()::date AND now()::date + interval '30 days') AS expiring_inspections,
              (SELECT COALESCE(SUM(total_cost), 0) FROM fleet.fuel_transaction WHERE posted_at >= date_trunc('month', now())) AS fuel_cost_this_month,
              (SELECT count(DISTINCT vehicle_id) FROM fleet.vehicle_assignment WHERE assigned_to IS NULL) AS assigned_vehicles
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();

        // count(*) returns bigint in PostgreSQL — cast to int
        static int C(NpgsqlDataReader rd, string col) => (int)rd.GetInt64(rd.GetOrdinal(col));

        var stats = new DashboardStats
        {
            TotalVehicles = C(r, "total_vehicles"),
            ActiveVehicles = C(r, "active_vehicles"),
            InShopVehicles = C(r, "in_shop_vehicles"),
            RetiredVehicles = C(r, "retired_vehicles"),
            SoldVehicles = C(r, "sold_vehicles"),
            OpenOrders = C(r, "open_orders"),
            OpenOnlyOrders = C(r, "open_only_orders"),
            InProgressOrders = C(r, "in_progress_orders"),
            CompletedOrders = C(r, "completed_orders"),
            OverdueOrders = C(r, "overdue_orders"),
            UnpaidFines = C(r, "unpaid_fines"),
            ExpiredInsurance = C(r, "expired_insurance"),
            TotalAccidents = C(r, "total_accidents"),
            ExpiringInspections = C(r, "expiring_inspections"),
            FuelCostThisMonth = r.GetDecimal(r.GetOrdinal("fuel_cost_this_month")),
            AssignedVehicles = C(r, "assigned_vehicles")
        };

        // Need a second read for odometer — close this reader first
        await r.CloseAsync();

        int kmThisMonth = await ReadKmThisMonthAsync(conn);
        return (stats, kmThisMonth);
    }

    // ── Query 4: KM this month via odometer logs ─────────────────────────────
    private static async Task<int> ReadKmThisMonthAsync(NpgsqlConnection conn)
    {
        const string sql = """
            SELECT vehicle_id, odometer_km, log_date
            FROM fleet.odometer_log
            WHERE log_date >= (date_trunc('month', now()) - interval '1 month')::date
            ORDER BY vehicle_id, log_date
            """;

        var rows = new List<(int vehicleId, int odometerKm, DateOnly logDate)>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
            rows.Add((r.GetInt32(0), r.GetInt32(1), r.GetFieldValue<DateOnly>(2)));

        var monthStart = DateOnly.FromDateTime(new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1));
        int total = 0;
        foreach (var group in rows.GroupBy(o => o.vehicleId))
        {
            var sorted = group.OrderBy(o => o.logDate).ToList();
            var thisMonth = sorted.Where(o => o.logDate >= monthStart).ToList();
            if (thisMonth.Count == 0) continue;

            var maxThisMonth = thisMonth.Max(o => o.odometerKm);
            var beforeMonth = sorted.Where(o => o.logDate < monthStart).ToList();
            var baseline = beforeMonth.Count > 0
                ? beforeMonth.Last().odometerKm
                : thisMonth.Min(o => o.odometerKm);

            total += Math.Max(0, maxThisMonth - baseline);
        }
        return total;
    }

    // ── Query 2: Monthly chart data (6 months) ───────────────────────────────
    private static async Task<List<MonthlyChartRow>> ReadChartDataAsync(NpgsqlConnection conn)
    {
        const string sql = """
            SELECT
              to_char(month, 'YYYY-MM') AS month_key,
              COALESCE(SUM(fuel_cost), 0) AS fuel_cost,
              COALESCE(SUM(maint_cost), 0) AS maint_cost,
              COALESCE(SUM(accident_count), 0) AS accidents,
              COALESCE(SUM(fine_count), 0) AS fines
            FROM generate_series(
              date_trunc('month', now()) - interval '5 months',
              date_trunc('month', now()),
              '1 month'
            ) AS month
            LEFT JOIN (
              SELECT date_trunc('month', posted_at) AS m, SUM(total_cost) AS fuel_cost
              FROM fleet.fuel_transaction GROUP BY 1
            ) f ON f.m = month
            LEFT JOIN (
              SELECT date_trunc('month', reported_at) AS m, SUM(total_cost) AS maint_cost
              FROM fleet.maintenance_order WHERE status = 'closed' GROUP BY 1
            ) mt ON mt.m = month
            LEFT JOIN (
              SELECT date_trunc('month', occurred_at) AS m, count(*) AS accident_count
              FROM fleet.accident GROUP BY 1
            ) a ON a.m = month
            LEFT JOIN (
              SELECT date_trunc('month', occurred_at) AS m, count(*) AS fine_count
              FROM fleet.fine GROUP BY 1
            ) fi ON fi.m = month
            GROUP BY month
            ORDER BY month
            """;

        var rows = new List<MonthlyChartRow>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            rows.Add(new MonthlyChartRow
            {
                MonthKey = r.GetString(0),
                FuelCost = r.GetDecimal(1),
                MaintCost = r.GetDecimal(2),
                Accidents = (int)r.GetInt64(3),
                Fines = (int)r.GetInt64(4)
            });
        }
        return rows;
    }

    // ── Query 3: Compliance reminders ────────────────────────────────────────
    private static async Task<List<ComplianceReminderDto>> ReadComplianceRemindersAsync(NpgsqlConnection conn)
    {
        const string sql = """
            SELECT c.vehicle_id, v.registration_number, c.type, c.expires_at
            FROM (
              SELECT vehicle_id, 'Insurance' AS type, valid_to AS expires_at
              FROM fleet.insurance_policy
              WHERE valid_to BETWEEN now()::date - interval '30 days' AND now()::date + interval '30 days'
              UNION ALL
              SELECT vehicle_id, 'Registration', valid_to
              FROM fleet.registration_record
              WHERE valid_to BETWEEN now()::date - interval '30 days' AND now()::date + interval '30 days'
              UNION ALL
              SELECT vehicle_id, 'Inspection', valid_to
              FROM fleet.inspection
              WHERE valid_to IS NOT NULL
                AND valid_to BETWEEN now()::date - interval '30 days' AND now()::date + interval '30 days'
            ) c
            JOIN fleet.vehicle v ON v.vehicle_id = c.vehicle_id
            ORDER BY c.expires_at ASC
            LIMIT 20
            """;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var reminders = new List<ComplianceReminderDto>();

        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            var vehicleId = r.GetInt32(0);
            var regNumber = r.GetString(1);
            var type = r.GetString(2);
            var expiresAt = r.GetFieldValue<DateOnly>(3);
            var daysLeft = expiresAt.DayNumber - today.DayNumber;

            reminders.Add(new ComplianceReminderDto
            {
                VehicleId = vehicleId,
                RegistrationNumber = regNumber,
                Type = type,
                ExpiresAt = expiresAt,
                DaysLeft = daysLeft,
                Status = daysLeft < 0 ? "expired" : "due_soon"
            });
        }
        return reminders;
    }

    // ── Private DTOs for internal mapping ────────────────────────────────────
    private sealed class DashboardStats
    {
        public int TotalVehicles { get; init; }
        public int ActiveVehicles { get; init; }
        public int InShopVehicles { get; init; }
        public int RetiredVehicles { get; init; }
        public int SoldVehicles { get; init; }
        public int OpenOrders { get; init; }
        public int OpenOnlyOrders { get; init; }
        public int InProgressOrders { get; init; }
        public int CompletedOrders { get; init; }
        public int OverdueOrders { get; init; }
        public int UnpaidFines { get; init; }
        public int ExpiredInsurance { get; init; }
        public int TotalAccidents { get; init; }
        public int ExpiringInspections { get; init; }
        public decimal FuelCostThisMonth { get; init; }
        public int AssignedVehicles { get; init; }
    }

    private sealed class MonthlyChartRow
    {
        public string MonthKey { get; init; } = string.Empty;
        public decimal FuelCost { get; init; }
        public decimal MaintCost { get; init; }
        public int Accidents { get; init; }
        public int Fines { get; init; }
    }
}
