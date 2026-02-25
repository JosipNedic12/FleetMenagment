namespace FleetManagement.Domain.Entities;

public class Fine
{
    public int FineId { get; set; }
    public int VehicleId { get; set; }
    public int? DriverId { get; set; }
    public DateTime OccurredAt { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }
    public Guid? ModifiedBy { get; set; }

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
    public Driver? Driver { get; set; }
}