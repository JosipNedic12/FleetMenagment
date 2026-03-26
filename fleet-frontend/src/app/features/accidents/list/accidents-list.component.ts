import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccidentApiService, VehicleApiService, DriverApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, TriangleAlert } from 'lucide-angular';
import { Accident, CreateAccidentDto, Vehicle, Driver } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';

@Component({
  selector: 'app-accidents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, VehicleLabelComponent, EuNumberPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@accidents.title">Accidents</h1>
          <p class="page-subtitle" i18n="@@accidents.subtitle">{{ filtered().length }} incidents reported</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search vehicle, description…" i18n-placeholder="@@accidents.searchPlaceholder" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true" i18n="@@accidents.reportBtn">+ Report Accident</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"   (click)="filter.set('all')"   i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'minor'" (click)="filter.set('minor')" i18n="@@COMMON.CHIPS.MINOR">Minor</button>
        <button [class.active]="filter() === 'major'" (click)="filter.set('major')" i18n="@@COMMON.CHIPS.MAJOR">Major</button>
        <button [class.active]="filter() === 'total'" (click)="filter.set('total')" i18n="@@COMMON.CHIPS.TOTAL_LOSS">Total Loss</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading" i18n="@@accidents.loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty" i18n="@@accidents.empty">No accidents found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th i18n="@@accidents.colVehicle">Vehicle</th>
                <th i18n="@@accidents.colDriver">Driver</th>
                <th i18n="@@accidents.colOccurred">Occurred</th>
                <th i18n="@@accidents.colSeverity">Severity</th>
                <th i18n="@@accidents.colDescription">Description</th>
                <th i18n="@@accidents.colDamageEst">Damage Est.</th>
                <th i18n="@@accidents.colPoliceReport">Police Report</th>
                <th i18n="@@accidents.colActions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.accidentId) {
                <tr (click)="goToDetail(row)">
                  <td><app-vehicle-label [make]="row.vehicleMake" [model]="row.vehicleModel" [registration]="row.registrationNumber" /></td>
                  <td>{{ row.driverName ?? '—' }}</td>
                  <td>{{ row.occurredAt | date:'dd.MM.yyyy' }}</td>
                  <td>
                    <app-badge
                      [label]="severityLabel(row.severity)"
                      [variant]="row.severity === 'minor' ? 'warning' : 'danger'"
                    />
                  </td>
                  <td class="notes-cell">{{ row.description }}</td>
                  <td>{{ row.damageEstimate != null ? (row.damageEstimate | euNumber:'1.2-2') + ' €' : '—' }}</td>
                  <td class="mono">{{ row.policeReport ?? '—' }}</td>
                  <td class="actions">
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" (click)="$event.stopPropagation(); startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="'Admin'" class="btn-icon danger" (click)="$event.stopPropagation(); confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
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
          @if (editId) {
            <h2 class="modal-title" i18n="@@accidents.editAccident">Edit Accident</h2>
          } @else {
            <h2 class="modal-title" i18n="@@accidents.reportAccident">Report Accident</h2>
          }
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@accidents.formVehicle">Vehicle *</label>
              <app-search-select
                [items]="vehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                placeholder="Select vehicle…"
                i18n-placeholder="@@accidents.formVehiclePlaceholder"
                [disabled]="!!editId"
                [(ngModel)]="form.vehicleId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@accidents.formDriver">Driver</label>
              <app-search-select
                [items]="drivers()"
                [displayFn]="driverDisplayFn"
                valueField="driverId"
                placeholder="Unknown"
                i18n-placeholder="@@accidents.formDriverPlaceholder"
                [(ngModel)]="form.driverId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@accidents.formOccurredAt">Occurred At *</label>
              <input type="datetime-local" [(ngModel)]="form.occurredAt" />
            </div>
            <div class="form-group">
              <label i18n="@@accidents.formSeverity">Severity *</label>
              <select [(ngModel)]="form.severity">
                <option value="minor" i18n="@@COMMON.CHIPS.MINOR">Minor</option>
                <option value="major" i18n="@@COMMON.CHIPS.MAJOR">Major</option>
                <option value="total" i18n="@@COMMON.CHIPS.TOTAL_LOSS">Total Loss</option>
              </select>
            </div>
            @if (form.severity === 'total') {
              <div class="form-group span-2 total-warning">
                <lucide-icon [img]="icons.TriangleAlert" [size]="14" [strokeWidth]="2"></lucide-icon> <strong i18n="@@accidents.totalLossWarning">Total loss</strong> <span i18n="@@accidents.totalLossWarningDetail"> will automatically retire the vehicle.</span>
              </div>
            }
            <div class="form-group span-2">
              <label i18n="@@accidents.formDescription">Description *</label>
              <textarea [(ngModel)]="form.description" rows="3" placeholder="Describe what happened…" i18n-placeholder="@@accidents.formDescriptionPlaceholder"></textarea>
            </div>
            <div class="form-group">
              <label i18n="@@accidents.formDamageEstimate">Damage Estimate (EUR)</label>
              <input type="number" [(ngModel)]="form.damageEstimate" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label i18n="@@accidents.formPoliceReport">Police Report #</label>
              <input [(ngModel)]="form.policeReport" placeholder="PP-ZG-2025-0001" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@accidents.formNotes">Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()" i18n="@@accidents.cancelBtn">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              @if (saving()) { <span i18n="@@accidents.saving">Saving…</span> }
              @else if (editId) { <span i18n="@@accidents.update">Update</span> }
              @else { <span i18n="@@accidents.report">Report</span> }
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Accident Record"
      i18n-title="@@accidents.deleteTitle"
      message="Delete this accident record? This cannot be undone."
      i18n-message="@@accidents.deleteMessage"
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    .total-warning {
      background: #fff7ed; border: 1px solid #fed7aa;
      border-radius: 8px; padding: 10px 14px;
      font-size: 13px; color: #92400e;
    }
    tbody tr { cursor:pointer; transition:background 0.12s; }
    tbody tr:hover { background:var(--hover-bg); }
  `]
})
export class AccidentsListComponent implements OnInit {
  readonly icons = { Eye, Pencil, Trash2, TriangleAlert };

  private readonly chipLabels: Record<string, string> = {
    minor: $localize`:@@COMMON.CHIPS.MINOR:Minor`,
    major: $localize`:@@COMMON.CHIPS.MAJOR:Major`,
    total: $localize`:@@COMMON.CHIPS.TOTAL_LOSS:Total Loss`,
  };
  severityLabel(s: string): string { return this.chipLabels[s] ?? s; }

  readonly vehicleDisplayFn = (v: Vehicle) => `${v.make} ${v.model} – ${v.registrationNumber}`;
  readonly driverDisplayFn  = (d: Driver)  => d.fullName;
  accidents = signal<Accident[]>([]);
  vehicles  = signal<Vehicle[]>([]);
  drivers   = signal<Driver[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = signal(''); showForm = false; editId: number | null = null;
  deleteTarget: Accident | null = null;
  filter = signal<'all' | 'minor' | 'major' | 'total'>('all');
  form: CreateAccidentDto = this.emptyForm();

  filtered = computed(() => {
    let list = this.accidents();
    if (this.filter() !== 'all') list = list.filter(a => a.severity === this.filter());
    const q = this.search().toLowerCase();
    if (q) list = list.filter(a =>
      a.registrationNumber.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
    return list;
  });

  private router = inject(Router);

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

  goToDetail(row: Accident): void { this.router.navigate(['/accidents', row.accidentId]); }

  confirmDelete(row: Accident): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.accidentId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }
  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }
  private emptyForm(): CreateAccidentDto {
    return { vehicleId: 0, occurredAt: '', severity: 'minor', description: '' };
  }
}