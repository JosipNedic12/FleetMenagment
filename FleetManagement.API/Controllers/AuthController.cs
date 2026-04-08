using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly FleetDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly UserActivityService _activity;

    public AuthController(FleetDbContext context, IJwtService jwtService, UserActivityService activity)
    {
        _context = context;
        _jwtService = jwtService;
        _activity = activity;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var user = await _context.AppUsers
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Username == dto.Username && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized("Invalid username or password.");

        // update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _activity.LogAsync(user.UserId, "Login", "AppUser", user.UserId, "Prijava u sustav");

        var token = _jwtService.GenerateToken(user);

        return Ok(new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            FullName = $"{user.Employee.FirstName} {user.Employee.LastName}",
            Role = user.Role,
            ExpiresAt = DateTime.UtcNow.AddHours(8),
            MustChangePassword = user.MustChangePassword
        });
    }

    // Only Admin can create users
    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register(RegisterUserDto dto)
    {
        if (await _context.AppUsers.AnyAsync(u => u.Username == dto.Username))
            return Conflict("Username already exists.");

        if (await _context.AppUsers.AnyAsync(u => u.EmployeeId == dto.EmployeeId))
            return Conflict("This employee already has an app user.");

        if (!await _context.Employees.AnyAsync(e => e.EmployeeId == dto.EmployeeId && !e.IsDeleted))
            return BadRequest("Employee not found.");

        var validRoles = new[] { "Admin", "FleetManager", "Driver", "ReadOnly" };
        if (!validRoles.Contains(dto.Role))
            return BadRequest($"Invalid role. Valid roles: {string.Join(", ", validRoles)}");

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

        return CreatedAtAction(null, null, new { user.UserId, user.Username, user.Role });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)
                         ?? User.FindFirst(JwtRegisteredClaimNames.Sub)
                         ?? User.FindFirst("sub");
        if (userIdClaim == null) return Unauthorized();

        var user = await _context.AppUsers.FindAsync(int.Parse(userIdClaim.Value));
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return BadRequest("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.MustChangePassword = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}