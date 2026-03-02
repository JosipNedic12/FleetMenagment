import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  LoginDto, AuthResponse,
  MakeDto, ModelDto, VehicleCategoryDto, FuelTypeDto, LicenseCategoryDto, MaintenanceTypeDto,
  Vehicle, CreateVehicleDto, UpdateVehicleDto,
  Employee, CreateEmployeeDto, UpdateEmployeeDto,
  Driver, CreateDriverDto, UpdateDriverDto,
  VehicleAssignment, CreateVehicleAssignmentDto, UpdateVehicleAssignmentDto,
  Vendor, CreateVendorDto, UpdateVendorDto,
  MaintenanceOrder, CreateMaintenanceOrderDto, UpdateMaintenanceOrderDto,
  CloseMaintenanceOrderDto, CancelMaintenanceOrderDto,
  MaintenanceItem, CreateMaintenanceItemDto,
  FuelCard, CreateFuelCardDto, UpdateFuelCardDto,
  FuelTransaction, CreateFuelTransactionDto,
  OdometerLog, CreateOdometerLogDto,
  InsurancePolicy, CreateInsurancePolicyDto, UpdateInsurancePolicyDto,
  RegistrationRecord, CreateRegistrationRecordDto, UpdateRegistrationRecordDto,
  Inspection, CreateInspectionDto, UpdateInspectionDto,
  Fine, CreateFineDto, UpdateFineDto, MarkFinePaidDto,
  Accident, CreateAccidentDto, UpdateAccidentDto,
} from '../models/models';

// ─── Auth ─────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AuthApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.post<AuthResponse>('auth/login', dto);
  }
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LookupApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getMakes(): Observable<MakeDto[]> {
    return this.get<MakeDto[]>('v1/makes');
  }
  getModelsByMake(makeId: number): Observable<ModelDto[]> {
    return this.get<ModelDto[]>(`v1/makes/${makeId}/models`);
  }
  getVehicleCategories(): Observable<VehicleCategoryDto[]> {
    return this.get<VehicleCategoryDto[]>('v1/vehicle-categories');
  }
  getFuelTypes(): Observable<FuelTypeDto[]> {
    return this.get<FuelTypeDto[]>('v1/fuel-types');
  }
  getLicenseCategories(): Observable<LicenseCategoryDto[]> {
    return this.get<LicenseCategoryDto[]>('v1/license-categories');
  }
  getMaintenanceTypes(): Observable<MaintenanceTypeDto[]> {
    return this.get<MaintenanceTypeDto[]>('v1/maintenance-types');
  }
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VehicleApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Vehicle[]> {
    return this.get<Vehicle[]>('v1/vehicles');
  }
  getById(id: number): Observable<Vehicle> {
    return this.get<Vehicle>(`v1/vehicles/${id}`);
  }
  create(dto: CreateVehicleDto): Observable<Vehicle> {
    return this.post<Vehicle>('v1/vehicles', dto);
  }
  update(id: number, dto: UpdateVehicleDto): Observable<Vehicle> {
    return this.patch<Vehicle>(`v1/vehicles/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/vehicles/${id}`);
  }
}

// ─── Employee ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Employee[]> {
    return this.get<Employee[]>('v1/employees');
  }
  getById(id: number): Observable<Employee> {
    return this.get<Employee>(`v1/employees/${id}`);
  }
  create(dto: CreateEmployeeDto): Observable<Employee> {
    return this.post<Employee>('v1/employees', dto);
  }
  update(id: number, dto: UpdateEmployeeDto): Observable<Employee> {
    return this.patch<Employee>(`v1/employees/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/employees/${id}`);
  }
}

// ─── Driver ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DriverApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Driver[]> {
    return this.get<Driver[]>('v1/drivers');
  }
  getById(id: number): Observable<Driver> {
    return this.get<Driver>(`v1/drivers/${id}`);
  }
  create(dto: CreateDriverDto): Observable<Driver> {
    return this.post<Driver>('v1/drivers', dto);
  }
  update(id: number, dto: UpdateDriverDto): Observable<Driver> {
    return this.patch<Driver>(`v1/drivers/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/drivers/${id}`);
  }
}

