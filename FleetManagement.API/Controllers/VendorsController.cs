using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly IVendorRepository _repo;
    public VendorsController(IVendorRepository repo) => _repo = repo;

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VendorDto>>> GetAll()
    {
        var vendors = await _repo.GetAllAsync();
        return Ok(vendors.Select(MapToDto));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<VendorDto>> GetById(int id)
    {
        var vendor = await _repo.GetByIdAsync(id);
        if (vendor == null) return NotFound();
        return Ok(MapToDto(vendor));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VendorDto>> Create(CreateVendorDto dto)
    {
        var vendor = new Vendor
        {
            Name = dto.Name.Trim(),
            ContactPerson = dto.ContactPerson,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address
        };

        var created = await _repo.CreateAsync(vendor);
        return CreatedAtAction(nameof(GetById), new { id = created.VendorId }, MapToDto(created));
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VendorDto>> Update(int id, UpdateVendorDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new Vendor
        {
            ContactPerson = dto.ContactPerson,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            IsActive = dto.IsActive ?? true
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

    private static VendorDto MapToDto(Vendor v) => new()
    {
        VendorId = v.VendorId,
        Name = v.Name,
        ContactPerson = v.ContactPerson,
        Phone = v.Phone,
        Email = v.Email,
        Address = v.Address,
        IsActive = v.IsActive
    };
}