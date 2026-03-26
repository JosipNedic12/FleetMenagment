import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VehicleAssignmentApiService, VehicleApiService, DriverApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2 } from 'lucide-angular';
import { VehicleAssignment, CreateVehicleAssignmentDto, UpdateVehicleAssignmentDto, Vehicle, Driver } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';

@Component({
  selector: 'app-assignments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, VehicleLabelComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@assignments.list.title">Vehicle Assignments</h1>
          <p class="page-subtitle" i18n="@@assignments.list.subtitle">{{ filtered().length }} assignments · {{ activeCount() }} active</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" i18n-placeholder="@@assignments.list.searchPlaceholder" placeholder="Search vehicle, driver…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()" i18n="@@assignments.list.assignBtn">+ Assign Vehicle</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"    (click)="filter.set('all')" i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'active'" (click)="filter.set('active')" i18n="@@COMMON.CHIPS.ACTIVE">Active</button>
        <button [class.active]="filter() === 'ended'"  (click)="filter.set('ended')" i18n="@@COMMON.CHIPS.ENDED">Ended</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading" i18n="@@assignments.list.loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty" i18n="@@assignments.list.empty">No assignments found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th i18n="@@assignments.list.colVehicle">Vehicle</th>
                <th i18n="@@assignments.list.colDriver">Driver</th>
                <th i18n="@@assignments.list.colDepartment">Department</th>
                <th i18n="@@assignments.list.colFrom">From</th>
                <th i18n="@@assignments.list.colTo">To</th>
                <th i18n="@@assignments.list.colStatus">Status</th>
                <th i18n="@@assignments.list.colNotes">Notes</th>
                <th i18n="@@assignments.list.colActions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.assignmentId) {
                <tr (click)="goToDetail(row)">
                  <td><app-vehicle-label [make]="row.vehicleMake" [model]="row.vehicleModel" [registration]="row.registrationNumber" /></td>
                  <td>{{ row.driverFullName }}</td>
                  <td>{{ row.department ?? '—' }}</td>
                  <td>{{ row.assignedFrom | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.assignedTo ? (row.assignedTo | date:'dd.MM.yyyy') : '—' }}</td>
                  <td>
                    <app-badge
                      [label]="row.isActive ? activeLabel : endedLabel"
                      [variant]="row.isActive ? 'success' : 'neutral'"
                    />
                  </td>
                  <td class="notes-cell">{{ row.notes ?? '—' }}</td>
                  <td class="actions">
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" i18n-title="@@assignments.list.actionEdit" title="Edit" (click)="$event.stopPropagation(); startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    @if (row.isActive) {
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon warning" i18n-title="@@assignments.list.actionEnd" title="End Assignment" (click)="$event.stopPropagation(); endAssignment(row)">⏹</button>
                    }
                    <button *hasRole="'Admin'" class="btn-icon danger" i18n-title="@@assignments.list.actionDelete" title="Delete" (click)="$event.stopPropagation(); confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- Create Modal -->
    @if (showCreate) {
      <div class="modal-overlay" (click)="closeCreate()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@assignments.create.title">Assign Vehicle</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@assignments.create.labelVehicle">Vehicle *</label>
              <app-search-select
                [items]="assignableVehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                i18n-placeholder="@@assignments.create.vehiclePlaceholder"
                placeholder="Select vehicle…"
                [(ngModel)]="createForm.vehicleId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@assignments.create.labelDriver">Driver *</label>
              <app-search-select
                [items]="drivers()"
                [displayFn]="driverDisplayFn"
                valueField="driverId"
                i18n-placeholder="@@assignments.create.driverPlaceholder"
                placeholder="Select driver…"
                [(ngModel)]="createForm.driverId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@assignments.create.labelFrom">From *</label>
              <input type="date" [(ngModel)]="createForm.assignedFrom" />
            </div>
            <div class="form-group">
              <label i18n="@@assignments.create.labelTo">To (leave blank = open-ended)</label>
              <input type="date" [(ngModel)]="createForm.assignedTo" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@assignments.create.labelNotes">Notes</label>
              <textarea [(ngModel)]="createForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreate()" i18n="@@assignments.create.cancelBtn">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveCreate()">
              @if (saving()) { <ng-container i18n="@@assignments.create.savingBtn">Saving…</ng-container> } @else { <ng-container i18n="@@assignments.create.assignBtn">Assign</ng-container> }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" style="max-width:400px" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@assignments.edit.title">Edit Assignment</h2>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label i18n="@@assignments.edit.labelEndDate">End Date</label>
              <input type="date" [(ngModel)]="editForm.assignedTo" />
            </div>
            <div class="form-group">
              <label i18n="@@assignments.edit.labelNotes">Notes</label>
              <textarea [(ngModel)]="editForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeEdit()" i18n="@@assignments.edit.cancelBtn">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
              @if (saving()) { <ng-container i18n="@@assignments.edit.savingBtn">Saving…</ng-container> } @else { <ng-container i18n="@@assignments.edit.updateBtn">Update</ng-container> }
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      i18n-title="@@assignments.delete.title"
      title="Delete Assignment"
      i18n-message="@@assignments.delete.message"
      message="Delete this assignment record? This cannot be undone."
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`.btn-icon.warning { color:#d97706; } small { color:var(--text-muted); font-size:11px; }
    tbody tr { cursor:pointer; transition:background 0.12s; }
    tbody tr:hover { background:var(--hover-bg); }`]
})
export class AssignmentsListComponent implements OnInit {
  readonly icons = { Eye, Pencil, Trash2 };
  activeLabel = $localize`:@@COMMON.CHIPS.ACTIVE:Active`;
  endedLabel  = $localize`:@@COMMON.CHIPS.ENDED:Ended`;
  readonly vehicleDisplayFn = (v: Vehicle) => `${v.make} ${v.model} – ${v.registrationNumber}`;
  readonly driverDisplayFn  = (d: Driver)  => d.fullName;
  private api = inject(VehicleAssignmentApiService);
  private vehicleApi = inject(VehicleApiService);
  private driverApi = inject(DriverApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  assignments = signal<VehicleAssignment[]>([]);
  vehicles    = signal<Vehicle[]>([]);
  assignableVehicles = computed(() =>
    this.vehicles().filter(v => v.status !== 'retired' && v.status !== 'sold')
  );
  drivers     = signal<Driver[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = signal(''); showCreate = false; showEdit = false;
  editId: number | null = null;
  deleteTarget: VehicleAssignment | null = null;
  filter = signal<'all' | 'active' | 'ended'>('all');

  createForm: CreateVehicleAssignmentDto = this.emptyCreateForm();
  editForm: UpdateVehicleAssignmentDto = {};

  activeCount = computed(() => this.assignments().filter(a => a.isActive).length);
  filtered = computed(() => {
    let list = this.assignments();
    if (this.filter() === 'active') list = list.filter(a => a.isActive);
    if (this.filter() === 'ended')  list = list.filter(a => !a.isActive);
    const q = this.search().toLowerCase();
    if (q) list = list.filter(a =>
      a.registrationNumber.toLowerCase().includes(q) ||
      a.driverFullName.toLowerCase().includes(q)
    );
    return list;
  });

  ngOnInit(): void {
    this.load();
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
    this.driverApi.getAll().subscribe(d => this.drivers.set(d));
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: d => { this.assignments.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.createForm = this.emptyCreateForm();
    this.formError.set('');
    this.showCreate = true;
  }

  saveCreate(): void {
    if (!this.createForm.vehicleId || !this.createForm.driverId || !this.createForm.assignedFrom) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.create({ ...this.createForm, assignedTo: this.createForm.assignedTo || undefined }).subscribe({
      next: () => { this.load(); this.closeCreate(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeCreate(): void { this.showCreate = false; this.formError.set(''); }

  startEdit(row: VehicleAssignment): void {
    this.editId = row.assignmentId;
    this.editForm = { assignedTo: row.assignedTo?.slice(0, 10), notes: row.notes };
    this.formError.set('');
    this.showEdit = true;
  }

  saveEdit(): void {
    if (!this.editId) return;
    this.saving.set(true);
    this.api.update(this.editId, this.editForm).subscribe({
      next: () => { this.load(); this.closeEdit(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.editId = null; this.formError.set(''); }

  endAssignment(row: VehicleAssignment): void {
    this.api.end(row.assignmentId).subscribe({ next: () => this.load(), error: () => {} });
  }

  goToDetail(row: VehicleAssignment): void { this.router.navigate(['/assignments', row.assignmentId]); }

  confirmDelete(row: VehicleAssignment): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.assignmentId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }

  private emptyCreateForm(): CreateVehicleAssignmentDto {
    return { vehicleId: 0, driverId: 0, assignedFrom: new Date().toISOString().slice(0, 10) };
  }
}
