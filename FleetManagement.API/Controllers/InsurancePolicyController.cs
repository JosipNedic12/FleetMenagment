using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InsurancePolicyController : ControllerBase
{
    private readonly IInsurancePolicyRepository _repo;
    public InsurancePolicyController(IInsurancePolicyRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await _repo.GetAllAsync()).Select(ToDto));

    [HttpGet("active")]
    public async Task<IActionResult> GetActive() =>
        Ok((await _repo.GetActiveAsync()).Select(ToDto));

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok((await _repo.GetByVehicleIdAsync(vehicleId)).Select(ToDto));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await _repo.GetByIdAsync(id);
        return p == null ? NotFound() : Ok(ToDto(p));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateInsurancePolicyDto dto)
    {
        var entity = new InsurancePolicy
        {
            VehicleId = dto.VehicleId,
            PolicyNumber = dto.PolicyNumber,
            Insurer = dto.Insurer,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            Premium = dto.Premium,
            CoverageNotes = dto.CoverageNotes
        };
        var created = await _repo.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = created.PolicyId }, ToDto(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInsurancePolicyDto dto)
    {
        var updated = new InsurancePolicy
        {
            Insurer = dto.Insurer ?? string.Empty,
            ValidFrom = dto.ValidFrom ?? default,
            ValidTo = dto.ValidTo ?? default,
            Premium = dto.Premium ?? 0,
            CoverageNotes = dto.CoverageNotes
        };
        var result = await _repo.UpdateAsync(id, updated);
        return result == null ? NotFound() : Ok(ToDto(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id) =>
        await _repo.DeleteAsync(id) ? NoContent() : NotFound();

    // Map to DTO inline (or use AutoMapper if you have profiles set up)
    private static InsurancePolicyDto ToDto(InsurancePolicy p) => new()
    {
        PolicyId = p.PolicyId,
        VehicleId = p.VehicleId,
        RegistrationNumber = p.Vehicle?.RegistrationNumber ?? string.Empty,
        PolicyNumber = p.PolicyNumber,
        Insurer = p.Insurer,
        ValidFrom = p.ValidFrom,
        ValidTo = p.ValidTo,
        Premium = p.Premium,
        CoverageNotes = p.CoverageNotes,
        IsActive = p.ValidTo >= DateOnly.FromDateTime(DateTime.UtcNow)
    };
}