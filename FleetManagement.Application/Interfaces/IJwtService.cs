using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(AppUser user);
}