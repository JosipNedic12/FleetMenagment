using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class EmployeeRepository : IEmployeeRepository
{
    private readonly FleetDbContext _context;
    public EmployeeRepository(FleetDbContext context) => _context = context;

    public async Task<IEnumerable<Employee>> GetAllAsync() =>
        await _context.Employees
            .Include(e => e.Driver)
            .Include(e => e.AppUser)
            .Where(e => !e.IsDeleted)
            .OrderBy(e => e.LastName)
            .ToListAsync();

    public async Task<Employee?> GetByIdAsync(int id) =>
        await _context.Employees
            .Include(e => e.Driver)
            .Include(e => e.AppUser)
            .FirstOrDefaultAsync(e => e.EmployeeId == id && !e.IsDeleted);

    public async Task<Employee> CreateAsync(Employee employee)
    {
        employee.CreatedAt = DateTime.UtcNow;
        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();
        return employee;
    }

    public async Task<Employee?> UpdateAsync(int id, Employee updated)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null || employee.IsDeleted) return null;

        employee.Department = updated.Department;
        employee.Phone = updated.Phone;
        employee.IsActive = updated.IsActive;
        employee.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return employee;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null || employee.IsDeleted) return false;

        employee.IsDeleted = true;
        employee.ModifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EmailExistsAsync(string email) =>
        await _context.Employees.AnyAsync(e => !e.IsDeleted && e.Email == email);
}