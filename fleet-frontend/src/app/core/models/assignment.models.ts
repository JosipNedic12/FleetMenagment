export interface VehicleAssignment {
  assignmentId: number;
  vehicleId: number;
  registrationNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  driverId: number;
  driverFullName: string;
  department?: string;
  assignedFrom: string;
  assignedTo?: string;
  isActive: boolean;
  notes?: string;
}

export interface CreateVehicleAssignmentDto {
  vehicleId: number;
  driverId: number;
  assignedFrom: string;
  assignedTo?: string;
  notes?: string;
}

export interface UpdateVehicleAssignmentDto {
  assignedTo?: string;
  notes?: string;
}
