import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccidentApiService, VehicleApiService, DriverApiService } from '../../../core/auth/feature-api.services';
import { Accident, CreateAccidentDto, Vehicle, Driver } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-accidents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Accidents</h1>
          <p class="page-subtitle">{{ filtered().length }} incidents reported</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [(ngModel)]="search" placeholder="Search vehicle, description…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true">+ Report Accident</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"   (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'minor'" (click)="filter.set('minor')">Minor</button>
        <button [class.active]="filter() === 'major'" (click)="filter.set('major')">Major</button>
        <button [class.active]="filter() === 'total'" (click)="filter.set('total')">Total Loss</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty">No accidents found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Occurred</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Damage Est.</th>
                <th>Police Report</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.accidentId) {
                <tr>
                  <td><strong>{{ row.registrationNumber }}</strong></td>
                  <td>{{ row.driverName ?? '—' }}</td>
                  <td>{{ row.occurredAt | date:'dd.MM.yyyy' }}</td>
                  <td>
                    <app-badge
                      [label]="row.severity"
                      [variant]="row.severity === 'minor' ? 'warning' : 'danger'"
                    />
                  </td>
                  <td class="notes-cell">{{ row.description }}</td>
                  <td>{{ row.damageEstimate != null ? (row.damageEstimate | currency:'EUR':'symbol':'1.2-2') : '—' }}</td>
                  <td class="mono">{{ row.policeReport ?? '—' }}</td>
                  <td class="actions">
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" (click)="startEdit(row)">✏️</button>
                    <button *hasRole="'Admin'" class="btn-icon danger" (click)="confirmDelete(row)">🗑</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    @if (showForm) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">{{ editId ? 'Edit Accident' : 'Report Accident' }}</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Vehicle *</label>
              <select [(ngModel)]="form.vehicleId" [disabled]="!!editId">
                <option [ngValue]="0">Select vehicle…</option>
                @for (v of vehicles(); track v.vehicleId) {
                  <option [ngValue]="v.vehicleId">{{ v.registrationNumber }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Driver</label>
              <select [(ngModel)]="form.driverId">
                <option [ngValue]="undefined">Unknown</option>
                @for (d of drivers(); track d.driverId) {
                  <option [ngValue]="d.driverId">{{ d.fullName }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Occurred At *</label>
              <input type="datetime-local" [(ngModel)]="form.occurredAt" />
            </div>
            <div class="form-group">
              <label>Severity *</label>
              <select [(ngModel)]="form.severity">
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="total">Total Loss</option>
              </select>
            </div>
            @if (form.severity === 'total') {
              <div class="form-group span-2 total-warning">
                ⚠️ <strong>Total loss</strong> will automatically retire the vehicle.
              </div>
            }
            <div class="form-group span-2">
              <label>Description *</label>
              <textarea [(ngModel)]="form.description" rows="3" placeholder="Describe what happened…"></textarea>
            </div>
            <div class="form-group">
              <label>Damage Estimate (EUR)</label>
              <input type="number" [(ngModel)]="form.damageEstimate" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Police Report #</label>
              <input [(ngModel)]="form.policeReport" placeholder="PP-ZG-2025-0001" />
            </div>
            <div class="form-group span-2">
              <label>Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : editId ? 'Update' : 'Report' }}
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Accident Record"
      message="Delete this accident record? This cannot be undone."
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    .notes-cell { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .total-warning {
      background: #fff7ed; border: 1px solid #fed7aa;
      border-radius: 8px; padding: 10px 14px;
      font-size: 13px; color: #92400e;
    }
  `]
})
export class AccidentsListComponent implements OnInit {
  accidents = signal<Accident[]>([]);
  vehicles  = signal<Vehicle[]>([]);
  drivers   = signal<Driver[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = ''; showForm = false; editId: number | null = null;
  deleteTarget: Accident | null = null;
  filter = signal<'all' | 'minor' | 'major' | 'total'>('all');
  form: CreateAccidentDto = this.emptyForm();

  filtered = computed(() => {
    let list = this.accidents();
    if (this.filter() !== 'all') list = list.filter(a => a.severity === this.filter());
    const q = this.search.toLowerCase();
    if (q) list = list.filter(a =>
      a.registrationNumber.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
    return list;
  });

  constructor(
    private api: AccidentApiService,
    private vehicleApi: VehicleApiService,
    private driverApi: DriverApiService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.load();
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
    this.driverApi.getAll().subscribe(d => this.drivers.set(d));
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: d => { this.accidents.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  startEdit(row: Accident): void {
    this.editId = row.accidentId;
    this.form = {
      vehicleId: row.vehicleId, driverId: row.driverId,
      occurredAt: row.occurredAt.slice(0, 16), severity: row.severity,
      description: row.description, damageEstimate: row.damageEstimate,
      policeReport: row.policeReport, notes: row.notes
    };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.vehicleId || !this.form.occurredAt || !this.form.description) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    const obs = this.editId
      ? this.api.update(this.editId, this.form)
      : this.api.create(this.form);
    obs.subscribe({
      next: () => { this.load(); this.closeForm(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  confirmDelete(row: Accident): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.accidentId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; }
    });
  }
  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }
  private emptyForm(): CreateAccidentDto {
    return { vehicleId: 0, occurredAt: '', severity: 'minor', description: '' };
  }
}