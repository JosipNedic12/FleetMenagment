using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly FleetDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(FleetDbContext context, IJwtService jwtService, ILogger<AuthService> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _logger = logger;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _context.AppUsers
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Username == dto.Username && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for {Username}", dto.Username);
            return null;
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(user);

        _logger.LogInformation("User {Username} logged in", user.Username);

        return new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            FullName = $"{user.Employee.FirstName} {user.Employee.LastName}",
            Role = user.Role,
            ExpiresAt = DateTime.UtcNow.AddHours(8),
            MustChangePassword = user.MustChangePassword
        };
    }

    public async Task<bool> RegisterAsync(RegisterUserDto dto)
    {
        if (await _context.AppUsers.AnyAsync(u => u.Username == dto.Username))
            throw new InvalidOperationException("Username already exists.");

        if (await _context.AppUsers.AnyAsync(u => u.EmployeeId == dto.EmployeeId))
            throw new InvalidOperationException("This employee already has an app user.");

        if (!await _context.Employees.AnyAsync(e => e.EmployeeId == dto.EmployeeId && !e.IsDeleted))
            throw new InvalidOperationException("Employee not found.");

        var validRoles = new[] { "Admin", "FleetManager", "Driver", "ReadOnly" };
        if (!validRoles.Contains(dto.Role))
            throw new InvalidOperationException($"Invalid role. Valid roles: {string.Join(", ", validRoles)}");

        var user = new AppUser
        {
            EmployeeId = dto.EmployeeId,
            Username = dto.Username.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.AppUsers.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New user {Username} registered by admin", user.Username);

        return true;
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        var user = await _context.AppUsers.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
        {
            _logger.LogWarning("Failed password change attempt for user {UserId}", userId);
            throw new InvalidOperationException("Current password is incorrect.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.MustChangePassword = false;
        await _context.SaveChangesAsync();

        return true;
    }
}
