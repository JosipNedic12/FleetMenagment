using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RegistrationRecordController : ControllerBase
{
    private readonly IRegistrationRecordRepository _repo;
    public RegistrationRecordController(IRegistrationRecordRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await _repo.GetAllAsync()).Select(ToDto));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var r = await _repo.GetByIdAsync(id);
        return r == null ? NotFound() : Ok(ToDto(r));
    }

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok((await _repo.GetByVehicleIdAsync(vehicleId)).Select(ToDto));

    [HttpGet("vehicle/{vehicleId}/current")]
    public async Task<IActionResult> GetCurrent(int vehicleId)
    {
        var r = await _repo.GetCurrentByVehicleIdAsync(vehicleId);
        return r == null ? NotFound() : Ok(ToDto(r));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateRegistrationRecordDto dto)
    {
        var entity = new RegistrationRecord
        {
            VehicleId = dto.VehicleId,
            RegistrationNumber = dto.RegistrationNumber,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            Fee = dto.Fee,
            Notes = dto.Notes
        };
        var created = await _repo.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = created.RegistrationId }, ToDto(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRegistrationRecordDto dto)
    {
        var updated = new RegistrationRecord
        {
            RegistrationNumber = dto.RegistrationNumber ?? string.Empty,
            ValidFrom = dto.ValidFrom ?? default,
            ValidTo = dto.ValidTo ?? default,
            Fee = dto.Fee,
            Notes = dto.Notes
        };
        var result = await _repo.UpdateAsync(id, updated);
        return result == null ? NotFound() : Ok(ToDto(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id) =>
        await _repo.DeleteAsync(id) ? NoContent() : NotFound();

    private static RegistrationRecordDto ToDto(RegistrationRecord r)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return new RegistrationRecordDto
        {
            RegistrationId = r.RegistrationId,
            VehicleId = r.VehicleId,
            VehicleRegistrationNumber = r.Vehicle?.RegistrationNumber ?? string.Empty,
            RegistrationNumber = r.RegistrationNumber,
            ValidFrom = r.ValidFrom,
            ValidTo = r.ValidTo,
            Fee = r.Fee,
            Notes = r.Notes,
            IsActive = r.ValidFrom <= today && r.ValidTo >= today
        };
    }
}