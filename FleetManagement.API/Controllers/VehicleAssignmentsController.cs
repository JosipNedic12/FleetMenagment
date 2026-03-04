using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehicleAssignmentsController : ControllerBase
{
    private readonly IVehicleAssignmentRepository _repo;
    public VehicleAssignmentsController(IVehicleAssignmentRepository repo) => _repo = repo;

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VehicleAssignmentDto>>> GetAll(
        [FromQuery] bool activeOnly = false)
    {
        var assignments = await _repo.GetAllAsync(activeOnly);
        return Ok(assignments.Select(MapToDto));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<VehicleAssignmentDto>> GetById(int id)
    {
        var assignment = await _repo.GetByIdAsync(id);
        if (assignment == null) return NotFound();
        return Ok(MapToDto(assignment));
    }

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VehicleAssignmentDto>>> GetByVehicle(int vehicleId)
    {
        var assignments = await _repo.GetByVehicleIdAsync(vehicleId);
        return Ok(assignments.Select(MapToDto));
    }

    [HttpGet("driver/{driverId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VehicleAssignmentDto>>> GetByDriver(int driverId)
    {
        var assignments = await _repo.GetByDriverIdAsync(driverId);
        return Ok(assignments.Select(MapToDto));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VehicleAssignmentDto>> Create(CreateVehicleAssignmentDto dto)
    {
        if (await _repo.VehicleHasActiveAssignmentAsync(dto.VehicleId))
            return Conflict("This vehicle already has an active assignment. End it before creating a new one.");

        var assignment = new VehicleAssignment
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            AssignedFrom = dto.AssignedFrom,
            AssignedTo = dto.AssignedTo,
            Notes = dto.Notes
        };

        var created = await _repo.CreateAsync(assignment);
        return CreatedAtAction(nameof(GetById), new { id = created.AssignmentId }, MapToDto(created));
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VehicleAssignmentDto>> Update(int id, UpdateVehicleAssignmentDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new UpdateAssignmentData(
            dto.AssignedTo,
            dto.Notes
        ));

        if (updated == null) return NotFound();
        return Ok(MapToDto(updated));
    }

    [HttpPost("{id}/end")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> End(int id)
    {
        var result = await _repo.EndAssignmentAsync(id);
        if (!result) return NotFound("Assignment not found or already ended.");
        return NoContent();
    }

    private static VehicleAssignmentDto MapToDto(VehicleAssignment a) => new()
    {
        AssignmentId = a.AssignmentId,
        VehicleId = a.VehicleId,
        RegistrationNumber = a.Vehicle?.RegistrationNumber ?? string.Empty,
        VehicleMake = a.Vehicle?.Make?.Name ?? string.Empty,
        VehicleModel = a.Vehicle?.Model?.Name ?? string.Empty,
        DriverId = a.DriverId,
        DriverFullName = a.Driver?.Employee != null
            ? $"{a.Driver.Employee.FirstName} {a.Driver.Employee.LastName}"
            : string.Empty,
        Department = a.Driver?.Employee?.Department,
        AssignedFrom = a.AssignedFrom,
        AssignedTo = a.AssignedTo,
        Notes = a.Notes
    };
}