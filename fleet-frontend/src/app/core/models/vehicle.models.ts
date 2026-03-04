export interface Vehicle {
  vehicleId: number;
  registrationNumber: string;
  vin: string;
  make: string;
  model: string;
  category: string;
  fuelType: string;
  year: number;
  color?: string;
  status: 'active' | 'service' | 'retired' | 'sold';
  currentOdometerKm: number;
  notes?: string;
}

export interface Employee {
  employeeId: number;
  firstName: string;
  lastName: string;
  department?: string;
  email: string;
  phone?: string;
  isActive: boolean;
  hasDriverProfile: boolean;
  hasAppUser?: boolean;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  department?: string;
  email: string;
  phone?: string;
}

export interface UpdateEmployeeDto {
  department?: string;
  phone?: string;
  isActive?: boolean;
}

export interface Driver {
  driverId: number;
  employeeId: number;
  fullName: string;
  department?: string;
  licenseNumber: string;
  licenseExpiry: string;
  licenseExpired: boolean;
  licenseCategories: string[];
  notes?: string;
}

export interface CreateDriverDto {
  employeeId: number;
  licenseNumber: string;
  licenseExpiry: string;
  licenseCategoryIds: number[];
  notes?: string;
}

export interface UpdateDriverDto {
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseCategoryIds?: number[];
  notes?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface CreateVehicleDto {
  registrationNumber: string;
  vin: string;
  makeId: number;
  modelId: number;
  categoryId: number;
  fuelTypeId: number;
  year: number;
  color?: string;
  notes?: string;
}

export interface UpdateVehicleDto {
  color?: string;
  status?: string;
  notes?: string;
}
