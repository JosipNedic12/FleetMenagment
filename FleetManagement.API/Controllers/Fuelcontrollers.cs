using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

// -------------------------------------------------------
// FuelCardsController
// -------------------------------------------------------
[ApiController]
[Route("api/[controller]")]
public class FuelCardsController : ControllerBase
{
    private readonly IFuelCardRepository _repo;
    public FuelCardsController(IFuelCardRepository repo) => _repo = repo;

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelCardDto>>> GetAll()
    {
        var cards = await _repo.GetAllAsync();
        return Ok(cards.Select(MapToDto));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<FuelCardDto>> GetById(int id)
    {
        var card = await _repo.GetByIdAsync(id);
        if (card == null) return NotFound();
        return Ok(MapToDto(card));
    }

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelCardDto>>> GetByVehicle(int vehicleId)
    {
        var cards = await _repo.GetByVehicleIdAsync(vehicleId);
        return Ok(cards.Select(MapToDto));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<FuelCardDto>> Create(CreateFuelCardDto dto)
    {
        var card = new FuelCard
        {
            CardNumber = dto.CardNumber.Trim(),
            Provider = dto.Provider,
            AssignedVehicleId = dto.AssignedVehicleId,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            Notes = dto.Notes
        };

        var created = await _repo.CreateAsync(card);
        return CreatedAtAction(nameof(GetById), new { id = created.FuelCardId }, MapToDto(created));
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<FuelCardDto>> Update(int id, UpdateFuelCardDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new FuelCard
        {
            Provider = dto.Provider,
            AssignedVehicleId = dto.AssignedVehicleId,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            IsActive = dto.IsActive ?? true,
            Notes = dto.Notes
        });

        if (updated == null) return NotFound();
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    private static FuelCardDto MapToDto(FuelCard c) => new()
    {
        FuelCardId = c.FuelCardId,
        CardNumber = c.CardNumber,
        Provider = c.Provider,
        AssignedVehicleId = c.AssignedVehicleId,
        RegistrationNumber = c.AssignedVehicle?.RegistrationNumber,
        ValidFrom = c.ValidFrom,
        ValidTo = c.ValidTo,
        IsActive = c.IsActive,
        Notes = c.Notes
    };
}

// -------------------------------------------------------
// FuelTransactionsController
// -------------------------------------------------------
[ApiController]
[Route("api/[controller]")]
public class FuelTransactionsController : ControllerBase
{
    private readonly IFuelTransactionRepository _repo;
    public FuelTransactionsController(IFuelTransactionRepository repo) => _repo = repo;

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelTransactionDto>>> GetAll()
    {
        var transactions = await _repo.GetAllAsync();
        return Ok(transactions.Select(MapToDto));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<FuelTransactionDto>> GetById(int id)
    {
        var transaction = await _repo.GetByIdAsync(id);
        if (transaction == null) return NotFound();
        return Ok(MapToDto(transaction));
    }

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelTransactionDto>>> GetByVehicle(int vehicleId)
    {
        var transactions = await _repo.GetByVehicleIdAsync(vehicleId);
        return Ok(transactions.Select(MapToDto));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<FuelTransactionDto>> Create(CreateFuelTransactionDto dto)
    {
        var transaction = new FuelTransaction
        {
            VehicleId = dto.VehicleId,
            FuelCardId = dto.FuelCardId,
            FuelTypeId = dto.FuelTypeId,
            PostedAt = dto.PostedAt,
            OdometerKm = dto.OdometerKm,
            Liters = dto.Liters,
            PricePerLiter = dto.PricePerLiter,
            EnergyKwh = dto.EnergyKwh,
            PricePerKwh = dto.PricePerKwh,
            TotalCost = dto.TotalCost,
            StationName = dto.StationName,
            ReceiptNumber = dto.ReceiptNumber,
            Notes = dto.Notes
        };

        var created = await _repo.CreateAsync(transaction);
        return CreatedAtAction(nameof(GetById), new { id = created.TransactionId }, MapToDto(created));
    }

    // PATCH api/v1/fueltransactions/5/suspicious
    [HttpPatch("{id}/suspicious")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> MarkSuspicious(int id, [FromBody] bool isSuspicious)
    {
        var result = await _repo.MarkSuspiciousAsync(id, isSuspicious);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    private static FuelTransactionDto MapToDto(FuelTransaction t) => new()
    {
        TransactionId = t.TransactionId,
        VehicleId = t.VehicleId,
        RegistrationNumber = t.Vehicle.RegistrationNumber,
        FuelCardId = t.FuelCardId,
        CardNumber = t.FuelCard?.CardNumber,
        FuelTypeId = t.FuelTypeId,
        FuelTypeName = t.FuelType.Label,
        PostedAt = t.PostedAt,
        OdometerKm = t.OdometerKm,
        Liters = t.Liters,
        PricePerLiter = t.PricePerLiter,
        EnergyKwh = t.EnergyKwh,
        PricePerKwh = t.PricePerKwh,
        TotalCost = t.TotalCost,
        StationName = t.StationName,
        ReceiptNumber = t.ReceiptNumber,
        IsSuspicious = t.IsSuspicious,
        Notes = t.Notes
    };
}