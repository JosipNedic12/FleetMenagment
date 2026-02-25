using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FineController : ControllerBase
{
    private readonly IFineRepository _repo;
    public FineController(IFineRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await _repo.GetAllAsync()).Select(ToDto));

    [HttpGet("unpaid")]
    public async Task<IActionResult> GetUnpaid() =>
        Ok((await _repo.GetUnpaidAsync()).Select(ToDto));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var f = await _repo.GetByIdAsync(id);
        return f == null ? NotFound() : Ok(ToDto(f));
    }

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok((await _repo.GetByVehicleIdAsync(vehicleId)).Select(ToDto));

    [HttpGet("driver/{driverId}")]
    public async Task<IActionResult> GetByDriver(int driverId) =>
        Ok((await _repo.GetByDriverIdAsync(driverId)).Select(ToDto));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateFineDto dto)
    {
        var entity = new Fine
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            OccurredAt = dto.OccurredAt,
            Amount = dto.Amount,
            Reason = dto.Reason,
            Notes = dto.Notes
        };
        var created = await _repo.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = created.FineId }, ToDto(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateFineDto dto)
    {
        var updated = new Fine
        {
            DriverId = dto.DriverId,
            OccurredAt = dto.OccurredAt ?? default,
            Amount = dto.Amount ?? 0,
            Reason = dto.Reason ?? string.Empty,
            Notes = dto.Notes
        };
        var result = await _repo.UpdateAsync(id, updated);
        return result == null ? NotFound() : Ok(ToDto(result));
    }

    // POST instead of PATCH — simpler, no JsonPatch dependency needed
    [HttpPost("{id}/pay")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> MarkPaid(int id, [FromBody] MarkFinePaidDto dto)
    {
        var result = await _repo.MarkPaidAsync(id, dto.PaidAt, dto.PaymentMethod);
        return result == null ? NotFound() : Ok(ToDto(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id) =>
        await _repo.DeleteAsync(id) ? NoContent() : NotFound();

    private static FineDto ToDto(Fine f) => new()
    {
        FineId = f.FineId,
        VehicleId = f.VehicleId,
        RegistrationNumber = f.Vehicle?.RegistrationNumber ?? string.Empty,
        DriverId = f.DriverId,
        DriverName = f.Driver?.Employee != null
            ? $"{f.Driver.Employee.FirstName} {f.Driver.Employee.LastName}"
            : null,
        OccurredAt = f.OccurredAt,
        Amount = f.Amount,
        Reason = f.Reason,
        PaidAt = f.PaidAt,
        PaymentMethod = f.PaymentMethod,
        IsPaid = f.PaidAt.HasValue,
        Notes = f.Notes
    };
}