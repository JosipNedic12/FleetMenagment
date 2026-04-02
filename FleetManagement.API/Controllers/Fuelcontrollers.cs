using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Services;
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
    private readonly FuelCardService _service;
    private readonly ExportService _exportService;

    public FuelCardsController(FuelCardService service, ExportService exportService)
    {
        _service = service;
        _exportService = exportService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<PagedResponse<FuelCardDto>>> GetPaged(
        [FromQuery] PagedRequest<FuelCardFilter> request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelCardDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<FuelCardDto>> GetById(int id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelCardDto>>> GetByVehicle(int vehicleId)
        => Ok(await _service.GetByVehicleIdAsync(vehicleId));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<FuelCardDto>> Create(CreateFuelCardDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.FuelCardId }, result);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<FuelCardDto>> Update(int id, UpdateFuelCardDto dto)
        => Ok(await _service.UpdateAsync(id, dto));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] FuelCardFilter? filter)
    {
        var dtos = await _service.GetFilteredDtosAsync(filter ?? new FuelCardFilter(), search);
        var columns = FuelCardService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Fuel Cards Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"fuel_cards_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Fuel Cards");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"fuel_cards_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}

// -------------------------------------------------------
// FuelTransactionsController
// -------------------------------------------------------
[ApiController]
[Route("api/[controller]")]
public class FuelTransactionsController : ControllerBase
{
    private readonly FuelTransactionService _service;
    private readonly ExportService _exportService;

    public FuelTransactionsController(FuelTransactionService service, ExportService exportService)
    {
        _service = service;
        _exportService = exportService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<PagedResponse<FuelTransactionDto>>> GetPaged(
        [FromQuery] PagedRequest<FuelTransactionFilter> request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelTransactionDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<FuelTransactionDto>> GetById(int id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<FuelTransactionDto>>> GetByVehicle(int vehicleId)
        => Ok(await _service.GetByVehicleIdAsync(vehicleId));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<FuelTransactionDto>> Create(CreateFuelTransactionDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.TransactionId }, result);
    }

    [HttpPatch("{id}/suspicious")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> MarkSuspicious(int id, [FromBody] bool isSuspicious)
    {
        await _service.MarkSuspiciousAsync(id, isSuspicious);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] FuelTransactionFilter? filter)
    {
        var dtos = await _service.GetFilteredDtosAsync(filter ?? new FuelTransactionFilter(), search);
        var columns = FuelTransactionService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Fuel Transactions Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"fuel_transactions_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Fuel Transactions");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"fuel_transactions_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}
