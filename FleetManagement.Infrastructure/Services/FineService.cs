using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class FineService : IFineService
{
    private readonly IFineRepository _repo;
    private readonly ILogger<FineService> _logger;

    public FineService(IFineRepository repo, ILogger<FineService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<IEnumerable<FineDto>> GetAllAsync()
    {
        var fines = await _repo.GetAllAsync();
        return fines.Select(MapToDto);
    }

    public async Task<IEnumerable<FineDto>> GetUnpaidAsync()
    {
        var fines = await _repo.GetUnpaidAsync();
        return fines.Select(MapToDto);
    }

    public async Task<FineDto?> GetByIdAsync(int id)
    {
        var fine = await _repo.GetByIdAsync(id);
        if (fine == null) throw new NotFoundException($"Fine with id {id} was not found.");
        return MapToDto(fine);
    }

    public async Task<IEnumerable<FineDto>> GetByVehicleIdAsync(int vehicleId)
    {
        var fines = await _repo.GetByVehicleIdAsync(vehicleId);
        return fines.Select(MapToDto);
    }

    public async Task<IEnumerable<FineDto>> GetByDriverIdAsync(int driverId)
    {
        var fines = await _repo.GetByDriverIdAsync(driverId);
        return fines.Select(MapToDto);
    }

    public async Task<FineDto> CreateAsync(CreateFineDto dto)
    {
        var fine = new Fine
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            OccurredAt = dto.OccurredAt,
            Amount = dto.Amount,
            Reason = dto.Reason,
            Notes = dto.Notes
        };

        var created = await _repo.CreateAsync(fine);
        return MapToDto(created);
    }

    public async Task<FineDto?> UpdateAsync(int id, UpdateFineDto dto)
    {
        var existing = await _repo.GetByIdAsync(id);
        if (existing == null) throw new NotFoundException($"Fine with id {id} was not found.");

        var updated = await _repo.UpdateAsync(id, new Fine
        {
            DriverId = dto.DriverId ?? existing.DriverId,
            OccurredAt = dto.OccurredAt ?? existing.OccurredAt,
            Amount = dto.Amount ?? existing.Amount,
            Reason = dto.Reason ?? existing.Reason,
            Notes = dto.Notes ?? existing.Notes
        });

        if (updated == null) throw new NotFoundException($"Fine with id {id} was not found.");
        return MapToDto(updated);
    }

    public async Task<FineDto?> MarkPaidAsync(int id, MarkFinePaidDto dto)
    {
        var updated = await _repo.MarkPaidAsync(id, dto.PaidAt, dto.PaymentMethod);
        if (updated == null) throw new NotFoundException($"Fine with id {id} was not found.");

        _logger.LogInformation("Fine {Id} paid via {Method}", id, dto.PaymentMethod);

        return MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) throw new NotFoundException($"Fine with id {id} was not found.");
        return true;
    }

    private static FineDto MapToDto(Fine f) => new()
    {
        FineId = f.FineId,
        VehicleId = f.VehicleId,
        RegistrationNumber = f.Vehicle?.RegistrationNumber ?? string.Empty,
        VehicleMake = f.Vehicle?.Make?.Name ?? string.Empty,
        VehicleModel = f.Vehicle?.Model?.Name ?? string.Empty,
        DriverId = f.DriverId,
        DriverName = f.Driver?.Employee != null
            ? $"{f.Driver.Employee.FirstName} {f.Driver.Employee.LastName}"
            : null,
        OccurredAt = f.OccurredAt,
        Amount = f.Amount,
        Reason = f.Reason,
        PaidAt = f.PaidAt,
        PaymentMethod = f.PaymentMethod,
        IsPaid = f.PaidAt != null,
        Notes = f.Notes
    };
}
