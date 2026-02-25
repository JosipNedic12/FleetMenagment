namespace FleetManagement.Application.DTOs;

public class FineDto
{
    public int FineId { get; set; }
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public int? DriverId { get; set; }
    public string? DriverName { get; set; } // FirstName + LastName from Employee
    public DateTime OccurredAt { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public string? PaymentMethod { get; set; }
    public bool IsPaid { get; set; } // computed: PaidAt != null
    public string? Notes { get; set; }
}

public class CreateFineDto
{
    public int VehicleId { get; set; }
    public int? DriverId { get; set; }
    public DateTime OccurredAt { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class UpdateFineDto
{
    public int? DriverId { get; set; }
    public DateTime? OccurredAt { get; set; }
    public decimal? Amount { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}

public class MarkFinePaidDto
{
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public string? PaymentMethod { get; set; }
}