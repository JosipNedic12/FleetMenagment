export interface Vendor {
  vendorId: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

export interface CreateVendorDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateVendorDto {
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface MaintenanceItem {
  itemId: number;
  orderId: number;
  maintenanceTypeId: number;
  maintenanceTypeName: string;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  notes?: string;
}

export interface CreateMaintenanceItemDto {
  maintenanceTypeId: number;
  partsCost: number;
  laborCost: number;
  notes?: string;
}

export interface MaintenanceOrder {
  orderId: number;
  vehicleId: number;
  registrationNumber: string;
  vendorId?: number;
  vendorName?: string;
  status: 'open' | 'in_progress' | 'closed' | 'cancelled';
  reportedAt: string;
  scheduledAt?: string;
  closedAt?: string;
  odometerKm?: number;
  totalCost?: number;
  description?: string;
  cancelReason?: string;
  items: MaintenanceItem[];
}

export interface CreateMaintenanceOrderDto {
  vehicleId: number;
  vendorId?: number;
  scheduledAt?: string;
  odometerKm?: number;
  description?: string;
}

export interface UpdateMaintenanceOrderDto {
  vendorId?: number;
  scheduledAt?: string;
  description?: string;
}

export interface CloseMaintenanceOrderDto {
  odometerKm?: number;
}

export interface CancelMaintenanceOrderDto {
  cancelReason: string;
}
