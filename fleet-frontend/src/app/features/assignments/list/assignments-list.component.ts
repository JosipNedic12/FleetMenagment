import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleAssignmentApiService, VehicleApiService, DriverApiService } from '../../../core/auth/feature-api.services';
import { VehicleAssignment, CreateVehicleAssignmentDto, UpdateVehicleAssignmentDto, Vehicle, Driver } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-assignments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Vehicle Assignments</h1>
          <p class="page-subtitle">{{ filtered().length }} assignments · {{ activeCount() }} active</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [(ngModel)]="search" placeholder="Search vehicle, driver…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()">+ Assign Vehicle</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"    (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'active'" (click)="filter.set('active')">Active</button>
        <button [class.active]="filter() === 'ended'"  (click)="filter.set('ended')">Ended</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty">No assignments found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Department</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.assignmentId) {
                <tr>
                  <td><strong class="mono">{{ row.registrationNumber }}</strong><br><small>{{ row.vehicleMake }} {{ row.vehicleModel }}</small></td>
                  <td>{{ row.driverFullName }}</td>
                  <td>{{ row.department ?? '—' }}</td>
                  <td>{{ row.assignedFrom | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.assignedTo ? (row.assignedTo | date:'dd.MM.yyyy') : '—' }}</td>
                  <td>
                    <app-badge
                      [label]="row.isActive ? 'Active' : 'Ended'"
                      [variant]="row.isActive ? 'success' : 'neutral'"
                    />
                  </td>
                  <td class="notes-cell">{{ row.notes ?? '—' }}</td>
                  <td class="actions">
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" (click)="startEdit(row)">✏️</button>
                    @if (row.isActive) {
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon warning" title="End Assignment" (click)="endAssignment(row)">⏹</button>
                    }
                    <button *hasRole="'Admin'" class="btn-icon danger" title="Delete" (click)="confirmDelete(row)">🗑</button>
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
          <h2 class="modal-title">Assign Vehicle</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Vehicle *</label>
              <select [(ngModel)]="createForm.vehicleId">
                <option [ngValue]="0">Select vehicle…</option>
                @for (v of vehicles(); track v.vehicleId) {
                  <option [ngValue]="v.vehicleId">{{ v.registrationNumber }} – {{ v.make }} {{ v.model }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Driver *</label>
              <select [(ngModel)]="createForm.driverId">
                <option [ngValue]="0">Select driver…</option>
                @for (d of drivers(); track d.driverId) {
                  <option [ngValue]="d.driverId">{{ d.fullName }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>From *</label>
              <input type="date" [(ngModel)]="createForm.assignedFrom" />
            </div>
            <div class="form-group">
              <label>To (leave blank = open-ended)</label>
              <input type="date" [(ngModel)]="createForm.assignedTo" />
            </div>
            <div class="form-group span-2">
              <label>Notes</label>
              <textarea [(ngModel)]="createForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreate()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveCreate()">
              {{ saving() ? 'Saving…' : 'Assign' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" style="max-width:400px" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Edit Assignment</h2>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label>End Date</label>
              <input type="date" [(ngModel)]="editForm.assignedTo" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="editForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeEdit()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
              {{ saving() ? 'Saving…' : 'Update' }}
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Assignment"
      message="Delete this assignment record? This cannot be undone."
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`.notes-cell { max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .mono { font-family:monospace; } .btn-icon.warning { color:#d97706; } small { color:var(--text-muted); font-size:11px; }`]
})
export class AssignmentsListComponent implements OnInit {
  assignments = signal<VehicleAssignment[]>([]);
  vehicles    = signal<Vehicle[]>([]);
  drivers     = signal<Driver[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = ''; showCreate = false; showEdit = false;
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
    const q = this.search.toLowerCase();
    if (q) list = list.filter(a =>
      a.registrationNumber.toLowerCase().includes(q) ||
      a.driverFullName.toLowerCase().includes(q)
    );
    return list;
  });

  constructor(
    private api: VehicleAssignmentApiService,
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
    this.api.end(row.assignmentId).subscribe({ next: () => this.load() });
  }

  confirmDelete(row: VehicleAssignment): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.assignmentId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; }
    });
  }

  private emptyCreateForm(): CreateVehicleAssignmentDto {
    return { vehicleId: 0, driverId: 0, assignedFrom: new Date().toISOString().slice(0, 10) };
  }
}
