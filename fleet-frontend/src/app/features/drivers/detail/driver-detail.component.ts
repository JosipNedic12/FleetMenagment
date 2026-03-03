import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  DriverApiService,
  VehicleAssignmentApiService,
  FineApiService,
  AccidentApiService,
} from '../../../core/auth/feature-api.services';
import {
  Driver, VehicleAssignment, Fine, Accident,
} from '../../../core/models/models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-driver-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <a routerLink="/drivers" class="back-link">← Drivers</a>
          <div>
            @if (driver()) {
              <h1 class="page-title">{{ driver()!.fullName }}</h1>
              <p class="page-subtitle">{{ driver()!.department ?? 'No department' }} · License: <span class="mono">{{ driver()!.licenseNumber }}</span></p>
            } @else {
              <h1 class="page-title">Driver Detail</h1>
            }
          </div>
        </div>
        @if (driver()) {
          <app-badge
            [label]="driver()!.licenseExpired ? 'License Expired' : 'License Valid'"
            [variant]="driver()!.licenseExpired ? 'danger' : 'success'"
          />
        }
      </div>

      @if (loading()) {
        <div class="table-loading">Loading…</div>
      } @else if (!driver()) {
        <div class="table-empty">Driver not found.</div>
      } @else {
        <!-- Info cards -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">License Expiry</div>
            <div class="info-value" [class.expired-text]="driver()!.licenseExpired">
              {{ driver()!.licenseExpiry | date:'dd.MM.yyyy' }}
            </div>
          </div>
          <div class="info-card">
            <div class="info-label">License Categories</div>
            <div class="info-value">
              @for (cat of driver()!.licenseCategories; track cat) {
                <span class="cat-chip">{{ cat }}</span>
              }
              @if (driver()!.licenseCategories.length === 0) { — }
            </div>
          </div>
          <div class="info-card">
            <div class="info-label">Department</div>
            <div class="info-value">{{ driver()!.department || '—' }}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Notes</div>
            <div class="info-value">{{ driver()!.notes || '—' }}</div>
          </div>
        </div>

        <!-- Assignments -->
        <div class="section-card">
          <h2 class="section-title">Vehicle Assignments <span class="count-badge">{{ assignments().length }}</span></h2>
          @if (assignments().length === 0) {
            <div class="table-empty">No assignments.</div>
          } @else {
            <table class="table">
              <thead><tr><th>Vehicle</th><th>From</th><th>To</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>
                @for (r of assignments(); track r.assignmentId) {
                  <tr>
                    <td><a [routerLink]="['/vehicles', r.vehicleId]" class="link">{{ r.registrationNumber }}</a></td>
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

        <!-- Fines -->
        <div class="section-card">
          <h2 class="section-title">Fines <span class="count-badge">{{ fines().length }}</span></h2>
          @if (fines().length === 0) {
            <div class="table-empty">No fines.</div>
          } @else {
            <table class="table">
              <thead><tr><th>Date</th><th>Vehicle</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                @for (r of fines(); track r.fineId) {
                  <tr>
                    <td>{{ r.occurredAt | date:'dd.MM.yyyy' }}</td>
                    <td><a [routerLink]="['/vehicles', r.vehicleId]" class="link">{{ r.registrationNumber }}</a></td>
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
              <thead><tr><th>Date</th><th>Vehicle</th><th>Severity</th><th>Damage Est.</th><th>Police Report</th><th>Description</th></tr></thead>
              <tbody>
                @for (r of accidents(); track r.accidentId) {
                  <tr>
                    <td>{{ r.occurredAt | date:'dd.MM.yyyy' }}</td>
                    <td><a [routerLink]="['/vehicles', r.vehicleId]" class="link">{{ r.registrationNumber }}</a></td>
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
    .expired-text { color: #dc2626; font-weight: 600; }
    .cat-chip { display:inline-block; background:#e0f2fe; color:#0369a1; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:600; margin:0 2px; }
    .link { color: #2563eb; text-decoration: none; }
    .link:hover { text-decoration: underline; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .info-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
    .info-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .info-value { font-size: 15px; color: #111827; }
    .section-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .section-title { font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 14px; display: flex; align-items: center; gap: 8px; }
    .count-badge { background: #f3f4f6; color: #6b7280; border-radius: 10px; padding: 1px 8px; font-size: 12px; font-weight: 500; }
  `]
})
export class DriverDetailComponent implements OnInit {
  driver      = signal<Driver | null>(null);
  assignments = signal<VehicleAssignment[]>([]);
  fines       = signal<Fine[]>([]);
  accidents   = signal<Accident[]>([]);
  loading     = signal(true);

  constructor(
    private route: ActivatedRoute,
    private driverApi: DriverApiService,
    private assignmentApi: VehicleAssignmentApiService,
    private fineApi: FineApiService,
    private accidentApi: AccidentApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      driver:      this.driverApi.getById(id),
      assignments: this.assignmentApi.getByDriver(id),
      fines:       this.fineApi.getByDriver(id),
      accidents:   this.accidentApi.getByDriver(id),
    }).subscribe({
      next: r => {
        this.driver.set(r.driver);
        this.assignments.set(r.assignments);
        this.fines.set(r.fines);
        this.accidents.set(r.accidents);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
