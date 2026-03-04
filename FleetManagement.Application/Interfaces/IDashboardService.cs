using FleetManagement.Application.DTOs;

namespace FleetManagement.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync();
}
