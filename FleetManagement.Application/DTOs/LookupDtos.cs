namespace FleetManagement.Application.DTOs;

public class MakeDto
{
    public int MakeId { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class ModelDto
{
    public int ModelId { get; set; }
    public int MakeId { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class VehicleCategoryDto
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class FuelTypeDto
{
    public int FuelTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool IsElectric { get; set; }
}

public class LicenseCategoryDto
{
    public int LicenseCategoryId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
}