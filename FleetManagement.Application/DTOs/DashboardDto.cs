namespace FleetManagement.Application.DTOs;

public class DashboardDto
{
    // ── Stat counts ────────────────────────────────────────────────
    public int ActiveVehicles { get; set; }
    public int OpenMaintenanceOrders { get; set; }
    public int KmThisMonth { get; set; }
    public int UnpaidFines { get; set; }
    public int ExpiredInsurance { get; set; }
    public int AccidentCount { get; set; }
    public decimal FuelCostThisMonth { get; set; }
    public int InspectionsDue { get; set; }

    // ── Compliance reminders ───────────────────────────────────────
    public List<ComplianceReminderDto> ComplianceReminders { get; set; } = [];

    // ── Assignment summary ─────────────────────────────────────────
    public AssignmentSummaryDto AssignmentSummary { get; set; } = new();

    // ── Work order summary ─────────────────────────────────────────
    public WorkOrderSummaryDto WorkOrderSummary { get; set; } = new();

    // ── Chart data ─────────────────────────────────────────────────
    public List<decimal> FuelCostByMonth { get; set; } = [];
    public List<decimal> MaintenanceCostByMonth { get; set; } = [];
    public VehicleStatusBreakdownDto VehicleStatusBreakdown { get; set; } = new();
    public List<int> AccidentsByMonth { get; set; } = [];
    public List<int> FinesByMonth { get; set; } = [];
}

public class ComplianceReminderDto
{
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "Insurance" | "Registration" | "Inspection"
    public DateOnly ExpiresAt { get; set; }
    public int DaysLeft { get; set; }
    public string Status { get; set; } = string.Empty; // "expired" | "due_soon" | "ok"
}

public class AssignmentSummaryDto
{
    public int Assigned { get; set; }
    public int Unassigned { get; set; }
    public int TotalVehicles { get; set; }
}

public class WorkOrderSummaryDto
{
    public int Open { get; set; }
    public int InProgress { get; set; }
    public int Completed { get; set; }
    public int Overdue { get; set; }
}

public class VehicleStatusBreakdownDto
{
    public int Active { get; set; }
    public int InService { get; set; }
    public int Retired { get; set; }
    public int Sold { get; set; }
}
