using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OdometerLogsController : ControllerBase
{
    private readonly IOdometerLogRepository _repo;
    public OdometerLogsController(IOdometerLogRepository repo) => _repo = repo;

    // GET api/v1/odometerlogs/vehicle/5
    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<OdometerLogDto>>> GetByVehicle(int vehicleId)
    {
        var logs = await _repo.GetByVehicleIdAsync(vehicleId);
        return Ok(logs.Select(MapToDto));
    }

    // GET api/v1/odometerlogs/5
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<OdometerLogDto>> GetById(int id)
    {
        var log = await _repo.GetByIdAsync(id);
        if (log == null) return NotFound();
        return Ok(MapToDto(log));
    }

    // POST api/v1/odometerlogs
    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<OdometerLogDto>> Create(CreateOdometerLogDto dto)
    {
        // Validate new reading is not lower than current odometer
        var latest = await _repo.GetLatestOdometerAsync(dto.VehicleId);
        if (latest.HasValue && dto.OdometerKm < latest.Value)
            return BadRequest($"Odometer reading ({dto.OdometerKm} km) cannot be less than the current reading ({latest.Value} km).");

        var log = new OdometerLog
        {
            VehicleId = dto.VehicleId,
            OdometerKm = dto.OdometerKm,
            LogDate = dto.LogDate,
            Notes = dto.Notes
        };

        var created = await _repo.CreateAsync(log);
        return CreatedAtAction(nameof(GetById), new { id = created.LogId }, MapToDto(created));
    }

    // DELETE api/v1/odometerlogs/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    private static OdometerLogDto MapToDto(OdometerLog l) => new()
    {
        LogId = l.LogId,
        VehicleId = l.VehicleId,
        RegistrationNumber = l.Vehicle.RegistrationNumber,
        OdometerKm = l.OdometerKm,
        LogDate = l.LogDate,
        Notes = l.Notes,
        CreatedAt = l.CreatedAt
    };
}