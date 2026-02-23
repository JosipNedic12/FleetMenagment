namespace FleetManagement.Application.DTOs;

public class EmployeeDto
{
    public int EmployeeId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public string? Department { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    public bool HasDriverProfile { get; set; }
}

public class CreateEmployeeDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class UpdateEmployeeDto
{
    public string? Department { get; set; }
    public string? Phone { get; set; }
    public bool? IsActive { get; set; }
}