import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  LoginDto, AuthResponse, CreateAppUserDto,
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
  Accident, CreateAccidentDto, UpdateAccidentDto,ChangePasswordDto,
  Document
} from '../models/models';

// ─── Auth ─────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AuthApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.post<AuthResponse>('auth/login', dto);
  }
  
  changePassword(dto: ChangePasswordDto): Observable<void> {
    return this.post<void>('auth/change-password', dto);
  }

  createAppUser(dto: CreateAppUserDto): Observable<void> {
    return this.post<void>('auth/register', {
      employeeId: dto.employeeId,
      username: dto.username,
      password: dto.temporaryPassword,
      role: dto.role
    });
  }
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LookupApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getMakes(): Observable<MakeDto[]> {
    return this.get<MakeDto[]>('makes');
  }
  getModelsByMake(makeId: number): Observable<ModelDto[]> {
    return this.get<ModelDto[]>(`makes/${makeId}/models`);
  }
  getVehicleCategories(): Observable<VehicleCategoryDto[]> {
    return this.get<VehicleCategoryDto[]>('vehicle-categories');
  }
  getFuelTypes(): Observable<FuelTypeDto[]> {
    return this.get<FuelTypeDto[]>('fuel-types');
  }
  getLicenseCategories(): Observable<LicenseCategoryDto[]> {
    return this.get<LicenseCategoryDto[]>('license-categories');
  }
  getMaintenanceTypes(): Observable<MaintenanceTypeDto[]> {
    return this.get<MaintenanceTypeDto[]>('maintenance-types');
  }
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VehicleApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Vehicle[]> {
    return this.get<Vehicle[]>('Vehicles');
  }
  getById(id: number): Observable<Vehicle> {
    return this.get<Vehicle>(`Vehicles/${id}`);
  }
  create(dto: CreateVehicleDto): Observable<Vehicle> {
    return this.post<Vehicle>('Vehicles', dto);
  }
  update(id: number, dto: UpdateVehicleDto): Observable<Vehicle> {
    return this.patch<Vehicle>(`Vehicles/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`Vehicles/${id}`);
  }
}

// ─── Employee ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Employee[]> {
    return this.get<Employee[]>('Employees');
  }
  getById(id: number): Observable<Employee> {
    return this.get<Employee>(`Employees/${id}`);
  }
  create(dto: CreateEmployeeDto): Observable<Employee> {
    return this.post<Employee>('Employees', dto);
  }
  update(id: number, dto: UpdateEmployeeDto): Observable<Employee> {
    return this.patch<Employee>(`Employees/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`Employees/${id}`);
  }
}

// ─── Driver ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DriverApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Driver[]> {
    return this.get<Driver[]>('Drivers');
  }
  getById(id: number): Observable<Driver> {
    return this.get<Driver>(`Drivers/${id}`);
  }
  create(dto: CreateDriverDto): Observable<Driver> {
    return this.post<Driver>('Drivers', dto);
  }
  update(id: number, dto: UpdateDriverDto): Observable<Driver> {
    return this.patch<Driver>(`Drivers/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`Drivers/${id}`);
  }
}

// ─── Vehicle Assignment ───────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VehicleAssignmentApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(activeOnly = false): Observable<VehicleAssignment[]> {
    return this.get<VehicleAssignment[]>(`VehicleAssignments${activeOnly ? '?activeOnly=true' : ''}`);
  }
  getById(id: number): Observable<VehicleAssignment> {
    return this.get<VehicleAssignment>(`VehicleAssignments/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<VehicleAssignment[]> {
    return this.get<VehicleAssignment[]>(`VehicleAssignments/vehicle/${vehicleId}`);
  }
  getByDriver(driverId: number): Observable<VehicleAssignment[]> {
    return this.get<VehicleAssignment[]>(`VehicleAssignments/driver/${driverId}`);
  }
  create(dto: CreateVehicleAssignmentDto): Observable<VehicleAssignment> {
    return this.post<VehicleAssignment>('VehicleAssignments', dto);
  }
  update(id: number, dto: UpdateVehicleAssignmentDto): Observable<VehicleAssignment> {
    return this.patch<VehicleAssignment>(`VehicleAssignments/${id}`, dto);
  }
  end(id: number): Observable<VehicleAssignment> {
    return this.post<VehicleAssignment>(`VehicleAssignments/${id}/end`, {});
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`VehicleAssignments/${id}`);
  }
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VendorApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Vendor[]> {
    return this.get<Vendor[]>('Vendors');
  }
  getById(id: number): Observable<Vendor> {
    return this.get<Vendor>(`Vendors/${id}`);
  }
  create(dto: CreateVendorDto): Observable<Vendor> {
    return this.post<Vendor>('Vendors', dto);
  }
  update(id: number, dto: UpdateVendorDto): Observable<Vendor> {
    return this.patch<Vendor>(`Vendors/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`Vendors/${id}`);
  }
}

// ─── Maintenance Order ────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MaintenanceOrderApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<MaintenanceOrder[]> {
    return this.get<MaintenanceOrder[]>('MaintenanceOrders');
  }
  getById(id: number): Observable<MaintenanceOrder> {
    return this.get<MaintenanceOrder>(`MaintenanceOrders/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<MaintenanceOrder[]> {
    return this.get<MaintenanceOrder[]>(`MaintenanceOrders/vehicle/${vehicleId}`);
  }
  create(dto: CreateMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>('MaintenanceOrders', dto);
  }
  update(id: number, dto: UpdateMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.patch<MaintenanceOrder>(`MaintenanceOrders/${id}`, dto);
  }
  start(id: number): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>(`MaintenanceOrders/${id}/start`, {});
  }
  close(id: number, dto: CloseMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>(`MaintenanceOrders/${id}/close`, dto);
  }
  cancel(id: number, dto: CancelMaintenanceOrderDto): Observable<MaintenanceOrder> {
    return this.post<MaintenanceOrder>(`MaintenanceOrders/${id}/cancel`, dto);
  }
  addItem(orderId: number, dto: CreateMaintenanceItemDto): Observable<MaintenanceItem> {
    return this.post<MaintenanceItem>(`MaintenanceOrders/${orderId}/items`, dto);
  }
  deleteItem(itemId: number): Observable<void> {
    return super.delete<void>(`MaintenanceOrders/items/${itemId}`);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`MaintenanceOrders/${id}`);
  }
}

