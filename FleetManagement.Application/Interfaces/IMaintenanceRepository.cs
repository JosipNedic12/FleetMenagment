using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IMaintenanceOrderRepository
{
    Task<IEnumerable<MaintenanceOrder>> GetAllAsync();
    Task<IEnumerable<MaintenanceOrder>> GetByVehicleIdAsync(int vehicleId);
    Task<MaintenanceOrder?> GetByIdAsync(int id);
    Task<MaintenanceOrder> CreateAsync(MaintenanceOrder order);
    Task<MaintenanceOrder?> UpdateAsync(int id, MaintenanceOrder updated);

    // Workflow transitions
    Task<MaintenanceOrder?> SetStatusAsync(int id, string newStatus);
    Task<MaintenanceOrder?> CloseAsync(int id, int? odometerKm);
    Task<MaintenanceOrder?> CancelAsync(int id, string cancelReason);

    // Items
    Task<MaintenanceItem> AddItemAsync(int orderId, MaintenanceItem item);
    Task<bool> DeleteItemAsync(int itemId);
}