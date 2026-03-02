using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api")]
public class LookupsController : ControllerBase
{
    private readonly FleetDbContext _context;
    public LookupsController(FleetDbContext context) => _context = context;

    // GET api/v1/makes
    [HttpGet("makes")]
    public async Task<ActionResult<IEnumerable<MakeDto>>> GetMakes()
    {
        var makes = await _context.VehicleMakes
            .Where(m => m.IsActive)
            .OrderBy(m => m.Name)
            .Select(m => new MakeDto { MakeId = m.MakeId, Name = m.Name })
            .ToListAsync();
        return Ok(makes);
    }

    // GET api/v1/makes/1/models
    [HttpGet("makes/{makeId}/models")]
    public async Task<ActionResult<IEnumerable<ModelDto>>> GetModelsByMake(int makeId)
    {
        var models = await _context.VehicleModels
            .Where(m => m.MakeId == makeId && m.IsActive)
            .OrderBy(m => m.Name)
            .Select(m => new ModelDto { ModelId = m.ModelId, MakeId = m.MakeId, Name = m.Name })
            .ToListAsync();
        return Ok(models);
    }

    // GET api/v1/vehicle-categories
    [HttpGet("vehicle-categories")]
    public async Task<ActionResult<IEnumerable<VehicleCategoryDto>>> GetVehicleCategories()
    {
        var categories = await _context.VehicleCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new VehicleCategoryDto
            {
                CategoryId = c.CategoryId,
                Name = c.Name,
                Description = c.Description
            })
            .ToListAsync();
        return Ok(categories);
    }

    // GET api/v1/fuel-types
    [HttpGet("fuel-types")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<FuelTypeDto>>> GetFuelTypes()
    {
        var fuelTypes = await _context.FuelTypes
            .Where(f => f.IsActive)
            .OrderBy(f => f.Label)
            .Select(f => new FuelTypeDto
            {
                FuelTypeId = f.FuelTypeId,
                Code = f.Code,
                Label = f.Label,
                IsElectric = f.IsElectric
            })
            .ToListAsync();
        return Ok(fuelTypes);
    }

    // GET api/v1/license-categories
    [HttpGet("license-categories")]
    public async Task<ActionResult<IEnumerable<LicenseCategoryDto>>> GetLicenseCategories()
    {
        var categories = await _context.LicenseCategories
            .Where(lc => lc.IsActive)
            .OrderBy(lc => lc.Code)
            .Select(lc => new LicenseCategoryDto
            {
                LicenseCategoryId = lc.LicenseCategoryId,
                Code = lc.Code,
                Description = lc.Description
            })
            .ToListAsync();
        return Ok(categories);
    }

    [HttpGet("maintenance-types")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<MaintenanceTypeDto>>> GetMaintenanceTypes()
    {
        var types = await _context.MaintenanceTypes
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .Select(t => new MaintenanceTypeDto
            {
                MaintenanceTypeId = t.MaintenanceTypeId,
                Name = t.Name,
                Description = t.Description
            })
            .ToListAsync();
        return Ok(types);
    }
}