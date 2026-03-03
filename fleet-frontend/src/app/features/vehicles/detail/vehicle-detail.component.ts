import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
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
} from '../../../core/auth/feature-api.services';
import {
  Vehicle, VehicleAssignment, MaintenanceOrder,
  FuelTransaction, OdometerLog, InsurancePolicy,
  RegistrationRecord, Inspection, Fine, Accident,
} from '../../../core/models/models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <a routerLink="/vehicles" class="back-link">← Vehicles</a>
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
        <!-- Info cards row -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">VIN</div>
            <div class="info-value mono">{{ vehicle()!.vin }}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Color</div>
            <div class="info-value">{{ vehicle()!.color || '—' }}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Odometer</div>
            <div class="info-value">{{ vehicle()!.currentOdometerKm | number }} km</div>
          </div>
          <div class="info-card">
            <div class="info-label">Notes</div>
            <div class="info-value">{{ vehicle()!.notes || '—' }}</div>
          </div>
        </div>

        <!-- Assignments -->
        <div class="section-card">
          <h2 class="section-title">Assignments <span class="count-badge">{{ assignments().length }}</span></h2>
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

        <!-- Maintenance Orders -->
        <div class="section-card">
          <h2 class="section-title">Maintenance Orders <span class="count-badge">{{ maintenance().length }}</span></h2>
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
                      [variant]="r.status === 'closed' ? 'success' : r.status === 'in_progress' ? 'warning' : r.status === 'cancelled' ? 'neutral' : 'neutral'" /></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Fuel Transactions -->
        <div class="section-card">
          <h2 class="section-title">Fuel Transactions <span class="count-badge">{{ fuel().length }}</span></h2>
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

        <!-- Odometer Logs -->
        <div class="section-card">
          <h2 class="section-title">Odometer Readings <span class="count-badge">{{ odometer().length }}</span></h2>
          @if (odometer().length === 0) {
            <div class="table-empty">No odometer readings.</div>
          } @else {
            <table class="table">
              <thead><tr><th>Date</th><th>Reading (km)</th><th>Notes</th></tr></thead>
              <tbody>
                @for (r of odometer(); track r.logId) {
                  <tr>
                    <td>{{ r.logDate | date:'dd.MM.yyyy' }}</td>
                    <td>{{ r.odometerKm | number }}</td>
                    <td>{{ r.notes || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Insurance -->
        <div class="section-card">
          <h2 class="section-title">Insurance Policies <span class="count-badge">{{ insurance().length }}</span></h2>
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

        <!-- Registration -->
        <div class="section-card">
          <h2 class="section-title">Registration Records <span class="count-badge">{{ registration().length }}</span></h2>
          @if (registration().length === 0) {
            <div class="table-empty">No registration records.</div>
          } @else {
            <table class="table">
              <thead><tr><th>Reg #</th><th>Valid From</th><th>Valid To</th><th>Fee</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>
                @for (r of registration(); track r.registrationId) {
                  <tr>
                    <td class="mono">{{ r.registrationNumber }}</td>
                    <td>{{ r.validFrom | date:'dd.MM.yyyy' }}</td>
                    <td>{{ r.validTo | date:'dd.MM.yyyy' }}</td>
                    <td>{{ r.fee != null ? (r.fee | number:'1.2-2') + ' €' : '—' }}</td>
                    <td>{{ r.notes || '—' }}</td>
                    <td><app-badge [label]="r.isActive ? 'Active' : 'Expired'" [variant]="r.isActive ? 'success' : 'danger'" /></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Inspections -->
        <div class="section-card">
          <h2 class="section-title">Inspections <span class="count-badge">{{ inspections().length }}</span></h2>
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

        <!-- Fines -->
        <div class="section-card">
          <h2 class="section-title">Fines <span class="count-badge">{{ fines().length }}</span></h2>
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

        <!-- Accidents -->
        <div class="section-card">
          <h2 class="section-title">Accidents <span class="count-badge">{{ accidents().length }}</span></h2>
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
    </div>
  `,
  styles: [`
    .back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
    .back-link:hover { color: #111827; }
    .mono { font-family: monospace; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .info-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
    .info-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .info-value { font-size: 15px; color: #111827; word-break: break-all; }
    .section-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .section-title { font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 14px; display: flex; align-items: center; gap: 8px; }
    .count-badge { background: #f3f4f6; color: #6b7280; border-radius: 10px; padding: 1px 8px; font-size: 12px; font-weight: 500; }
  `]
})
export class VehicleDetailComponent implements OnInit {
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
  loading      = signal(true);

  constructor(
    private route: ActivatedRoute,
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
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
