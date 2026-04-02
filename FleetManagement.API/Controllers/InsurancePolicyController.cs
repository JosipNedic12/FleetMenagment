using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InsurancePolicyController : ControllerBase
{
    private readonly InsurancePolicyService _svc;
    private readonly ExportService _exportService;

    public InsurancePolicyController(InsurancePolicyService svc, ExportService exportService)
    {
        _svc = svc;
        _exportService = exportService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] PagedRequest<InsuranceFilter> request) =>
        Ok(await _svc.GetPagedAsync(request));

    [HttpGet("all")]
    public async Task<IActionResult> GetAll() =>
        Ok(await _svc.GetAllAsync());

    [HttpGet("active")]
    public async Task<IActionResult> GetActive() =>
        Ok(await _svc.GetActiveAsync());

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok(await _svc.GetByVehicleIdAsync(vehicleId));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id) =>
        Ok(await _svc.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateInsurancePolicyDto dto)
    {
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.PolicyId }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInsurancePolicyDto dto) =>
        Ok(await _svc.UpdateAsync(id, dto));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] InsuranceFilter? filter)
    {
        var dtos = await _svc.GetFilteredDtosAsync(filter ?? new InsuranceFilter(), search);
        var columns = InsurancePolicyService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Insurance Policies Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"insurance_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Insurance Policies");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"insurance_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}
