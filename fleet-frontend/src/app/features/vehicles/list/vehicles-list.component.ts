import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VehicleApiService, LookupApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, Car as CarIcon } from 'lucide-angular';
import { Vehicle, CreateVehicleDto, UpdateVehicleDto, MakeDto, ModelDto, VehicleCategoryDto, FuelTypeDto } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';

type VehicleStatus = 'active' | 'service' | 'retired' | 'sold';

@Component({
  selector: 'app-vehicles-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, VehicleLabelComponent, EuNumberPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@vehicles.list.title">Vehicles</h1>
          <p class="page-subtitle" i18n="@@vehicles.list.subtitle">{{ filtered().length }} vehicles</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search reg#, make, model…" i18n-placeholder="@@vehicles.list.searchPlaceholder" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()" i18n="@@vehicles.list.addButton">+ Add Vehicle</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"     (click)="filter.set('all')" i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'active'"  (click)="filter.set('active')" i18n="@@COMMON.CHIPS.ACTIVE">Active</button>
        <button [class.active]="filter() === 'service'" (click)="filter.set('service')" i18n="@@COMMON.CHIPS.SERVICE">Service</button>
        <button [class.active]="filter() === 'retired'" (click)="filter.set('retired')" i18n="@@COMMON.CHIPS.RETIRED">Retired</button>
        <button [class.active]="filter() === 'sold'"    (click)="filter.set('sold')" i18n="@@COMMON.CHIPS.SOLD">Sold</button>
      </div>

      <div class="table-card">
        @if (loading()) {
          <div class="skeleton-header"></div>
          @for (i of skeletonRows; track i) {
            <div class="skeleton-row">
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-40"></div>
              <div class="skeleton-cell w-16"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-32"></div>
              <div class="skeleton-cell w-16"></div>
              <div class="skeleton-cell w-16"></div>
            </div>
          }
        } @else if (sorted().length === 0) {
          <div class="table-empty-state">
            <div class="empty-icon">
              <lucide-icon [img]="icons.CarIcon" [size]="44" [strokeWidth]="1.3"></lucide-icon>
            </div>
            <h3 i18n="@@vehicles.empty.title">No vehicles found</h3>
            <p i18n="@@vehicles.empty.hint">Try adjusting your search or filter, or add your first vehicle.</p>
            <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()" i18n="@@vehicles.list.addButton">+ Add Vehicle</button>
          </div>
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th class="sortable" [class.sort-asc]="sortCol()==='make'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='make'&&sortDir()==='desc'" (click)="sort('make')" i18n="@@vehicles.table.vehicle">Vehicle</th>
                <th class="sortable" [class.sort-asc]="sortCol()==='year'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='year'&&sortDir()==='desc'" (click)="sort('year')" i18n="@@vehicles.table.year">Year</th>
                <th i18n="@@vehicles.table.category">Category</th>
                <th i18n="@@vehicles.table.fuel">Fuel</th>
                <th class="sortable" [class.sort-asc]="sortCol()==='odo'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='odo'&&sortDir()==='desc'" (click)="sort('odo')" i18n="@@vehicles.table.odometer">Odometer</th>
                <th i18n="@@vehicles.table.status">Status</th>
                <th i18n="@@vehicles.table.actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of sorted(); track row.vehicleId) {
                <tr>
                  <td><app-vehicle-label [make]="row.make" [model]="row.model" [registration]="row.registrationNumber" /></td>
                  <td>{{ row.year }}</td>
                  <td>{{ row.category }}</td>
                  <td>{{ row.fuelType }}</td>
                  <td>{{ row.currentOdometerKm | euNumber }} km</td>
                  <td>
                    <app-badge
                      [label]="statusLabel(row.status)"
                      [variant]="row.status === 'active' ? 'success' : row.status === 'service' ? 'warning' : 'neutral'"
                    />
                  </td>
                  <td class="actions">
                    <a [routerLink]="['/vehicles', row.vehicleId]" class="btn-icon" title="View" i18n-title="@@vehicles.action.view"><lucide-icon [img]="icons.Eye" [size]="15" [strokeWidth]="2"></lucide-icon></a>
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" i18n-title="@@vehicles.action.edit" (click)="startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="'Admin'" class="btn-icon danger" title="Delete" i18n-title="@@vehicles.action.delete" (click)="confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
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
          <h2 class="modal-title" i18n="@@vehicles.create.title">Add Vehicle</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@vehicles.create.regNumber">Registration # *</label>
              <input [(ngModel)]="createForm.registrationNumber" placeholder="ZG-1234-AB" i18n-placeholder="@@vehicles.create.regNumberPlaceholder" style="text-transform:uppercase" />
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.create.vin">VIN *</label>
              <input [(ngModel)]="createForm.vin" placeholder="17-char VIN" i18n-placeholder="@@vehicles.create.vinPlaceholder" style="text-transform:uppercase" />
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.create.make">Make *</label>
              <select [(ngModel)]="createForm.makeId" (ngModelChange)="onMakeChange($event)">
                <option [ngValue]="0" i18n="@@vehicles.create.selectMake">Select make…</option>
                @for (m of makes(); track m.makeId) {
                  <option [ngValue]="m.makeId">{{ m.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.create.model">Model *</label>
              <select [(ngModel)]="createForm.modelId" [disabled]="!createForm.makeId">
                <option [ngValue]="0" i18n="@@vehicles.create.selectModel">Select model…</option>
                @for (m of models(); track m.modelId) {
                  <option [ngValue]="m.modelId">{{ m.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.create.category">Category *</label>
              <select [(ngModel)]="createForm.categoryId">
                <option [ngValue]="0" i18n="@@vehicles.create.selectCategory">Select category…</option>
                @for (c of categories(); track c.categoryId) {
                  <option [ngValue]="c.categoryId">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.create.fuelType">Fuel Type *</label>
              <select [(ngModel)]="createForm.fuelTypeId">
                <option [ngValue]="0" i18n="@@vehicles.create.selectFuelType">Select fuel type…</option>
                @for (f of fuelTypes(); track f.fuelTypeId) {
                  <option [ngValue]="f.fuelTypeId">{{ f.label }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.create.year">Year *</label>
              <input type="number" [(ngModel)]="createForm.year" min="1990" [max]="currentYear" />
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.create.color">Color</label>
              <input [(ngModel)]="createForm.color" placeholder="White, Black…" i18n-placeholder="@@vehicles.create.colorPlaceholder" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@vehicles.create.notes">Notes</label>
              <textarea [(ngModel)]="createForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreate()" i18n="@@vehicles.action.cancel">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveCreate()">
              @if (saving()) { <span class="btn-spinner"></span><ng-container i18n="@@vehicles.action.saving"> Saving… </ng-container> } @else { <ng-container i18n="@@vehicles.create.submit">Add Vehicle</ng-container> }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" style="max-width:420px" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@vehicles.edit.title">Edit Vehicle</h2>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label i18n="@@vehicles.edit.status">Status</label>
              <select [(ngModel)]="editForm.status">
                <option value="active" i18n="@@COMMON.CHIPS.ACTIVE">Active</option>
                <option value="service" i18n="@@COMMON.CHIPS.SERVICE">Service</option>
                <option value="retired" i18n="@@COMMON.CHIPS.RETIRED">Retired</option>
                <option value="sold" i18n="@@COMMON.CHIPS.SOLD">Sold</option>
              </select>
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.edit.color">Color</label>
              <input [(ngModel)]="editForm.color" placeholder="White, Black…" i18n-placeholder="@@vehicles.create.colorPlaceholder" />
            </div>
            <div class="form-group">
              <label i18n="@@vehicles.edit.notes">Notes</label>
              <textarea [(ngModel)]="editForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeEdit()" i18n="@@vehicles.action.cancel">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
              @if (saving()) { <span class="btn-spinner"></span><ng-container i18n="@@vehicles.action.saving"> Saving… </ng-container> } @else { <ng-container i18n="@@vehicles.edit.submit">Update</ng-container> }
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
  readonly icons = { Eye, Pencil, Trash2, CarIcon };

  private readonly chipLabels: Record<string, string> = {
    active:  $localize`:@@COMMON.CHIPS.ACTIVE:Active`,
    service: $localize`:@@COMMON.CHIPS.SERVICE:Service`,
    retired: $localize`:@@COMMON.CHIPS.RETIRED:Retired`,
    sold:    $localize`:@@COMMON.CHIPS.SOLD:Sold`,
  };
  statusLabel(s: string): string { return this.chipLabels[s] ?? s; }

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
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  sortCol = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');

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

  sorted = computed(() => {
    const col = this.sortCol();
    const dir = this.sortDir();
    if (!col) return this.filtered();
    return [...this.filtered()].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (col === 'reg')  { va = a.registrationNumber; vb = b.registrationNumber; }
      if (col === 'make') { va = a.make + a.model;      vb = b.make + b.model; }
      if (col === 'year') { va = a.year;                vb = b.year; }
      if (col === 'odo')  { va = a.currentOdometerKm;   vb = b.currentOdometerKm; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  sort(col: string): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
  }

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

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.showCreate) { this.closeCreate(); return; }
    if (this.showEdit)   { this.closeEdit();   return; }
  }

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
