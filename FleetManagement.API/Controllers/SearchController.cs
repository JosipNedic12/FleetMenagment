using FleetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.API.Controllers;

public record SearchResultDto(string Type, int Id, string Title, string Subtitle, string Route);

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,FleetManager,ReadOnly")]
public class SearchController : ControllerBase
{
    private readonly FleetDbContext _db;

    public SearchController(FleetDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SearchResultDto>>> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<SearchResultDto>());

        var term = q.Trim().ToLower();

        var vehicles = await _db.Vehicles
            .Include(v => v.Make)
            .Include(v => v.Model)
            .Where(v => !v.IsDeleted && (
                v.RegistrationNumber.ToLower().Contains(term) ||
                v.Vin.ToLower().Contains(term) ||
                v.Make.Name.ToLower().Contains(term) ||
                v.Model.Name.ToLower().Contains(term)))
            .Take(10)
            .Select(v => new SearchResultDto(
                "Vehicle",
                v.VehicleId,
                v.RegistrationNumber,
                $"{v.Make.Name} {v.Model.Name} ({v.Year})",
                $"/vehicles/{v.VehicleId}"))
            .ToListAsync();

        var drivers = await _db.Drivers
            .Include(d => d.Employee)
            .Where(d => !d.IsDeleted && (
                (d.Employee.FirstName + " " + d.Employee.LastName).ToLower().Contains(term) ||
                d.LicenseNumber.ToLower().Contains(term)))
            .Take(10)
            .Select(d => new SearchResultDto(
                "Driver",
                d.DriverId,
                d.Employee.FirstName + " " + d.Employee.LastName,
                d.LicenseNumber,
                $"/drivers/{d.DriverId}"))
            .ToListAsync();

        var maintenance = await _db.MaintenanceOrders
            .Include(m => m.Vehicle)
                .ThenInclude(v => v.Make)
            .Include(m => m.Vehicle)
                .ThenInclude(v => v.Model)
            .Where(m => m.Description != null && m.Description.ToLower().Contains(term))
            .Take(10)
            .Select(m => new SearchResultDto(
                "Maintenance",
                m.OrderId,
                m.Description!,
                $"{m.Vehicle.RegistrationNumber} — {m.Status}",
                "/maintenance"))
            .ToListAsync();

        return Ok(vehicles.Concat(drivers).Concat(maintenance));
    }
}
