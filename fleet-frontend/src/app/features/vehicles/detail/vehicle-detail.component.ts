import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, ArrowLeft, Car, Wrench, Fuel, Users, Shield, ClipboardCheck, TriangleAlert, Siren, FileText } from 'lucide-angular';
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
  RegistrationRecord, Inspection, Fine, Accident, Document,
} from '../../../core/models/models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { DocumentListComponent } from '../../../shared/components/document-list/document-list.component';

type Tab = 'overview' | 'maintenance' | 'fuel' | 'assignments' | 'insurance' | 'inspections' | 'fines' | 'accidents' | 'documents';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent, LucideAngularModule, FileUploadComponent, DocumentListComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            Vehicles
          </button>
          <div>
            @if (vehicle()) {
              <h1 class="page-title">{{ vehicle()!.make }} {{ vehicle()!.model }} · <span class="mono">{{ vehicle()!.registrationNumber }}</span></h1>
              <p class="page-subtitle">{{ vehicle()!.year }} · {{ vehicle()!.category }} · {{ vehicle()!.fuelType }}</p>
            } @else {
              <h1 class="page-title">Vehicle Detail</h1>
            }
          </div>
        </div>
        @if (vehicle()) {
          <app-badge
            [label]="vehicle()!.status"
            [variant]="vehicle()!.status === 'active' ? 'success' : vehicle()!.status === 'service' ? 'warning' : 'neutral'"
          />
        }
      </div>

      @if (loading()) {
        <div class="table-loading">Loading…</div>
      } @else if (!vehicle()) {
        <div class="table-empty">Vehicle not found.</div>
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
          <div class="section-card">
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Registration Number</span>
                <span class="kv-value mono">{{ vehicle()!.registrationNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Make</span>
                <span class="kv-value">{{ vehicle()!.make }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Model</span>
                <span class="kv-value">{{ vehicle()!.model }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Year</span>
                <span class="kv-value">{{ vehicle()!.year }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Category</span>
                <span class="kv-value">{{ vehicle()!.category }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Fuel Type</span>
                <span class="kv-value">{{ vehicle()!.fuelType }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">VIN</span>
                <span class="kv-value mono">{{ vehicle()!.vin || '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Color</span>
                <span class="kv-value">{{ vehicle()!.color || '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Status</span>
                <span class="kv-value">
                  <app-badge
                    [label]="vehicle()!.status"
                    [variant]="vehicle()!.status === 'active' ? 'success' : vehicle()!.status === 'service' ? 'warning' : 'neutral'"
                  />
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Odometer</span>
                <span class="kv-value">{{ vehicle()!.currentOdometerKm | number }} km</span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label">Notes</span>
                <span class="kv-value">{{ vehicle()!.notes || '—' }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Maintenance -->
        @if (activeTab() === 'maintenance') {
          <div class="section-card">
            @if (maintenance().length === 0) {
              <div class="table-empty">No maintenance orders.</div>
            } @else {
              <table class="table">
                <thead><tr><th>Reported</th><th>Vendor</th><th>Description</th><th>Cost</th><th>Status</th></tr></thead>
                <tbody>
                  @for (r of maintenance(); track r.orderId) {
                    <tr>
                      <td>{{ r.reportedAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.vendorName || '—' }}</td>
                      <td>{{ r.description || '—' }}</td>
                      <td>{{ r.totalCost != null ? (r.totalCost | number:'1.2-2') + ' €' : '—' }}</td>
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
              <div class="table-empty">No fuel transactions.</div>
            } @else {
              <table class="table">
                <thead><tr><th>Date</th><th>Litres</th><th>Price/L</th><th>Total</th><th>Odometer</th><th>Fuel Type</th></tr></thead>
                <tbody>
                  @for (r of fuel(); track r.transactionId) {
                    <tr>
                      <td>{{ r.postedAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.liters != null ? (r.liters | number:'1.2-2') : '—' }}</td>
                      <td>{{ r.pricePerLiter != null ? (r.pricePerLiter | number:'1.3-3') : '—' }}</td>
                      <td>{{ r.totalCost | number:'1.2-2' }} €</td>
                      <td>{{ r.odometerKm != null ? (r.odometerKm | number) + ' km' : '—' }}</td>
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
              <div class="table-empty">No assignments.</div>
            } @else {
              <table class="table">
                <thead><tr><th>Driver</th><th>From</th><th>To</th><th>Notes</th><th>Status</th></tr></thead>
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
              <div class="table-empty">No insurance policies.</div>
            } @else {
              <table class="table">
                <thead><tr><th>Policy #</th><th>Insurer</th><th>Valid From</th><th>Valid To</th><th>Premium</th><th>Coverage</th><th>Status</th></tr></thead>
                <tbody>
                  @for (r of insurance(); track r.policyId) {
                    <tr>
                      <td class="mono">{{ r.policyNumber }}</td>
                      <td>{{ r.insurer }}</td>
                      <td>{{ r.validFrom | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.validTo | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.premium | number:'1.2-2' }} €</td>
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
              <div class="table-empty">No inspections.</div>
            } @else {
              <table class="table">
                <thead><tr><th>Date</th><th>Result</th><th>Valid To</th><th>Odometer</th><th>Notes</th><th>Status</th></tr></thead>
                <tbody>
                  @for (r of inspections(); track r.inspectionId) {
                    <tr>
                      <td>{{ r.inspectedAt | date:'dd.MM.yyyy' }}</td>
                      <td><app-badge [label]="r.result"
                        [variant]="r.result === 'passed' ? 'success' : r.result === 'failed' ? 'danger' : 'warning'" /></td>
                      <td>{{ r.validTo ? (r.validTo | date:'dd.MM.yyyy') : '—' }}</td>
                      <td>{{ r.odometerKm != null ? (r.odometerKm | number) + ' km' : '—' }}</td>
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
              <div class="table-empty">No fines.</div>
            } @else {
              <table class="table">
                <thead><tr><th>Date</th><th>Driver</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  @for (r of fines(); track r.fineId) {
                    <tr>
                      <td>{{ r.occurredAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.driverName || '—' }}</td>
                      <td>{{ r.reason }}</td>
                      <td>{{ r.amount | number:'1.2-2' }} €</td>
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
              <div class="table-empty">No accidents.</div>
            } @else {
              <table class="table">
                <thead><tr><th>Date</th><th>Driver</th><th>Severity</th><th>Damage Est.</th><th>Police Report</th><th>Description</th></tr></thead>
                <tbody>
                  @for (r of accidents(); track r.accidentId) {
                    <tr>
                      <td>{{ r.occurredAt | date:'dd.MM.yyyy' }}</td>
                      <td>{{ r.driverName || '—' }}</td>
                      <td><app-badge [label]="r.severity"
                        [variant]="r.severity === 'minor' ? 'warning' : r.severity === 'major' ? 'danger' : 'neutral'" /></td>
                      <td>{{ r.damageEstimate != null ? (r.damageEstimate | number:'1.2-2') + ' €' : '—' }}</td>
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
            <app-document-list
              #docList
              [entityType]="'Vehicle'"
              [entityId]="vehicle()!.vehicleId"
            />
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
      background: white; color: var(--text-secondary); font-size: 13px;
      font-weight: 500; cursor: pointer; font-family: inherit;
      transition: all 0.15s;
    }
    .back-btn:hover { border-color: #cbd5e1; color: var(--text-primary); }

    .mono { font-family: monospace; }

    .tabs {
      display: flex; gap: 4px; flex-wrap: wrap;
      margin-bottom: 20px; background: #f8fafc;
      border-radius: 10px; padding: 4px; width: fit-content; max-width: 100%;
    }
    .tab {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: none; background: none;
      border-radius: 8px; font-size: 13px; font-weight: 500;
      color: var(--text-muted); cursor: pointer;
      transition: all 0.15s; white-space: nowrap; font-family: inherit;
    }
    .tab:hover { background: white; color: var(--text-primary); }
    .tab.active { background: white; color: var(--brand); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .tab-count {
      background: #e2e8f0; color: #64748b;
      border-radius: 10px; padding: 1px 7px;
      font-size: 11px; font-weight: 500;
    }
    .tab.active .tab-count { background: #ede9fe; color: var(--brand); }

    .section-card {
      background: #fff; border: 1.5px solid #f1f5f9;
      border-radius: 12px; padding: 24px;
    }

    /* Overview key-value grid */
    .kv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .kv-row {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .kv-row:nth-child(odd):not(.kv-full) { border-right: 1px solid #f1f5f9; }
    .kv-full { grid-column: 1 / -1; }
    .kv-label {
      font-size: 11px; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .kv-value { font-size: 14px; color: var(--text-primary); word-break: break-all; }

    @media (max-width: 600px) {
      .kv-grid { grid-template-columns: 1fr; }
      .kv-row:nth-child(odd):not(.kv-full) { border-right: none; }
      .tabs { width: 100%; }
      .tab { font-size: 12px; padding: 7px 10px; }
    }
  `]
})
export class VehicleDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Car, Wrench, Fuel, Users, Shield, ClipboardCheck, TriangleAlert, Siren, FileText };

  readonly tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',     label: 'Overview',    icon: Car },
    { id: 'maintenance',  label: 'Maintenance',  icon: Wrench },
    { id: 'fuel',         label: 'Fuel',         icon: Fuel },
    { id: 'assignments',  label: 'Assignments',  icon: Users },
    { id: 'insurance',    label: 'Insurance',    icon: Shield },
    { id: 'inspections',  label: 'Inspections',  icon: ClipboardCheck },
    { id: 'fines',        label: 'Fines',        icon: TriangleAlert },
    { id: 'accidents',    label: 'Accidents',    icon: Siren },
    { id: 'documents',    label: 'Documents',    icon: FileText },
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
  documents    = signal<Document[]>([]);
  loading      = signal(true);

  @ViewChild('docList') docList?: DocumentListComponent;

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
      documents:    this.documentApi.getByEntity('Vehicle', id),
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

  onDocumentUploaded(doc: Document): void {
    this.documents.update(docs => [doc, ...docs]);
    this.docList?.loadDocuments();
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
