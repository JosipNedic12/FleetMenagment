using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class VehicleService : IVehicleService
{
    private readonly IVehicleRepository _repo;
    private readonly ILogger<VehicleService> _logger;

    public VehicleService(IVehicleRepository repo, ILogger<VehicleService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<IEnumerable<VehicleDto>> GetAllAsync()
    {
        var vehicles = await _repo.GetAllAsync();
        return vehicles.Select(MapToDto);
    }

    public async Task<VehicleDto?> GetByIdAsync(int id)
    {
        var vehicle = await _repo.GetByIdAsync(id);
        if (vehicle == null) throw new NotFoundException($"Vehicle with id {id} was not found.");
        return MapToDto(vehicle);
    }

    public async Task<VehicleDto> CreateAsync(CreateVehicleDto dto)
    {
        if (await _repo.ExistsAsync(dto.RegistrationNumber, dto.Vin))
        {
            _logger.LogWarning("Duplicate vehicle check hit for RegistrationNumber {RegistrationNumber} or VIN {Vin}", dto.RegistrationNumber, dto.Vin);
            throw new ConflictException("A vehicle with this registration number or VIN already exists.");
        }

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

        _logger.LogInformation("Vehicle {RegNumber} created (VehicleId: {Id})", created.RegistrationNumber, created.VehicleId);

        return MapToDto(created);
    }

    public async Task<VehicleDto?> UpdateAsync(int id, UpdateVehicleDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new Vehicle
        {
            Color = dto.Color,
            Status = dto.Status ?? "active",
            Notes = dto.Notes
        });

        if (updated == null) throw new NotFoundException($"Vehicle with id {id} was not found.");

        _logger.LogInformation("Vehicle {Id} updated", id);

        return MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) throw new NotFoundException($"Vehicle with id {id} was not found.");
        return true;
    }

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
