using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class VehiclesController : ControllerBase
{
    private readonly IVehicleRepository _repo;

    public VehiclesController(IVehicleRepository repo)
    {
        _repo = repo;
    }

    // GET api/v1/vehicles
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VehicleDto>>> GetAll()
    {
        var vehicles = await _repo.GetAllAsync();
        return Ok(vehicles.Select(MapToDto));
    }

    // GET api/v1/vehicles/5
    [HttpGet("{id}")]
    public async Task<ActionResult<VehicleDto>> GetById(int id)
    {
        var vehicle = await _repo.GetByIdAsync(id);
        if (vehicle == null) return NotFound();
        return Ok(MapToDto(vehicle));
    }

    // POST api/v1/vehicles
    [HttpPost]
    public async Task<ActionResult<VehicleDto>> Create(CreateVehicleDto dto)
    {
        // Check for duplicate registration or VIN
        if (await _repo.ExistsAsync(dto.RegistrationNumber, dto.Vin))
            return Conflict("A vehicle with this registration number or VIN already exists.");

        var vehicle = new Vehicle
        {
            RegistrationNumber = dto.RegistrationNumber.ToUpper().Trim(),
            Vin = dto.Vin.ToUpper().Trim(),
            MakeId = dto.MakeId,
            ModelId = dto.ModelId,
            CategoryId = dto.CategoryId,
            FuelTypeId = dto.FuelTypeId,
            Year = dto.Year,
            Color = dto.Color,
            Notes = dto.Notes,
            Status = "active"
        };

        var created = await _repo.CreateAsync(vehicle);

        // 201 Created with Location header pointing to the new resource
        return CreatedAtAction(nameof(GetById), new { id = created.VehicleId }, MapToDto(created));
    }

    // PATCH api/v1/vehicles/5
    [HttpPatch("{id}")]
    public async Task<ActionResult<VehicleDto>> Update(int id, UpdateVehicleDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new Vehicle
        {
            Color = dto.Color,
            Status = dto.Status ?? "active",
            Notes = dto.Notes
        });

        if (updated == null) return NotFound();
        return Ok(MapToDto(updated));
    }

    // DELETE api/v1/vehicles/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();  // 204
    }

    // Map entity → DTO (keep DB model out of API responses)
    private static VehicleDto MapToDto(Vehicle v) => new()
    {
        VehicleId = v.VehicleId,
        RegistrationNumber = v.RegistrationNumber,
        Vin = v.Vin,
        Make = v.Make?.Name ?? string.Empty,
        Model = v.Model?.Name ?? string.Empty,
        Category = v.Category?.Name ?? string.Empty,
        FuelType = v.FuelType?.Label ?? string.Empty,
        Year = v.Year,
        Color = v.Color,
        Status = v.Status,
        CurrentOdometerKm = v.CurrentOdometerKm,
        Notes = v.Notes
    };
}