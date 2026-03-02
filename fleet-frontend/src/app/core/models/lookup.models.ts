export interface DcFuelType {
  fuelTypeId: number;
  code: string;
  label: string;
  isElectric: boolean;
  isActive: boolean;
}

export interface DcVehicleMake {
  makeId: number;
  name: string;
  isActive: boolean;
}

export interface DcVehicleModel {
  modelId: number;
  makeId: number;
  name: string;
  isActive: boolean;
}

export interface DcVehicleCategory {
  categoryId: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface DcLicenseCategory {
  licenseCategoryId: number;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface DcMaintenanceType {
  maintenanceTypeId: number;
  name: string;
  description?: string;
  isActive: boolean;
}

// ─── Dropdown / API lookup DTOs (no isActive — backend already filters) ──────

export interface MakeDto {
  makeId: number;
  name: string;
}

export interface ModelDto {
  modelId: number;
  makeId: number;
  name: string;
}

export interface VehicleCategoryDto {
  categoryId: number;
  name: string;
  description?: string;
}

export interface FuelTypeDto {
  fuelTypeId: number;
  code: string;
  label: string;
  isElectric: boolean;
}

export interface LicenseCategoryDto {
  licenseCategoryId: number;
  code: string;
  description?: string;
}

export interface MaintenanceTypeDto {
  maintenanceTypeId: number;
  name: string;
  description?: string;
}
