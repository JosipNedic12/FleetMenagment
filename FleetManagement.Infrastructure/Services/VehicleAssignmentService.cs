using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class VehicleAssignmentService : IVehicleAssignmentService
{
    private readonly IVehicleAssignmentRepository _repo;
    private readonly ILogger<VehicleAssignmentService> _logger;

    public VehicleAssignmentService(IVehicleAssignmentRepository repo, ILogger<VehicleAssignmentService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<IEnumerable<VehicleAssignmentDto>> GetAllAsync(bool activeOnly = false)
    {
        var assignments = await _repo.GetAllAsync(activeOnly);
        return assignments.Select(MapToDto);
    }

    public async Task<VehicleAssignmentDto?> GetByIdAsync(int id)
    {
        var assignment = await _repo.GetByIdAsync(id);
        if (assignment == null) throw new NotFoundException($"Assignment with id {id} was not found.");
        return MapToDto(assignment);
    }

    public async Task<IEnumerable<VehicleAssignmentDto>> GetByVehicleIdAsync(int vehicleId)
    {
        var assignments = await _repo.GetByVehicleIdAsync(vehicleId);
        return assignments.Select(MapToDto);
    }

    public async Task<IEnumerable<VehicleAssignmentDto>> GetByDriverIdAsync(int driverId)
    {
        var assignments = await _repo.GetByDriverIdAsync(driverId);
        return assignments.Select(MapToDto);
    }

    public async Task<VehicleAssignmentDto> CreateAsync(CreateVehicleAssignmentDto dto)
    {
        if (await _repo.VehicleHasActiveAssignmentAsync(dto.VehicleId))
        {
            _logger.LogWarning("Assignment conflict: vehicle {VehicleId} already has an active assignment", dto.VehicleId);
            throw new ConflictException("This vehicle already has an active assignment. End it before creating a new one.");
        }

        var assignment = new VehicleAssignment
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            AssignedFrom = dto.AssignedFrom,
            AssignedTo = dto.AssignedTo,
            Notes = dto.Notes
        };

        var created = await _repo.CreateAsync(assignment);

        _logger.LogInformation("Assignment {AssignmentId} created: vehicle {VehicleId} assigned to driver {DriverId}", created.AssignmentId, created.VehicleId, created.DriverId);

        return MapToDto(created);
    }

    public async Task<VehicleAssignmentDto?> UpdateAsync(int id, UpdateVehicleAssignmentDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new UpdateAssignmentData(
            dto.AssignedTo,
            dto.Notes
        ));

        if (updated == null) throw new NotFoundException($"Assignment with id {id} was not found.");
        return MapToDto(updated);
    }

    public async Task<bool> EndAssignmentAsync(int id)
    {
        var result = await _repo.EndAssignmentAsync(id);
        if (!result) throw new NotFoundException("Assignment not found or already ended.");

        _logger.LogInformation("Assignment {AssignmentId} ended", id);

        return true;
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
