using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly FleetDbContext _db;

    public DashboardService(FleetDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardDto> GetDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var overdueThreshold = now.AddDays(-14);
        var dueSoonThreshold = today.AddDays(30);

        // --- Vehicle status counts (1 query instead of separate activeVehicles + statusBreakdown) ---
        var statusCounts = await _db.Vehicles.AsNoTracking()
            .Where(v => !v.IsDeleted)
            .GroupBy(v => v.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var activeVehicles = statusCounts.FirstOrDefault(s => s.Status == "active")?.Count ?? 0;
        var totalVehicles = statusCounts.Sum(s => s.Count);
        var statusBreakdown = new VehicleStatusBreakdownDto
        {
            Active = activeVehicles,
            InService = statusCounts.FirstOrDefault(s => s.Status == "service")?.Count ?? 0,
            Retired = statusCounts.FirstOrDefault(s => s.Status == "retired")?.Count ?? 0,
            Sold = statusCounts.FirstOrDefault(s => s.Status == "sold")?.Count ?? 0
        };

        // --- Maintenance order counts (1 grouped query instead of 4 separate COUNTs) ---
        var orderCounts = await _db.MaintenanceOrders.AsNoTracking()
            .GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var openOrders = (orderCounts.FirstOrDefault(s => s.Status == "open")?.Count ?? 0)
                       + (orderCounts.FirstOrDefault(s => s.Status == "in_progress")?.Count ?? 0);
        var overdueOrders = await _db.MaintenanceOrders.AsNoTracking()
            .CountAsync(o => o.Status == "open" && o.CreatedAt < overdueThreshold);

        var kmThisMonth = await ComputeKmThisMonthAsync(monthStart);

        var unpaidFines = await _db.Fines.AsNoTracking().CountAsync(f => f.PaidAt == null);

        var expiredInsurance = await _db.InsurancePolicies.AsNoTracking().CountAsync(p => p.ValidTo < today);

        var accidentCount = await _db.Accidents.AsNoTracking().CountAsync();

        var fuelCostThisMonth = (await _db.FuelTransactions.AsNoTracking()
            .Where(t => t.PostedAt >= monthStart)
            .SumAsync(t => (decimal?)t.TotalCost)) ?? 0m;

        var inspectionsDue = await _db.Inspections.AsNoTracking()
            .Where(i => i.ValidTo != null && i.ValidTo <= dueSoonThreshold)
            .CountAsync();

        var complianceReminders = await BuildComplianceRemindersAsync(today, dueSoonThreshold);
        var assignmentSummary = await BuildAssignmentSummaryAsync(totalVehicles);
        var charts = await BuildChartDataAsync(now, statusBreakdown);

        return new DashboardDto
        {
            ActiveVehicles = activeVehicles,
            OpenMaintenanceOrders = openOrders,
            KmThisMonth = kmThisMonth,
            UnpaidFines = unpaidFines,
            ExpiredInsurance = expiredInsurance,
            AccidentCount = accidentCount,
            FuelCostThisMonth = fuelCostThisMonth,
            InspectionsDue = inspectionsDue,
            ComplianceReminders = complianceReminders,
            AssignmentSummary = assignmentSummary,
            WorkOrderSummary = new WorkOrderSummaryDto
            {
                Open = orderCounts.FirstOrDefault(s => s.Status == "open")?.Count ?? 0,
                InProgress = orderCounts.FirstOrDefault(s => s.Status == "in_progress")?.Count ?? 0,
                Completed = orderCounts.FirstOrDefault(s => s.Status == "closed")?.Count ?? 0,
                Overdue = overdueOrders
            },
            FuelCostByMonth = charts.FuelByMonth,
            MaintenanceCostByMonth = charts.MaintByMonth,
            VehicleStatusBreakdown = statusBreakdown,
            AccidentsByMonth = charts.AccidentsByMonth,
            FinesByMonth = charts.FinesByMonth,
        };
    }

    private async Task<int> ComputeKmThisMonthAsync(DateTime monthStart)
    {
        // Fetch only the minimal projection needed
        var logs = await _db.OdometerLogs.AsNoTracking()
            .Where(o => o.LogDate >= DateOnly.FromDateTime(monthStart.AddMonths(-1)))
            .Select(o => new { o.VehicleId, o.OdometerKm, o.LogDate })
            .ToListAsync();

        var monthStartDate = DateOnly.FromDateTime(monthStart);
        int total = 0;

        foreach (var group in logs.GroupBy(o => o.VehicleId))
        {
            var sorted = group.OrderBy(o => o.LogDate).ToList();
            var thisMonth = sorted.Where(o => o.LogDate >= monthStartDate).ToList();
            if (thisMonth.Count == 0) continue;

            var maxThisMonth = thisMonth.Max(o => o.OdometerKm);
            var beforeMonth = sorted.Where(o => o.LogDate < monthStartDate).ToList();
            var baseline = beforeMonth.Count > 0
                ? beforeMonth.Last().OdometerKm
                : thisMonth.Min(o => o.OdometerKm);

            total += Math.Max(0, maxThisMonth - baseline);
        }

        return total;
    }

    private async Task<List<ComplianceReminderDto>> BuildComplianceRemindersAsync(
        DateOnly today, DateOnly dueSoonThreshold)
    {
        var reminders = new List<ComplianceReminderDto>();

        // Insurance
        var insurance = await _db.InsurancePolicies.AsNoTracking()
            .Where(p => p.ValidTo <= dueSoonThreshold)
            .Select(p => new { p.VehicleId, p.Vehicle.RegistrationNumber, p.ValidTo })
            .ToListAsync();

        foreach (var p in insurance)
        {
            var daysLeft = p.ValidTo.DayNumber - today.DayNumber;
            reminders.Add(new ComplianceReminderDto
            {
                VehicleId = p.VehicleId,
                RegistrationNumber = p.RegistrationNumber,
                Type = "Insurance",
                ExpiresAt = p.ValidTo,
                DaysLeft = daysLeft,
                Status = daysLeft < 0 ? "expired" : "due_soon"
            });
        }

        // Registration
        var registration = await _db.RegistrationRecords.AsNoTracking()
            .Where(r => r.ValidTo <= dueSoonThreshold)
            .Select(r => new { r.VehicleId, r.Vehicle.RegistrationNumber, r.ValidTo })
            .ToListAsync();

        foreach (var r in registration)
        {
            var daysLeft = r.ValidTo.DayNumber - today.DayNumber;
            reminders.Add(new ComplianceReminderDto
            {
                VehicleId = r.VehicleId,
                RegistrationNumber = r.RegistrationNumber,
                Type = "Registration",
                ExpiresAt = r.ValidTo,
                DaysLeft = daysLeft,
                Status = daysLeft < 0 ? "expired" : "due_soon"
            });
        }

        // Inspection
        var inspections = await _db.Inspections.AsNoTracking()
            .Where(i => i.ValidTo != null && i.ValidTo <= dueSoonThreshold)
            .Select(i => new { i.VehicleId, i.Vehicle.RegistrationNumber, ValidTo = i.ValidTo!.Value })
            .ToListAsync();

        foreach (var i in inspections)
        {
            var daysLeft = i.ValidTo.DayNumber - today.DayNumber;
            reminders.Add(new ComplianceReminderDto
            {
                VehicleId = i.VehicleId,
                RegistrationNumber = i.RegistrationNumber,
                Type = "Inspection",
                ExpiresAt = i.ValidTo,
                DaysLeft = daysLeft,
                Status = daysLeft < 0 ? "expired" : "due_soon"
            });
        }

        // Return top 5 by daysLeft ascending (most urgent first)
        return reminders.OrderBy(r => r.DaysLeft).Take(5).ToList();
    }

    private async Task<AssignmentSummaryDto> BuildAssignmentSummaryAsync(int totalVehicles)
    {
        // A vehicle is "assigned" if it has an active assignment (AssignedTo is null = currently active)
        var assignedVehicleIds = await _db.VehicleAssignments.AsNoTracking()
            .Where(a => a.AssignedTo == null)
            .Select(a => a.VehicleId)
            .Distinct()
            .CountAsync();

        return new AssignmentSummaryDto
        {
            TotalVehicles = totalVehicles,
            Assigned = assignedVehicleIds,
            Unassigned = totalVehicles - assignedVehicleIds
        };
    }

    private async Task<(
        List<decimal> FuelByMonth,
        List<decimal> MaintByMonth,
        List<int> AccidentsByMonth,
        List<int> FinesByMonth)> BuildChartDataAsync(DateTime now, VehicleStatusBreakdownDto statusBreakdown)
    {
        // Month buckets: [month-5, month-4, ..., current month]
        var months = Enumerable.Range(0, 6)
            .Select(i => new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-(5 - i)))
            .ToList();

        var rangeStart = months[0];

        // Fuel cost by month
        var fuelRaw = await _db.FuelTransactions.AsNoTracking()
            .Where(t => t.PostedAt >= rangeStart)
            .Select(t => new { t.PostedAt, t.TotalCost })
            .ToListAsync();

        var fuelByMonth = months.Select(m =>
            fuelRaw.Where(t => t.PostedAt.Year == m.Year && t.PostedAt.Month == m.Month)
                   .Sum(t => t.TotalCost)).ToList();

        // Maintenance cost by month (closed orders, by closedAt)
        var maintRaw = await _db.MaintenanceOrders.AsNoTracking()
            .Where(o => o.Status == "closed" && o.ClosedAt >= rangeStart && o.TotalCost != null)
            .Select(o => new { o.ClosedAt, o.TotalCost })
            .ToListAsync();

        var maintByMonth = months.Select(m =>
            maintRaw.Where(o => o.ClosedAt!.Value.Year == m.Year && o.ClosedAt!.Value.Month == m.Month)
                    .Sum(o => o.TotalCost ?? 0m)).ToList();

        // Accidents by month
        var accidentsRaw = await _db.Accidents.AsNoTracking()
            .Where(a => a.OccurredAt >= rangeStart)
            .Select(a => a.OccurredAt)
            .ToListAsync();

        var accidentsByMonth = months.Select(m =>
            accidentsRaw.Count(d => d.Year == m.Year && d.Month == m.Month)).ToList();

        // Fines by month
        var finesRaw = await _db.Fines.AsNoTracking()
            .Where(f => f.OccurredAt >= rangeStart)
            .Select(f => f.OccurredAt)
            .ToListAsync();

        var finesByMonth = months.Select(m =>
            finesRaw.Count(d => d.Year == m.Year && d.Month == m.Month)).ToList();

        return (fuelByMonth, maintByMonth, accidentsByMonth, finesByMonth);
    }
}
