import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Notification } from '../models/notification.models';
import { PagedRequest, PagedResponse } from '../models/paged.models';
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
  FuelTransaction, CreateFuelTransactionDto, UpdateFuelTransactionDto,
  OdometerLog, CreateOdometerLogDto,
  InsurancePolicy, CreateInsurancePolicyDto, UpdateInsurancePolicyDto,
  RegistrationRecord, CreateRegistrationRecordDto, UpdateRegistrationRecordDto,
  Inspection, CreateInspectionDto, UpdateInspectionDto,
  Fine, CreateFineDto, UpdateFineDto, MarkFinePaidDto,
  Accident, CreateAccidentDto, UpdateAccidentDto,ChangePasswordDto,
  Document, VehicleDocument
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

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<Vehicle>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<Vehicle>>('Vehicles', params);
  }
  getAll(): Observable<Vehicle[]> {
    return this.get<Vehicle[]>('Vehicles/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('Vehicles/export', params);
  }
}

// ─── Employee ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<Employee>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<Employee>>('Employees', params);
  }
  getAll(): Observable<Employee[]> {
    return this.get<Employee[]>('Employees/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('Employees/export', params);
  }
}

// ─── Driver ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DriverApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<Driver>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<Driver>>('Drivers', params);
  }
  getAll(): Observable<Driver[]> {
    return this.get<Driver[]>('Drivers/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('Drivers/export', params);
  }
}

// ─── Vehicle Assignment ───────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VehicleAssignmentApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<VehicleAssignment>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<VehicleAssignment>>('VehicleAssignments', params);
  }
  getAll(activeOnly = false): Observable<VehicleAssignment[]> {
    return this.get<VehicleAssignment[]>(`VehicleAssignments/all${activeOnly ? '?activeOnly=true' : ''}`);
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('VehicleAssignments/export', params);
  }
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VendorApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<Vendor>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<Vendor>>('Vendors', params);
  }
  getAll(): Observable<Vendor[]> {
    return this.get<Vendor[]>('Vendors/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('Vendors/export', params);
  }
}

// ─── Maintenance Order ────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MaintenanceOrderApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<MaintenanceOrder>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<MaintenanceOrder>>('MaintenanceOrders', params);
  }
  getAll(): Observable<MaintenanceOrder[]> {
    return this.get<MaintenanceOrder[]>('MaintenanceOrders/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('MaintenanceOrders/export', params);
  }
}

// ─── Fuel Card ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FuelCardApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<FuelCard>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<FuelCard>>('FuelCards', params);
  }
  getAll(): Observable<FuelCard[]> {
    return this.get<FuelCard[]>('FuelCards/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('FuelCards/export', params);
  }
}

// ─── Fuel Transaction ─────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FuelTransactionApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<FuelTransaction>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<FuelTransaction>>('FuelTransactions', params);
  }
  getAll(): Observable<FuelTransaction[]> {
    return this.get<FuelTransaction[]>('FuelTransactions/all');
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
  update(id: number, dto: UpdateFuelTransactionDto): Observable<FuelTransaction> {
    return this.put<FuelTransaction>(`FuelTransactions/${id}`, dto);
  }
  markSuspicious(id: number): Observable<FuelTransaction> {
    return this.patch<FuelTransaction>(`FuelTransactions/${id}/suspicious`, {});
  }
  deleteById(id: number): Observable<void> {
    return super.delete<void>(`FuelTransactions/${id}`);
  }
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('FuelTransactions/export', params);
  }
}

// ─── Odometer Log ─────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OdometerLogApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<OdometerLog>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<OdometerLog>>('odometerlogs', params);
  }
  getAll(): Observable<OdometerLog[]> {
    return this.get<OdometerLog[]>('odometerlogs/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('odometerlogs/export', params);
  }
}

// ─── Insurance Policy ────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InsurancePolicyApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<InsurancePolicy>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<InsurancePolicy>>('insurancepolicy', params);
  }
  getAll(): Observable<InsurancePolicy[]> {
    return this.get<InsurancePolicy[]>('insurancepolicy/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('insurancepolicy/export', params);
  }
}

// ─── Registration Record ─────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RegistrationApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<RegistrationRecord>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<RegistrationRecord>>('registrationrecord', params);
  }
  getAll(): Observable<RegistrationRecord[]> {
    return this.get<RegistrationRecord[]>('registrationrecord/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('registrationrecord/export', params);
  }
}

// ─── Inspection ───────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InspectionApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<Inspection>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<Inspection>>('inspection', params);
  }
  getAll(): Observable<Inspection[]> {
    return this.get<Inspection[]>('inspection/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('inspection/export', params);
  }
}

// ─── Fine ─────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FineApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<Fine>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<Fine>>('fine', params);
  }
  getAll(): Observable<Fine[]> {
    return this.get<Fine[]>('fine/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('fine/export', params);
  }
}

// ─── Accident ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AccidentApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getPaged(request: PagedRequest, filter?: Record<string, any>): Observable<PagedResponse<Accident>> {
    const params = this.buildPagedParams(request, filter);
    return this.getWithParams<PagedResponse<Accident>>('accident', params);
  }
  getAll(): Observable<Accident[]> {
    return this.get<Accident[]>('accident/all');
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
  export(format: 'xlsx' | 'pdf', search?: string, filter?: Record<string, any>): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format).set('lang', this.currentLang());
    if (search) params = params.set('search', search);
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }
    return this.downloadFile('accident/export', params);
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

  getVehicleDocuments(vehicleId: number): Observable<VehicleDocument[]> {
    return this.get<VehicleDocument[]>(`documents/vehicle/${vehicleId}`);
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

// ─── Notifications ────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class NotificationApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getAll(): Observable<Notification[]> {
    return this.get<Notification[]>('Notifications');
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.get<{ count: number }>('Notifications/unread-count');
  }

  markAsRead(id: number): Observable<void> {
    return this.put<void>(`Notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.put<void>('Notifications/read-all', {});
  }
}

// ─── User Activity ────────────────────────────────────────────────────────────

export interface ActivityLogDto {
  activityLogId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UserActivityApiService extends ApiService {
  constructor(http: HttpClient) { super(http); }

  getMyActivity(count = 20): Observable<ActivityLogDto[]> {
    return this.get<ActivityLogDto[]>(`UserActivity?count=${count}`);
  }
}
