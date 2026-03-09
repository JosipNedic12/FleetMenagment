import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, ArrowLeft, IdCard, Users, TriangleAlert, Siren } from 'lucide-angular';
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

type Tab = 'overview' | 'assignments' | 'fines' | 'accidents';

@Component({
  selector: 'app-driver-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent, LucideAngularModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            Drivers
          </button>
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
                <span class="kv-label">Full Name</span>
                <span class="kv-value">{{ driver()!.fullName }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">License Number</span>
                <span class="kv-value mono">{{ driver()!.licenseNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">License Expiry</span>
                <span class="kv-value" [class.expired-text]="driver()!.licenseExpired">
                  {{ driver()!.licenseExpiry | date:'dd.MM.yyyy' }}
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Department</span>
                <span class="kv-value">{{ driver()!.department || '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">License Status</span>
                <span class="kv-value">
                  <app-badge
                    [label]="driver()!.licenseExpired ? 'Expired' : 'Valid'"
                    [variant]="driver()!.licenseExpired ? 'danger' : 'success'"
                  />
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">License Categories</span>
                <span class="kv-value">
                  @for (cat of driver()!.licenseCategories; track cat) {
                    <span class="cat-chip">{{ cat }}</span>
                  }
                  @if (driver()!.licenseCategories.length === 0) { — }
                </span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label">Notes</span>
                <span class="kv-value">{{ driver()!.notes || '—' }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Assignments -->
        @if (activeTab() === 'assignments') {
          <div class="section-card">
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
        }

        <!-- Fines -->
        @if (activeTab() === 'fines') {
          <div class="section-card">
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
        }

        <!-- Accidents -->
        @if (activeTab() === 'accidents') {
          <div class="section-card">
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
    .expired-text { color: #dc2626; font-weight: 600; }
    .cat-chip { display:inline-block; background:#e0f2fe; color:#0369a1; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:600; margin:0 2px; }
    .link { color: #2563eb; text-decoration: none; }
    .link:hover { text-decoration: underline; }

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
export class DriverDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, IdCard, Users, TriangleAlert, Siren };

  readonly tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',    label: 'Overview',    icon: IdCard },
    { id: 'assignments', label: 'Assignments', icon: Users },
    { id: 'fines',       label: 'Fines',       icon: TriangleAlert },
    { id: 'accidents',   label: 'Accidents',   icon: Siren },
  ];

  activeTab   = signal<Tab>('overview');
  driver      = signal<Driver | null>(null);
  assignments = signal<VehicleAssignment[]>([]);
  fines       = signal<Fine[]>([]);
  accidents   = signal<Accident[]>([]);
  loading     = signal(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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

  setTab(tab: Tab): void { this.activeTab.set(tab); }

  goBack(): void { this.router.navigate(['/drivers']); }

  getCount(tab: Tab): number {
    switch (tab) {
      case 'assignments': return this.assignments().length;
      case 'fines':       return this.fines().length;
      case 'accidents':   return this.accidents().length;
      default:            return 0;
    }
  }
}
