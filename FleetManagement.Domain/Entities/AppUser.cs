namespace FleetManagement.Domain.Entities;

public class AppUser
{
    public int UserId { get; set; }
    public int EmployeeId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "ReadOnly"; // Admin | FleetManager | Driver | ReadOnly
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}