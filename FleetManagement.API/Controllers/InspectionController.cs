using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InspectionController : ControllerBase
{
    private readonly IInspectionRepository _repo;
    public InspectionController(IInspectionRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await _repo.GetAllAsync()).Select(ToDto));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var i = await _repo.GetByIdAsync(id);
        return i == null ? NotFound() : Ok(ToDto(i));
    }

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok((await _repo.GetByVehicleIdAsync(vehicleId)).Select(ToDto));

    [HttpGet("vehicle/{vehicleId}/latest")]
    public async Task<IActionResult> GetLatest(int vehicleId)
    {
        var i = await _repo.GetLatestByVehicleIdAsync(vehicleId);
        return i == null ? NotFound() : Ok(ToDto(i));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateInspectionDto dto)
    {
        var validResults = new[] { "passed", "failed", "conditional" };
        if (!validResults.Contains(dto.Result))
            return BadRequest("result must be: passed | failed | conditional");

        // Business rule #19: failed requires notes
        if (dto.Result == "failed" && string.IsNullOrWhiteSpace(dto.Notes))
            return BadRequest("Notes are required when result is 'failed'");

        var entity = new Inspection
        {
            VehicleId = dto.VehicleId,
            InspectedAt = dto.InspectedAt,
            ValidTo = dto.ValidTo,
            Result = dto.Result,
            Notes = dto.Notes,
            OdometerKm = dto.OdometerKm
        };
        var created = await _repo.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = created.InspectionId }, ToDto(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInspectionDto dto)
    {
        if (dto.Result != null && !new[] { "passed", "failed", "conditional" }.Contains(dto.Result))
            return BadRequest("result must be: passed | failed | conditional");

        if (dto.Result == "failed" && string.IsNullOrWhiteSpace(dto.Notes))
            return BadRequest("Notes are required when result is 'failed'");

        var updated = new Inspection
        {
            InspectedAt = dto.InspectedAt ?? default,
            ValidTo = dto.ValidTo,
            Result = dto.Result ?? string.Empty,
            Notes = dto.Notes,
            OdometerKm = dto.OdometerKm
        };
        var result = await _repo.UpdateAsync(id, updated);
        return result == null ? NotFound() : Ok(ToDto(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id) =>
        await _repo.DeleteAsync(id) ? NoContent() : NotFound();

    private static InspectionDto ToDto(Inspection i)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return new InspectionDto
        {
            InspectionId = i.InspectionId,
            VehicleId = i.VehicleId,
            RegistrationNumber = i.Vehicle?.RegistrationNumber ?? string.Empty,
            InspectedAt = i.InspectedAt,
            ValidTo = i.ValidTo,
            Result = i.Result,
            Notes = i.Notes,
            OdometerKm = i.OdometerKm,
            IsValid = i.ValidTo.HasValue && i.ValidTo.Value >= today
        };
    }
}