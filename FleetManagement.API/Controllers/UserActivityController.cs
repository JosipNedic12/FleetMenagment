using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserActivityController : ControllerBase
{
    private readonly UserActivityService _svc;

    public UserActivityController(UserActivityService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetMyActivity([FromQuery] int count = 20)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub");
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        return Ok(await _svc.GetUserActivityAsync(userId, count));
    }
}