// ─── Fuel Card ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FuelCardApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<FuelCard[]> {
    return this.get<FuelCard[]>('FuelCards');
  }
  getById(id: number): Observable<FuelCard> {
    return this.get<FuelCard>(`FuelCards/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<FuelCard[]> {
    return this.get<FuelCard[]>(`FuelCards/vehicle/${vehicleId}`);
  }
  create(dto: CreateFuelCardDto): Observable<FuelCard> {
    return this.post<FuelCard>('FuelCards', dto);
  }
  update(id: number, dto: UpdateFuelCardDto): Observable<FuelCard> {
    return this.patch<FuelCard>(`FuelCards/${id}`, dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`FuelCards/${id}`);
  }
}

// ─── Fuel Transaction ─────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FuelTransactionApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<FuelTransaction[]> {
    return this.get<FuelTransaction[]>('FuelTransactions');
  }
  getById(id: number): Observable<FuelTransaction> {
    return this.get<FuelTransaction>(`FuelTransactions/${id}`);
  }
  getByVehicle(vehicleId: number): Observable<FuelTransaction[]> {
    return this.get<FuelTransaction[]>(`FuelTransactions/vehicle/${vehicleId}`);
  }
  create(dto: CreateFuelTransactionDto): Observable<FuelTransaction> {
    return this.post<FuelTransaction>('FuelTransactions', dto);
  }
  markSuspicious(id: number): Observable<FuelTransaction> {
    return this.patch<FuelTransaction>(`FuelTransactions/${id}/suspicious`, {});
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`FuelTransactions/${id}`);
  }
}

// ─── Odometer Log ─────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OdometerLogApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<OdometerLog[]> {
    return this.get<OdometerLog[]>('odometerlogs');
  }
  getByVehicle(vehicleId: number): Observable<OdometerLog[]> {
    return this.get<OdometerLog[]>(`odometerlogs/vehicle/${vehicleId}`);
  }
  getById(id: number): Observable<OdometerLog> {
    return this.get<OdometerLog>(`odometerlogs/${id}`);
  }
  create(dto: CreateOdometerLogDto): Observable<OdometerLog> {
    return this.post<OdometerLog>('odometerlogs', dto);
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`odometerlogs/${id}`);
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface ComplianceReminder {
  vehicleId: number;
  registrationNumber: string;
  type: 'Insurance' | 'Registration' | 'Inspection';
  expiresAt: string;
  daysLeft: number;
  status: 'expired' | 'due_soon' | 'ok';
}

export interface AssignmentSummary {
  assigned: number;
  unassigned: number;
  totalVehicles: number;
}

export interface WorkOrderSummary {
  open: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface VehicleStatusBreakdown {
  active: number;
  inService: number;
  retired: number;
  sold: number;
}

export interface DashboardData {
  // Stat counts
  activeVehicles: number;
  openMaintenanceOrders: number;
  kmThisMonth: number;
  unpaidFines: number;
  expiredInsurance: number;
  accidentCount: number;
  fuelCostThisMonth: number;
  inspectionsDue: number;
  // Widgets
  complianceReminders: ComplianceReminder[];
  assignmentSummary: AssignmentSummary;
  workOrderSummary: WorkOrderSummary;
  // Charts
  fuelCostByMonth: number[];
  maintenanceCostByMonth: number[];
  vehicleStatusBreakdown: VehicleStatusBreakdown;
  accidentsByMonth: number[];
  finesByMonth: number[];
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getDashboard(): Observable<DashboardData> {
    return this.get<DashboardData>('Dashboard');
  }
}

// ─── Documents ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DocumentApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getByEntity(entityType: string, entityId: number): Observable<Document[]> {
    return this.get<Document[]>(`documents?entityType=${entityType}&entityId=${entityId}`);
  }

  upload(entityType: string, entityId: number, file: File, category?: string, notes?: string): Observable<Document> {
    const fd = new FormData();
    fd.append('entityType', entityType);
    fd.append('entityId', String(entityId));
    fd.append('file', file);
    if (category) fd.append('category', category);
    if (notes) fd.append('notes', notes);
    return this.http.post<Document>(`${this.base}/documents`, fd);
  }

  download(documentId: number): void {
    window.open(`${this.base}/documents/${documentId}/download`, '_blank');
  }

  deleteDoc(documentId: number): Observable<void> {
    return this.delete<void>(`documents/${documentId}`);
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: 'Vehicle' | 'Driver' | 'Maintenance';
  id: number;
  title: string;
  subtitle: string;
  route: string;
}

@Injectable({ providedIn: 'root' })
export class SearchApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  search(q: string): Observable<SearchResult[]> {
    return this.http.get<SearchResult[]>(`${this.base}/search`, { params: { q } });
  }
}