// ─── Vehicle Assignment ───────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VehicleAssignmentApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(activeOnly = false): Observable<VehicleAssignment[]> {
    return this.get<VehicleAssignment[]>(`v1/vehicleassignments${activeOnly ? '?activeOnly=true' : ''}`);
  }
  getById(id: number): Observable<VehicleAssignment> {
    return this.get<VehicleAssignment>(`v1/vehicleassignments/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<VehicleAssignment[]> {
    return this.get<VehicleAssignment[]>(`v1/vehicleassignments/vehicle/${vehicleId}`);
  }
  getByDriver(driverId: number): Observable<VehicleAssignment[]> {
    return this.get<VehicleAssignment[]>(`v1/vehicleassignments/driver/${driverId}`);
  }
  create(dto: CreateVehicleAssignmentDto): Observable<VehicleAssignment> {
    return this.post<VehicleAssignment>('v1/vehicleassignments', dto);
  }
  update(id: number, dto: UpdateVehicleAssignmentDto): Observable<VehicleAssignment> {
    return this.patch<VehicleAssignment>(`v1/vehicleassignments/${id}`, dto);
  }
  end(id: number): Observable<VehicleAssignment> {
    return this.post<VehicleAssignment>(`v1/vehicleassignments/${id}/end`, {});
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/vehicleassignments/${id}`);
  }
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VendorApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Vendor[]> {
    return this.get<Vendor[]>('v1/vendors');
  }
  getById(id: number): Observable<Vendor> {
    return this.get<Vendor>(`v1/vendors/${id}`);
  }
  create(dto: CreateVendorDto): Observable<Vendor> {
    return this.post<Vendor>('v1/vendors', dto);
  }
  update(id: number, dto: UpdateVendorDto): Observable<Vendor> {
    return this.patch<Vendor>(`v1/vendors/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/vendors/${id}`);
  }
}

// ─── Maintenance Order ────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MaintenanceOrderApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<MaintenanceOrder[]> {
    return this.get<MaintenanceOrder[]>('v1/maintenanceorders');
  }
  getById(id: number): Observable<MaintenanceOrder> {
    return this.get<MaintenanceOrder>(`v1/maintenanceorders/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<MaintenanceOrder[]> {
    return this.get<MaintenanceOrder[]>(`v1/maintenanceorders/vehicle/${vehicleId}`);
  }
  create(dto: CreateMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>('v1/maintenanceorders', dto);
  }
  update(id: number, dto: UpdateMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.patch<MaintenanceOrder>(`v1/maintenanceorders/${id}`, dto);
  }
  start(id: number): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>(`v1/maintenanceorders/${id}/start`, {});
  }
  close(id: number, dto: CloseMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>(`v1/maintenanceorders/${id}/close`, dto);
  }
  cancel(id: number, dto: CancelMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>(`v1/maintenanceorders/${id}/cancel`, dto);
  }
  addItem(orderId: number, dto: CreateMaintenanceItemDto): Observable<MaintenanceItem> {
    return this.post<MaintenanceItem>(`v1/maintenanceorders/${orderId}/items`, dto);
  }
  deleteItem(itemId: number): Observable<void> {
    return super.delete<void>(`v1/maintenanceorders/items/${itemId}`);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/maintenanceorders/${id}`);
  }
}

// ─── Fuel Card ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FuelCardApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<FuelCard[]> {
    return this.get<FuelCard[]>('v1/fuelcards');
  }
  getById(id: number): Observable<FuelCard> {
    return this.get<FuelCard>(`v1/fuelcards/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<FuelCard[]> {
    return this.get<FuelCard[]>(`v1/fuelcards/vehicle/${vehicleId}`);
  }
  create(dto: CreateFuelCardDto): Observable<FuelCard> {
    return this.post<FuelCard>('v1/fuelcards', dto);
  }
  update(id: number, dto: UpdateFuelCardDto): Observable<FuelCard> {
    return this.patch<FuelCard>(`v1/fuelcards/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/fuelcards/${id}`);
  }
}

// ─── Fuel Transaction ─────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FuelTransactionApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<FuelTransaction[]> {
    return this.get<FuelTransaction[]>('v1/fueltransactions');
  }
  getById(id: number): Observable<FuelTransaction> {
    return this.get<FuelTransaction>(`v1/fueltransactions/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<FuelTransaction[]> {
    return this.get<FuelTransaction[]>(`v1/fueltransactions/vehicle/${vehicleId}`);
  }
  create(dto: CreateFuelTransactionDto): Observable<FuelTransaction> {
    return this.post<FuelTransaction>('v1/fueltransactions', dto);
  }
  markSuspicious(id: number): Observable<FuelTransaction> {
    return this.patch<FuelTransaction>(`v1/fueltransactions/${id}/suspicious`, {});
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/fueltransactions/${id}`);
  }
}

// ─── Odometer Log ─────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OdometerLogApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getByVehicle(vehicleId: number): Observable<OdometerLog[]> {
    return this.get<OdometerLog[]>(`v1/odometerlogs/vehicle/${vehicleId}`);
  }
  getById(id: number): Observable<OdometerLog> {
    return this.get<OdometerLog>(`v1/odometerlogs/${id}`);
  }
  create(dto: CreateOdometerLogDto): Observable<OdometerLog> {
    return this.post<OdometerLog>('v1/odometerlogs', dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`v1/odometerlogs/${id}`);
  }
}

// ─── Insurance Policy ────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InsurancePolicyApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<InsurancePolicy[]> {
    return this.get<InsurancePolicy[]>('insurancepolicy');
  }
  getActive(): Observable<InsurancePolicy[]> {
    return this.get<InsurancePolicy[]>('insurancepolicy/active');
  }
  getByVehicle(vehicleId: number): Observable<InsurancePolicy[]> {
    return this.get<InsurancePolicy[]>(`insurancepolicy/vehicle/${vehicleId}`);
  }
  getById(id: number): Observable<InsurancePolicy> {
    return this.get<InsurancePolicy>(`insurancepolicy/${id}`);
  }
  create(dto: CreateInsurancePolicyDto): Observable<InsurancePolicy> {
    return this.post<InsurancePolicy>('insurancepolicy', dto);
  }
  update(id: number, dto: UpdateInsurancePolicyDto): Observable<InsurancePolicy> {
    return this.put<InsurancePolicy>(`insurancepolicy/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`insurancepolicy/${id}`);
  }
}

