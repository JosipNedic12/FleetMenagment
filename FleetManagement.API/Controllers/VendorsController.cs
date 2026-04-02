using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly VendorService _svc;
    private readonly ExportService _exportService;

    public VendorsController(VendorService svc, ExportService exportService)
    {
        _svc = svc;
        _exportService = exportService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<IActionResult> GetPaged([FromQuery] PagedRequest<VendorFilter> request) =>
        Ok(await _svc.GetPagedAsync(request));

    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<IActionResult> GetAll() =>
        Ok(await _svc.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<IActionResult> GetById(int id) =>
        Ok(await _svc.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create(CreateVendorDto dto)
    {
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.VendorId }, created);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, UpdateVendorDto dto) =>
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
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] VendorFilter? filter)
    {
        var dtos = await _svc.GetFilteredDtosAsync(filter ?? new VendorFilter(), search);
        var columns = VendorService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Vendors Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"vendors_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Vendors");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"vendors_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}
