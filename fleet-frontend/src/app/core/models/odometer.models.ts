export interface OdometerLog {
  logId: number;
  vehicleId: number;
  registrationNumber: string;
  odometerKm: number;
  logDate: string;
  notes?: string;
  createdAt: string;
}

export interface CreateOdometerLogDto {
  vehicleId: number;
  odometerKm: number;
  logDate: string;
  notes?: string;
}
