export interface InsurancePolicy {
  policyId: number;
  vehicleId: number;
  registrationNumber: string;
  policyNumber: string;
  insurer: string;
  validFrom: string;
  validTo: string;
  premium: number;
  coverageNotes?: string;
  isActive: boolean;
}

export interface CreateInsurancePolicyDto {
  vehicleId: number;
  policyNumber: string;
  insurer: string;
  validFrom: string;
  validTo: string;
  premium: number;
  coverageNotes?: string;
}

export interface UpdateInsurancePolicyDto {
  insurer?: string;
  validFrom?: string;
  validTo?: string;
  premium?: number;
  coverageNotes?: string;
}
