using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccidentController : ControllerBase
{
    private readonly IAccidentRepository _repo;
    public AccidentController(IAccidentRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await _repo.GetAllAsync()).Select(ToDto));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var a = await _repo.GetByIdAsync(id);
        return a == null ? NotFound() : Ok(ToDto(a));
    }

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok((await _repo.GetByVehicleIdAsync(vehicleId)).Select(ToDto));

    [HttpGet("driver/{driverId}")]
    public async Task<IActionResult> GetByDriver(int driverId) =>
        Ok((await _repo.GetByDriverIdAsync(driverId)).Select(ToDto));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateAccidentDto dto)
    {
        var validSeverities = new[] { "minor", "major", "total" };
        if (!validSeverities.Contains(dto.Severity))
            return BadRequest("severity must be: minor | major | total");

        var entity = new Accident
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            OccurredAt = dto.OccurredAt,
            Severity = dto.Severity,
            Description = dto.Description,
            DamageEstimate = dto.DamageEstimate,
            PoliceReport = dto.PoliceReport,
            Notes = dto.Notes
        };
        var created = await _repo.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = created.AccidentId }, ToDto(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAccidentDto dto)
    {
        if (dto.Severity != null && !new[] { "minor", "major", "total" }.Contains(dto.Severity))
            return BadRequest("severity must be: minor | major | total");

        var updated = new Accident
        {
            DriverId = dto.DriverId,
            OccurredAt = dto.OccurredAt ?? default,
            Severity = dto.Severity ?? string.Empty,
            Description = dto.Description ?? string.Empty,
            DamageEstimate = dto.DamageEstimate,
            PoliceReport = dto.PoliceReport,
            Notes = dto.Notes
        };
        var result = await _repo.UpdateAsync(id, updated);
        return result == null ? NotFound() : Ok(ToDto(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id) =>
        await _repo.DeleteAsync(id) ? NoContent() : NotFound();

    private static AccidentDto ToDto(Accident a) => new()
    {
        AccidentId = a.AccidentId,
        VehicleId = a.VehicleId,
        RegistrationNumber = a.Vehicle?.RegistrationNumber ?? string.Empty,
        DriverId = a.DriverId,
        DriverName = a.Driver?.Employee != null
            ? $"{a.Driver.Employee.FirstName} {a.Driver.Employee.LastName}" : null,
        OccurredAt = a.OccurredAt,
        Severity = a.Severity,
        Description = a.Description,
        DamageEstimate = a.DamageEstimate,
        PoliceReport = a.PoliceReport,
        Notes = a.Notes
    };
}