export interface FuelCard {
  fuelCardId: number;
  cardNumber: string;
  provider?: string;
  assignedVehicleId?: number;
  registrationNumber?: string;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  notes?: string;
}

export interface CreateFuelCardDto {
  cardNumber: string;
  provider?: string;
  assignedVehicleId?: number;
  validFrom?: string;
  validTo?: string;
  notes?: string;
}

export interface UpdateFuelCardDto {
  provider?: string;
  assignedVehicleId?: number;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  notes?: string;
}

export interface FuelTransaction {
  transactionId: number;
  vehicleId: number;
  registrationNumber: string;
  fuelCardId?: number;
  cardNumber?: string;
  fuelTypeId: number;
  fuelTypeName: string;
  postedAt: string;
  odometerKm?: number;
  liters?: number;
  pricePerLiter?: number;
  energyKwh?: number;
  pricePerKwh?: number;
  totalCost: number;
  stationName?: string;
  receiptNumber?: string;
  isSuspicious: boolean;
  notes?: string;
}

export interface CreateFuelTransactionDto {
  vehicleId: number;
  fuelCardId?: number;
  fuelTypeId: number;
  postedAt: string;
  odometerKm?: number;
  liters?: number;
  pricePerLiter?: number;
  energyKwh?: number;
  pricePerKwh?: number;
  totalCost: number;
  stationName?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface UpdateFuelTransactionDto {
  postedAt?: string;
  odometerKm?: number;
  totalCost?: number;
  notes?: string;
}
