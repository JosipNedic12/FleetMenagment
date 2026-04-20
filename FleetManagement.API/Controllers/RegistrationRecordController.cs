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
public class RegistrationRecordController : ControllerBase
{
    private readonly RegistrationRecordService _svc;
    private readonly ExportService _exportService;

    public RegistrationRecordController(RegistrationRecordService svc, ExportService exportService)
    {
        _svc = svc;
        _exportService = exportService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] PagedRequest<RegistrationFilter> request) =>
        Ok(await _svc.GetPagedAsync(request));

    [HttpGet("all")]
    public async Task<IActionResult> GetAll() =>
        Ok(await _svc.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id) =>
        Ok(await _svc.GetByIdAsync(id));

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok(await _svc.GetByVehicleIdAsync(vehicleId));

    [HttpGet("vehicle/{vehicleId}/current")]
    public async Task<IActionResult> GetCurrent(int vehicleId) =>
        Ok(await _svc.GetCurrentByVehicleIdAsync(vehicleId));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateRegistrationRecordDto dto)
    {
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.RegistrationId }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRegistrationRecordDto dto) =>
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
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] RegistrationFilter? filter, [FromQuery] string lang = "hr")
    {
        var dtos = await _svc.GetFilteredDtosAsync(filter ?? new RegistrationFilter(), search);
        var columns = RegistrationRecordService.GetExportColumns(lang);
        if (format?.ToLower() == "pdf")
        {
            var title = lang == "hr" ? "Izvještaj registracija" : "Registration Records Report";
            var bytes = _exportService.ExportToPdf(dtos, columns, title, $"{dtos.Count} {(lang == "hr" ? "zapisa" : "records")} · {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"{(lang == "hr" ? "registracije" : "registration")}_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, lang == "hr" ? "Registracije" : "Registration Records");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{(lang == "hr" ? "registracije" : "registration")}_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}
