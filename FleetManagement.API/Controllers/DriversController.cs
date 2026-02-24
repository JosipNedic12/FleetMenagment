using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class DriversController : ControllerBase
{
    private readonly IDriverRepository _repo;
    public DriversController(IDriverRepository repo) => _repo = repo;

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<DriverDto>>> GetAll()
    {
        var drivers = await _repo.GetAllAsync();
        return Ok(drivers.Select(MapToDto));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<DriverDto>> GetById(int id)
    {
        var driver = await _repo.GetByIdAsync(id);
        if (driver == null) return NotFound();
        return Ok(MapToDto(driver));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<DriverDto>> Create(CreateDriverDto dto)
    {
        if (await _repo.LicenseNumberExistsAsync(dto.LicenseNumber))
            return Conflict("A driver with this license number already exists.");

        var driver = new Driver
        {
            EmployeeId = dto.EmployeeId,
            LicenseNumber = dto.LicenseNumber.Trim(),
            LicenseExpiry = dto.LicenseExpiry,
            Notes = dto.Notes
        };

        var created = await _repo.CreateAsync(driver, dto.LicenseCategoryIds);
        return CreatedAtAction(nameof(GetById), new { id = created.DriverId }, MapToDto(created));
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<DriverDto>> Update(int id, UpdateDriverDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new Driver
        {
            LicenseNumber = dto.LicenseNumber ?? string.Empty,
            LicenseExpiry = dto.LicenseExpiry ?? default,
            Notes = dto.Notes
        }, dto.LicenseCategoryIds);

        if (updated == null) return NotFound();
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    private static DriverDto MapToDto(Driver d) => new()
    {
        DriverId = d.DriverId,
        EmployeeId = d.EmployeeId,
        FullName = $"{d.Employee.FirstName} {d.Employee.LastName}",
        Department = d.Employee.Department,
        LicenseNumber = d.LicenseNumber,
        LicenseExpiry = d.LicenseExpiry,
        LicenseCategories = d.LicenseCategories
                             .Select(lc => lc.LicenseCategory.Code)
                             .ToList(),
        Notes = d.Notes
    };
}