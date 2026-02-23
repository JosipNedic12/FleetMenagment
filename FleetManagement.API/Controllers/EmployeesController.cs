using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeRepository _repo;
    public EmployeesController(IEmployeeRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetAll()
    {
        var employees = await _repo.GetAllAsync();
        return Ok(employees.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EmployeeDto>> GetById(int id)
    {
        var employee = await _repo.GetByIdAsync(id);
        if (employee == null) return NotFound();
        return Ok(MapToDto(employee));
    }

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create(CreateEmployeeDto dto)
    {
        if (await _repo.EmailExistsAsync(dto.Email))
            return Conflict("An employee with this email already exists.");

        var employee = new Employee
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Department = dto.Department,
            Email = dto.Email.ToLower().Trim(),
            Phone = dto.Phone
        };

        var created = await _repo.CreateAsync(employee);
        return CreatedAtAction(nameof(GetById), new { id = created.EmployeeId }, MapToDto(created));
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<EmployeeDto>> Update(int id, UpdateEmployeeDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new Employee
        {
            Department = dto.Department,
            Phone = dto.Phone,
            IsActive = dto.IsActive ?? true
        });

        if (updated == null) return NotFound();
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _repo.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    private static EmployeeDto MapToDto(Employee e) => new()
    {
        EmployeeId = e.EmployeeId,
        FirstName = e.FirstName,
        LastName = e.LastName,
        Department = e.Department,
        Email = e.Email,
        Phone = e.Phone,
        IsActive = e.IsActive,
        HasDriverProfile = e.Driver != null && !e.Driver.IsDeleted
    };
}