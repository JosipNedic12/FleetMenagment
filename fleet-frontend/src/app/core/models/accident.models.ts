export interface Accident {
  accidentId: number;
  vehicleId: number;
  registrationNumber: string;
  driverId?: number;
  driverName?: string;
  occurredAt: string;
  severity: 'minor' | 'major' | 'total';
  description: string;
  damageEstimate?: number;
  policeReport?: string;
  notes?: string;
}

export interface CreateAccidentDto {
  vehicleId: number;
  driverId?: number;
  occurredAt: string;
  severity: string;
  description: string;
  damageEstimate?: number;
  policeReport?: string;
  notes?: string;
}

export interface UpdateAccidentDto {
  driverId?: number;
  occurredAt?: string;
  severity?: string;
  description?: string;
  damageEstimate?: number;
  policeReport?: string;
  notes?: string;
}
