export interface Fine {
  fineId: number;
  vehicleId: number;
  registrationNumber: string;
  driverId?: number;
  driverName?: string;
  occurredAt: string;
  amount: number;
  reason: string;
  paidAt?: string;
  paymentMethod?: string;
  isPaid: boolean;
  notes?: string;
}

export interface CreateFineDto {
  vehicleId: number;
  driverId?: number;
  occurredAt: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface UpdateFineDto {
  driverId?: number;
  occurredAt?: string;
  amount?: number;
  reason?: string;
  notes?: string;
}

export interface MarkFinePaidDto {
  paidAt: string;
  paymentMethod?: string;
}
