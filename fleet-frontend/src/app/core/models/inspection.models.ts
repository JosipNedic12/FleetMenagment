export interface Inspection {
  inspectionId: number;
  vehicleId: number;
  registrationNumber: string;
  inspectedAt: string;
  validTo?: string;
  result: 'passed' | 'failed' | 'conditional';
  notes?: string;
  odometerKm?: number;
  isValid: boolean;
}

export interface CreateInspectionDto {
  vehicleId: number;
  inspectedAt: string;
  validTo?: string;
  result: string;
  notes?: string;
  odometerKm?: number;
}

export interface UpdateInspectionDto {
  inspectedAt?: string;
  validTo?: string;
  result?: string;
  notes?: string;
  odometerKm?: number;
}