// ─── Registration Record ─────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RegistrationApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<RegistrationRecord[]> {
    return this.get<RegistrationRecord[]>('registrationrecord');
  }
  getByVehicle(vehicleId: number): Observable<RegistrationRecord[]> {
    return this.get<RegistrationRecord[]>(`registrationrecord/vehicle/${vehicleId}`);
  }
  getById(id: number): Observable<RegistrationRecord> {
    return this.get<RegistrationRecord>(`registrationrecord/${id}`);
  }
  create(dto: CreateRegistrationRecordDto): Observable<RegistrationRecord> {
    return this.post<RegistrationRecord>('registrationrecord', dto);
  }
  update(id: number, dto: UpdateRegistrationRecordDto): Observable<RegistrationRecord> {
    return this.put<RegistrationRecord>(`registrationrecord/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`registrationrecord/${id}`);
  }
}

// ─── Inspection ───────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InspectionApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Inspection[]> {
    return this.get<Inspection[]>('inspection');
  }
  getByVehicle(vehicleId: number): Observable<Inspection[]> {
    return this.get<Inspection[]>(`inspection/vehicle/${vehicleId}`);
  }
  getById(id: number): Observable<Inspection> {
    return this.get<Inspection>(`inspection/${id}`);
  }
  create(dto: CreateInspectionDto): Observable<Inspection> {
    return this.post<Inspection>('inspection', dto);
  }
  update(id: number, dto: UpdateInspectionDto): Observable<Inspection> {
    return this.put<Inspection>(`inspection/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`inspection/${id}`);
  }
}

// ─── Fine ─────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FineApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Fine[]> {
    return this.get<Fine[]>('fine');
  }
  getUnpaid(): Observable<Fine[]> {
    return this.get<Fine[]>('fine/unpaid');
  }
  getByVehicle(vehicleId: number): Observable<Fine[]> {
    return this.get<Fine[]>(`fine/vehicle/${vehicleId}`);
  }
  getByDriver(driverId: number): Observable<Fine[]> {
    return this.get<Fine[]>(`fine/driver/${driverId}`);
  }
  getById(id: number): Observable<Fine> {
    return this.get<Fine>(`fine/${id}`);
  }
  create(dto: CreateFineDto): Observable<Fine> {
    return this.post<Fine>('fine', dto);
  }
  update(id: number, dto: UpdateFineDto): Observable<Fine> {
    return this.put<Fine>(`fine/${id}`, dto);
  }
  markPaid(id: number, dto: MarkFinePaidDto): Observable<Fine> {
    return this.post<Fine>(`fine/${id}/pay`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`fine/${id}`);
  }
}

// ─── Accident ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AccidentApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Accident[]> {
    return this.get<Accident[]>('accident');
  }
  getByVehicle(vehicleId: number): Observable<Accident[]> {
    return this.get<Accident[]>(`accident/vehicle/${vehicleId}`);
  }
  getByDriver(driverId: number): Observable<Accident[]> {
    return this.get<Accident[]>(`accident/driver/${driverId}`);
  }
  getById(id: number): Observable<Accident> {
    return this.get<Accident>(`accident/${id}`);
  }
  create(dto: CreateAccidentDto): Observable<Accident> {
    return this.post<Accident>('accident', dto);
  }
  update(id: number, dto: UpdateAccidentDto): Observable<Accident> {
    return this.put<Accident>(`accident/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`accident/${id}`);
  }
}
