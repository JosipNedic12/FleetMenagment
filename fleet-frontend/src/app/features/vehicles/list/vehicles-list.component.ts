import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VehicleApiService, LookupApiService } from '../../../core/auth/feature-api.services';
import { Vehicle, CreateVehicleDto, UpdateVehicleDto, MakeDto, ModelDto, VehicleCategoryDto, FuelTypeDto } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

type VehicleStatus = 'active' | 'service' | 'retired' | 'sold';

@Component({
  selector: 'app-vehicles-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Vehicles</h1>
          <p class="page-subtitle">{{ filtered().length }} vehicles</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search reg#, make, model…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()">+ Add Vehicle</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"     (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'active'"  (click)="filter.set('active')">Active</button>
        <button [class.active]="filter() === 'service'" (click)="filter.set('service')">Service</button>
        <button [class.active]="filter() === 'retired'" (click)="filter.set('retired')">Retired</button>
        <button [class.active]="filter() === 'sold'"    (click)="filter.set('sold')">Sold</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty">No vehicles found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th>Reg#</th>
                <th>Make / Model</th>
                <th>Year</th>
                <th>Category</th>
                <th>Fuel</th>
                <th>Odometer</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.vehicleId) {
                <tr>
                  <td><strong class="mono">{{ row.registrationNumber }}</strong></td>
                  <td>{{ row.make }} {{ row.model }}</td>
                  <td>{{ row.year }}</td>
                  <td>{{ row.category }}</td>
                  <td>{{ row.fuelType }}</td>
                  <td>{{ row.currentOdometerKm | number }} km</td>
                  <td>
                    <app-badge
                      [label]="row.status"
                      [variant]="row.status === 'active' ? 'success' : row.status === 'service' ? 'warning' : 'neutral'"
                    />
                  </td>
                  <td class="actions">
                    <a [routerLink]="['/vehicles', row.vehicleId]" class="btn-icon" title="View">🔍</a>
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" (click)="startEdit(row)">✏️</button>
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
          <h2 class="modal-title">Add Vehicle</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Registration # *</label>
              <input [(ngModel)]="createForm.registrationNumber" placeholder="ZG-1234-AB" style="text-transform:uppercase" />
            </div>
            <div class="form-group">
              <label>VIN *</label>
              <input [(ngModel)]="createForm.vin" placeholder="17-char VIN" style="text-transform:uppercase" />
            </div>
            <div class="form-group">
              <label>Make *</label>
              <select [(ngModel)]="createForm.makeId" (ngModelChange)="onMakeChange($event)">
                <option [ngValue]="0">Select make…</option>
                @for (m of makes(); track m.makeId) {
                  <option [ngValue]="m.makeId">{{ m.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Model *</label>
              <select [(ngModel)]="createForm.modelId" [disabled]="!createForm.makeId">
                <option [ngValue]="0">Select model…</option>
                @for (m of models(); track m.modelId) {
                  <option [ngValue]="m.modelId">{{ m.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Category *</label>
              <select [(ngModel)]="createForm.categoryId">
                <option [ngValue]="0">Select category…</option>
                @for (c of categories(); track c.categoryId) {
                  <option [ngValue]="c.categoryId">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Fuel Type *</label>
              <select [(ngModel)]="createForm.fuelTypeId">
                <option [ngValue]="0">Select fuel type…</option>
                @for (f of fuelTypes(); track f.fuelTypeId) {
                  <option [ngValue]="f.fuelTypeId">{{ f.label }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Year *</label>
              <input type="number" [(ngModel)]="createForm.year" min="1990" [max]="currentYear" />
            </div>
            <div class="form-group">
              <label>Color</label>
              <input [(ngModel)]="createForm.color" placeholder="White, Black…" />
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
              {{ saving() ? 'Saving…' : 'Add Vehicle' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" style="max-width:420px" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Edit Vehicle</h2>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label>Status</label>
              <select [(ngModel)]="editForm.status">
                <option value="active">Active</option>
                <option value="service">In Service</option>
                <option value="retired">Retired</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div class="form-group">
              <label>Color</label>
              <input [(ngModel)]="editForm.color" placeholder="White, Black…" />
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
      title="Delete Vehicle"
      [message]="'Delete vehicle ' + (deleteTarget?.registrationNumber ?? '') + '? This cannot be undone.'"
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: []
})
export class VehiclesListComponent implements OnInit {
  private api = inject(VehicleApiService);
  private lookupApi = inject(LookupApiService);
  auth = inject(AuthService);

  vehicles   = signal<Vehicle[]>([]);
  makes      = signal<MakeDto[]>([]);
  models     = signal<ModelDto[]>([]);
  categories = signal<VehicleCategoryDto[]>([]);
  fuelTypes  = signal<FuelTypeDto[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = signal(''); showCreate = false; showEdit = false;
  editId: number | null = null;
  deleteTarget: Vehicle | null = null;
  filter = signal<'all' | VehicleStatus>('all');
  readonly currentYear = new Date().getFullYear();

  createForm: CreateVehicleDto = this.emptyCreateForm();
  editForm: UpdateVehicleDto = {};

  filtered = computed(() => {
    let list = this.vehicles();
    if (this.filter() !== 'all') list = list.filter(v => v.status === this.filter());
    const q = this.search().toLowerCase();
    if (q) list = list.filter(v =>
      v.registrationNumber.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
    return list;
  });

  ngOnInit(): void {
    this.load();
    this.lookupApi.getVehicleCategories().subscribe(c => this.categories.set(c));
    this.lookupApi.getFuelTypes().subscribe(f => this.fuelTypes.set(f));
    this.lookupApi.getMakes().subscribe(m => this.makes.set(m));
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: d => { this.vehicles.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onMakeChange(makeId: number): void {
    this.createForm.modelId = 0;
    this.models.set([]);
    if (makeId) this.lookupApi.getModelsByMake(makeId).subscribe(m => this.models.set(m));
  }

  openCreate(): void {
    this.createForm = this.emptyCreateForm();
    this.formError.set('');
    this.showCreate = true;
  }

  saveCreate(): void {
    if (!this.createForm.registrationNumber || !this.createForm.vin || !this.createForm.makeId || !this.createForm.modelId || !this.createForm.categoryId || !this.createForm.fuelTypeId || !this.createForm.year) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.create(this.createForm).subscribe({
      next: () => { this.load(); this.closeCreate(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeCreate(): void { this.showCreate = false; this.formError.set(''); }

  startEdit(row: Vehicle): void {
    this.editId = row.vehicleId;
    this.editForm = { color: row.color, status: row.status, notes: row.notes };
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

  confirmDelete(row: Vehicle): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.vehicleId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }

  private emptyCreateForm(): CreateVehicleDto {
    return { registrationNumber: '', vin: '', makeId: 0, modelId: 0, categoryId: 0, fuelTypeId: 0, year: this.currentYear };
  }
}
