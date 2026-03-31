import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, ArrowLeft, Car, Wrench, Fuel, Users, Shield, ClipboardCheck, TriangleAlert, Siren, FileText, Download } from 'lucide-angular';
import {
  VehicleApiService,
  VehicleAssignmentApiService,
  MaintenanceOrderApiService,
  FuelTransactionApiService,
  OdometerLogApiService,
  InsurancePolicyApiService,
  RegistrationApiService,
  InspectionApiService,
  FineApiService,
  AccidentApiService,
  DocumentApiService,
} from '../../../core/auth/feature-api.services';
import {
  Vehicle, VehicleAssignment, MaintenanceOrder,
  FuelTransaction, OdometerLog, InsurancePolicy,
  RegistrationRecord, Inspection, Fine, Accident, Document, VehicleDocument,
} from '../../../core/models/models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';

type Tab = 'overview' | 'maintenance' | 'fuel' | 'assignments' | 'insurance' | 'inspections' | 'fines' | 'accidents' | 'documents';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent, LucideAngularModule, FileUploadComponent, EuNumberPipe],
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard" i18n="@@vehicles.breadcrumb.dashboard">Dashboard</a>
        <span class="bc-sep">›</span>
        <a routerLink="/vehicles" i18n="@@vehicles.breadcrumb.vehicles">Vehicles</a>
        <span class="bc-sep">›</span>
        <span>{{ vehicle()?.registrationNumber ?? 'Detail' }}</span>
      </nav>

      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@vehicles.detail.backButton">Vehicles</ng-container>
          </button>
          <div>
            @if (vehicle()) {
              <h1 class="page-title">{{ vehicle()!.make }} {{ vehicle()!.model }} · <span class="mono">{{ vehicle()!.registrationNumber }}</span></h1>
              <p class="page-subtitle">{{ vehicle()!.year }} · {{ vehicle()!.category }} · {{ vehicle()!.fuelType }}</p>
            } @else {
              <h1 class="page-title" i18n="@@vehicles.detail.title">Vehicle Detail</h1>
            }
          </div>
        </div>
        @if (vehicle()) {
          <app-badge
            [label]="vehicle()!.status"
            [variant]="statusVariant(vehicle()!.status)"
          />
        }
      </div>

      @if (loading()) {
        <div class="table-loading" i18n="@@vehicles.detail.loading">Loading…</div>
      } @else if (!vehicle()) {
        <div class="table-empty" i18n="@@vehicles.detail.notFound">Vehicle not found.</div>
      } @else {

        <!-- Tab bar -->
        <div class="tabs">
          @for (tab of tabs; track tab.id) {
            <button class="tab" [class.active]="activeTab() === tab.id" (click)="setTab(tab.id)">
              <lucide-icon [img]="tab.icon" [size]="14" [strokeWidth]="2"></lucide-icon>
              {{ tab.label }}
              <span class="tab-count">{{ getCount(tab.id) }}</span>
            </button>
          }
        </div>

        <!-- Overview -->
        @if (activeTab() === 'overview') {
          <div class="overview-grid">

            <!-- Vehicle Info -->
            <div class="info-group">
              <div class="info-group-title" i18n="@@vehicles.detail.vehicleInfo">Vehicle Info</div>
              <div class="kv-grid">
                <div class="kv-row kv-full">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.vehicle">Vehicle</span>
                  <span class="kv-value">{{ vehicle()!.make }} {{ vehicle()!.model }}<br><span class="mono" style="font-size:12px; color:var(--text-muted)">{{ vehicle()!.registrationNumber }}</span></span>
                </div>
                <div class="kv-row">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.year">Year</span>
                  <span class="kv-value">{{ vehicle()!.year }}</span>
                </div>
                <div class="kv-row kv-full">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.category">Category</span>
                  <span class="kv-value">{{ vehicle()!.category }}</span>
                </div>
              </div>
            </div>

            <!-- Status & Operations -->
            <div class="info-group">
              <div class="info-group-title" i18n="@@vehicles.detail.statusOps">Status &amp; Operations</div>
              <div class="kv-grid">
                <div class="kv-row kv-full">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.status">Status</span>
                  <span class="kv-value">
                    <app-badge
                      [label]="vehicle()!.status"
                      [variant]="statusVariant(vehicle()!.status)"
                    />
                  </span>
                </div>
                <div class="kv-row">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.odometer">Odometer</span>
                  <span class="kv-value">{{ vehicle()!.currentOdometerKm | euNumber }} km</span>
                </div>
                <div class="kv-row">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.color">Color</span>
                  <span class="kv-value">{{ vehicle()!.color || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Technical Details -->
            <div class="info-group info-group--full">
              <div class="info-group-title" i18n="@@vehicles.detail.technicalDetails">Technical Details</div>
              <div class="kv-grid kv-grid--3">
                <div class="kv-row">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.fuelType">Fuel Type</span>
                  <span class="kv-value">{{ vehicle()!.fuelType }}</span>
                </div>
                <div class="kv-row">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.vin">VIN</span>
                  <span class="kv-value mono">{{ vehicle()!.vin || '—' }}</span>
                </div>
                <div class="kv-row">
                  <span class="kv-label" i18n="@@vehicles.detail.kv.notes">Notes</span>
                  <span class="kv-value">{{ vehicle()!.notes || '—' }}</span>
                </div>
              </div>
            </div>

          </div>
        }

        <!-- Maintenance -->
        @if (activeTab() === 'maintenance') {
          <div class="section-card">
            @if (maintenance().length === 0) {
              <div class="table-empty" i18n="@@vehicles.maintenance.empty">No maintenance orders.</div>
            } @else {
              <table class="table">
                <thead><tr><th i18n="@@vehicles.maintenance.reported">Reported</th><th i18n="@@vehicles.maintenance.vendor">Vendor</th><th i18n="@@vehicles.maintenance.description">Description</th><th i18n="@@vehicles.maintenance.cost">Cost</th><th i18n="@@vehicles.table.status">Status</th></tr></thead>
                <tbody>
                  @for (r of maintenance(); track r.orderId) {
                    <tr>
                      <td>{{ r.reportedAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.vendorName || '—' }}</td>
                      <td>{{ r.description || '—' }}</td>
                      <td>{{ r.totalCost != null ? (r.totalCost | euNumber:'1.2-2') + ' €' : '—' }}</td>
                      <td><app-badge [label]="r.status"
                        [variant]="r.status === 'closed' ? 'success' : r.status === 'in_progress' ? 'warning' : 'neutral'" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Fuel -->
        @if (activeTab() === 'fuel') {
          <div class="section-card">
            @if (fuel().length === 0) {
              <div class="table-empty" i18n="@@vehicles.fuel.empty">No fuel transactions.</div>
            } @else {
              <table class="table">
                <thead><tr><th i18n="@@vehicles.fuel.date">Date</th><th i18n="@@vehicles.fuel.litres">Litres</th><th i18n="@@vehicles.fuel.pricePerL">Price/L</th><th i18n="@@vehicles.fuel.total">Total</th><th i18n="@@vehicles.table.odometer">Odometer</th><th i18n="@@vehicles.detail.kv.fuelType">Fuel Type</th></tr></thead>
                <tbody>
                  @for (r of fuel(); track r.transactionId) {
                    <tr>
                      <td>{{ r.postedAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.liters != null ? (r.liters | euNumber:'1.2-2') : '—' }}</td>
                      <td>{{ r.pricePerLiter != null ? (r.pricePerLiter | euNumber:'1.3-3') : '—' }}</td>
                      <td>{{ r.totalCost | euNumber:'1.2-2' }} €</td>
                      <td>{{ r.odometerKm != null ? (r.odometerKm | euNumber) + ' km' : '—' }}</td>
                      <td>{{ r.fuelTypeName }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Assignments -->
        @if (activeTab() === 'assignments') {
          <div class="section-card">
            @if (assignments().length === 0) {
              <div class="table-empty" i18n="@@vehicles.assignments.empty">No assignments.</div>
            } @else {
              <table class="table">
                <thead><tr><th i18n="@@vehicles.assignments.driver">Driver</th><th i18n="@@vehicles.assignments.from">From</th><th i18n="@@vehicles.assignments.to">To</th><th i18n="@@vehicles.detail.kv.notes">Notes</th><th i18n="@@vehicles.table.status">Status</th></tr></thead>
                <tbody>
                  @for (r of assignments(); track r.assignmentId) {
                    <tr>
                      <td>{{ r.driverFullName }}</td>
                      <td>{{ r.assignedFrom | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.assignedTo ? (r.assignedTo | date:'dd.MM.yyyy') : '—' }}</td>
                      <td>{{ r.notes || '—' }}</td>
                      <td><app-badge [label]="r.isActive ? 'Active' : 'Ended'" [variant]="r.isActive ? 'success' : 'neutral'" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Insurance -->
        @if (activeTab() === 'insurance') {
          <div class="section-card">
            @if (insurance().length === 0) {
              <div class="table-empty" i18n="@@vehicles.insurance.empty">No insurance policies.</div>
            } @else {
              <table class="table">
                <thead><tr><th i18n="@@vehicles.insurance.policyNo">Policy #</th><th i18n="@@vehicles.insurance.insurer">Insurer</th><th i18n="@@vehicles.insurance.validFrom">Valid From</th><th i18n="@@vehicles.insurance.validTo">Valid To</th><th i18n="@@vehicles.insurance.premium">Premium</th><th i18n="@@vehicles.insurance.coverage">Coverage</th><th i18n="@@vehicles.table.status">Status</th></tr></thead>
                <tbody>
                  @for (r of insurance(); track r.policyId) {
                    <tr>
                      <td class="mono">{{ r.policyNumber }}</td>
                      <td>{{ r.insurer }}</td>
                      <td>{{ r.validFrom | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.validTo | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.premium | euNumber:'1.2-2' }} €</td>
                      <td>{{ r.coverageNotes || '—' }}</td>
                      <td><app-badge [label]="r.isActive ? 'Active' : 'Expired'" [variant]="r.isActive ? 'success' : 'neutral'" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Inspections -->
        @if (activeTab() === 'inspections') {
          <div class="section-card">
            @if (inspections().length === 0) {
              <div class="table-empty" i18n="@@vehicles.inspections.empty">No inspections.</div>
            } @else {
              <table class="table">
                <thead><tr><th i18n="@@vehicles.fuel.date">Date</th><th i18n="@@vehicles.inspections.result">Result</th><th i18n="@@vehicles.insurance.validTo">Valid To</th><th i18n="@@vehicles.table.odometer">Odometer</th><th i18n="@@vehicles.detail.kv.notes">Notes</th><th i18n="@@vehicles.table.status">Status</th></tr></thead>
                <tbody>
                  @for (r of inspections(); track r.inspectionId) {
                    <tr>
                      <td>{{ r.inspectedAt | date:'dd.MM.yyyy' }}</td>
                      <td><app-badge [label]="r.result"
                        [variant]="r.result === 'passed' ? 'success' : r.result === 'failed' ? 'danger' : 'warning'" /></td>
                      <td>{{ r.validTo ? (r.validTo | date:'dd.MM.yyyy') : '—' }}</td>
                      <td>{{ r.odometerKm != null ? (r.odometerKm | euNumber) + ' km' : '—' }}</td>
                      <td>{{ r.notes || '—' }}</td>
                      <td><app-badge [label]="r.isValid ? 'Valid' : 'Expired'" [variant]="r.isValid ? 'success' : 'neutral'" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Fines -->
        @if (activeTab() === 'fines') {
          <div class="section-card">
            @if (fines().length === 0) {
              <div class="table-empty" i18n="@@vehicles.fines.empty">No fines.</div>
            } @else {
              <table class="table">
                <thead><tr><th i18n="@@vehicles.fuel.date">Date</th><th i18n="@@vehicles.assignments.driver">Driver</th><th i18n="@@vehicles.fines.reason">Reason</th><th i18n="@@vehicles.fines.amount">Amount</th><th i18n="@@vehicles.table.status">Status</th></tr></thead>
                <tbody>
                  @for (r of fines(); track r.fineId) {
                    <tr>
                      <td>{{ r.occurredAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.driverName || '—' }}</td>
                      <td>{{ r.reason }}</td>
                      <td>{{ r.amount | euNumber:'1.2-2' }} €</td>
                      <td><app-badge [label]="r.isPaid ? 'Paid' : 'Unpaid'" [variant]="r.isPaid ? 'success' : 'danger'" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Accidents -->
        @if (activeTab() === 'accidents') {
          <div class="section-card">
            @if (accidents().length === 0) {
              <div class="table-empty" i18n="@@vehicles.accidents.empty">No accidents.</div>
            } @else {
              <table class="table">
                <thead><tr><th i18n="@@vehicles.fuel.date">Date</th><th i18n="@@vehicles.assignments.driver">Driver</th><th i18n="@@vehicles.accidents.severity">Severity</th><th i18n="@@vehicles.accidents.damageEst">Damage Est.</th><th i18n="@@vehicles.accidents.policeReport">Police Report</th><th i18n="@@vehicles.maintenance.description">Description</th></tr></thead>
                <tbody>
                  @for (r of accidents(); track r.accidentId) {
                    <tr>
                      <td>{{ r.occurredAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.driverName || '—' }}</td>
                      <td><app-badge [label]="r.severity"
                        [variant]="r.severity === 'minor' ? 'warning' : r.severity === 'major' ? 'danger' : 'neutral'" /></td>
                      <td>{{ r.damageEstimate != null ? (r.damageEstimate | euNumber:'1.2-2') + ' €' : '—' }}</td>
                      <td>{{ r.policeReport || '—' }}</td>
                      <td>{{ r.description }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Documents -->
        @if (activeTab() === 'documents') {
          <div class="section-card">
            <app-file-upload
              [entityType]="'Vehicle'"
              [entityId]="vehicle()!.vehicleId"
              (uploaded)="onDocumentUploaded($event)"
            />
            @if (documents().length === 0) {
              <div class="table-empty" i18n="@@vehicles.documents.empty">No documents attached.</div>
            } @else {
              <table class="table">
                <thead>
                  <tr>
                    <th i18n="@@vehicles.documents.fileName">File Name</th>
                    <th i18n="@@vehicles.documents.type">Type</th>
                    <th i18n="@@vehicles.documents.size">Size</th>
                    <th i18n="@@vehicles.documents.uploaded">Uploaded</th>
                    <th i18n="@@vehicles.table.actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (doc of documents(); track doc.vehicleDocumentId) {
                    <tr>
                      <td><span style="font-size:13px">{{ doc.fileName }}</span></td>
                      <td><app-badge [label]="doc.documentTypeName" variant="info" /></td>
                      <td style="color:var(--text-muted);font-size:13px">{{ formatFileSize(doc.fileSize) }}</td>
                      <td style="color:var(--text-muted);font-size:13px">{{ doc.uploadedAt | date:'dd.MM.yyyy' }}</td>
                      <td>
                        <button class="btn-icon" title="Download" i18n-title="@@vehicles.documents.download" (click)="downloadDoc(doc.documentId)">
                          <lucide-icon [img]="icons.Download" [size]="14" [strokeWidth]="2"></lucide-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
      background: var(--card-bg); color: var(--text-secondary); font-size: 13px;
      font-weight: 500; cursor: pointer; font-family: inherit;
      transition: all 0.15s;
    }
    .back-btn:hover { border-color: var(--border); color: var(--text-primary); }

    .mono { font-family: monospace; }

    /* Breadcrumb */
    .breadcrumb {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 14px; font-size: 13px;
    }
    .breadcrumb a { color: #6366f1; text-decoration: none; font-weight: 500; }
    .breadcrumb a:hover { text-decoration: underline; }
    .bc-sep { color: var(--text-muted); }
    .breadcrumb span:last-child { color: var(--text-secondary); font-weight: 500; }

    /* Underline tab bar */
    .tabs {
      display: flex; gap: 0; flex-wrap: wrap;
      margin-bottom: 20px;
      border-bottom: 2px solid var(--border);
      width: 100%;
    }
    .tab {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 16px; border: none; background: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      font-size: 13px; font-weight: 500;
      color: var(--text-muted); cursor: pointer;
      transition: color 0.15s, border-color 0.2s, background 0.15s;
      white-space: nowrap; font-family: inherit;
    }
    .tab:hover { background: var(--hover-bg); color: var(--text-primary); }
    .tab.active { color: var(--brand); font-weight: 600; border-bottom-color: var(--brand); background: none; }
    .tab-count {
      background: var(--border); color: var(--text-muted);
      border-radius: 10px; padding: 1px 7px;
      font-size: 11px; font-weight: 500;
    }
    .tab.active .tab-count { background: var(--brand-subtle); color: var(--brand); }

    .section-card {
      background: var(--card-bg); border: 1.5px solid var(--border);
      border-radius: 12px; padding: 24px;
    }

    /* Overview grouped layout */
    .overview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .info-group {
      background: var(--card-bg); border: 1.5px solid var(--border);
      border-radius: 12px; overflow: hidden;
    }
    .info-group--full { grid-column: 1 / -1; }
    .info-group-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.6px; color: var(--text-muted);
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      background: var(--subtle-bg);
    }

    /* Key-value grid */
    .kv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .kv-grid--3 { grid-template-columns: repeat(3, 1fr); }
    .kv-row {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    .kv-row:nth-child(odd):not(.kv-full) { border-right: 1px solid var(--border); }
    .kv-full { grid-column: 1 / -1; border-right: none !important; }
    .kv-label {
      font-size: 11px; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .kv-value { font-size: 14px; color: var(--text-primary); word-break: break-all; }

    @media (max-width: 768px) {
      .overview-grid { grid-template-columns: 1fr; }
      .info-group--full { grid-column: 1; }
      .kv-grid--3 { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 600px) {
      .kv-grid { grid-template-columns: 1fr; }
      .kv-grid--3 { grid-template-columns: 1fr; }
      .kv-row:nth-child(odd):not(.kv-full) { border-right: none; }
      .tabs { width: 100%; }
      .tab { font-size: 12px; padding: 8px 10px; }
    }
  `]
})
export class VehicleDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Car, Wrench, Fuel, Users, Shield, ClipboardCheck, TriangleAlert, Siren, FileText, Download };

  readonly tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',     label: $localize`:@@vehicles.detail.tab.overview:Overview`,       icon: Car },
    { id: 'maintenance',  label: $localize`:@@vehicles.detail.tab.maintenance:Maintenance`, icon: Wrench },
    { id: 'fuel',         label: $localize`:@@vehicles.detail.tab.fuel:Fuel`,               icon: Fuel },
    { id: 'assignments',  label: $localize`:@@vehicles.detail.tab.assignments:Assignments`, icon: Users },
    { id: 'insurance',    label: $localize`:@@vehicles.detail.tab.insurance:Insurance`,     icon: Shield },
    { id: 'inspections',  label: $localize`:@@vehicles.detail.tab.inspections:Inspections`, icon: ClipboardCheck },
    { id: 'fines',        label: $localize`:@@vehicles.detail.tab.fines:Fines`,             icon: TriangleAlert },
    { id: 'accidents',    label: $localize`:@@vehicles.detail.tab.accidents:Accidents`,     icon: Siren },
    { id: 'documents',    label: $localize`:@@vehicles.detail.tab.documents:Documents`,     icon: FileText },
  ];

  activeTab  = signal<Tab>('overview');
  vehicle      = signal<Vehicle | null>(null);
  assignments  = signal<VehicleAssignment[]>([]);
  maintenance  = signal<MaintenanceOrder[]>([]);
  fuel         = signal<FuelTransaction[]>([]);
  odometer     = signal<OdometerLog[]>([]);
  insurance    = signal<InsurancePolicy[]>([]);
  registration = signal<RegistrationRecord[]>([]);
  inspections  = signal<Inspection[]>([]);
  fines        = signal<Fine[]>([]);
  accidents    = signal<Accident[]>([]);
  documents    = signal<VehicleDocument[]>([]);
  loading      = signal(true);



  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleApi: VehicleApiService,
    private assignmentApi: VehicleAssignmentApiService,
    private maintenanceApi: MaintenanceOrderApiService,
    private fuelApi: FuelTransactionApiService,
    private odometerApi: OdometerLogApiService,
    private insuranceApi: InsurancePolicyApiService,
    private registrationApi: RegistrationApiService,
    private inspectionApi: InspectionApiService,
    private fineApi: FineApiService,
    private accidentApi: AccidentApiService,
    private documentApi: DocumentApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      vehicle:      this.vehicleApi.getById(id),
      assignments:  this.assignmentApi.getByVehicle(id),
      maintenance:  this.maintenanceApi.getByVehicle(id),
      fuel:         this.fuelApi.getByVehicle(id),
      odometer:     this.odometerApi.getByVehicle(id),
      insurance:    this.insuranceApi.getByVehicle(id),
      registration: this.registrationApi.getByVehicle(id),
      inspections:  this.inspectionApi.getByVehicle(id),
      fines:        this.fineApi.getByVehicle(id),
      accidents:    this.accidentApi.getByVehicle(id),
      documents:    this.documentApi.getVehicleDocuments(id),
    }).subscribe({
      next: r => {
        this.vehicle.set(r.vehicle);
        this.assignments.set(r.assignments);
        this.maintenance.set(r.maintenance);
        this.fuel.set(r.fuel);
        this.odometer.set(r.odometer);
        this.insurance.set(r.insurance);
        this.registration.set(r.registration);
        this.inspections.set(r.inspections);
        this.fines.set(r.fines);
        this.accidents.set(r.accidents);
        this.documents.set(r.documents);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: Tab): void { this.activeTab.set(tab); }

  goBack(): void { this.router.navigate(['/vehicles']); }

  downloadDoc(documentId: number): void { this.documentApi.download(documentId); }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onDocumentUploaded(_doc: Document): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.documentApi.getVehicleDocuments(id).subscribe(docs => this.documents.set(docs));
  }

  statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'active':          return 'success';
      case 'service':         return 'warning';
      case 'out_of_service':  return 'danger';
      default:                return 'neutral';
    }
  }

  getCount(tab: Tab): number {
    switch (tab) {
      case 'maintenance':  return this.maintenance().length;
      case 'fuel':         return this.fuel().length;
      case 'assignments':  return this.assignments().length;
      case 'insurance':    return this.insurance().length;
      case 'inspections':  return this.inspections().length;
      case 'fines':        return this.fines().length;
      case 'accidents':    return this.accidents().length;
      case 'documents':    return this.documents().length;
      default:             return 0;
    }
  }
}
