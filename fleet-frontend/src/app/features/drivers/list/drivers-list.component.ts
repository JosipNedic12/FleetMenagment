import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverApiService, EmployeeApiService, LookupApiService } from '../../../core/auth/feature-api.services';
import { Driver, CreateDriverDto, UpdateDriverDto, Employee, LicenseCategoryDto } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Drivers</h1>
          <p class="page-subtitle">{{ filtered().length }} drivers · {{ expiredCount() }} expired licenses</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [(ngModel)]="search" placeholder="Search name, license#…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()">+ Add Driver</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"     (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'valid'"   (click)="filter.set('valid')">Valid License</button>
        <button [class.active]="filter() === 'expired'" (click)="filter.set('expired')">Expired</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty">No drivers found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>License #</th>
                <th>Expiry</th>
                <th>Categories</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.driverId) {
                <tr>
                  <td><strong>{{ row.fullName }}</strong></td>
                  <td>{{ row.department ?? '—' }}</td>
                  <td class="mono">{{ row.licenseNumber }}</td>
                  <td>
                    <span [class.expired-text]="row.licenseExpired">
                      {{ row.licenseExpiry | date:'dd.MM.yyyy' }}
                    </span>
                    @if (row.licenseExpired) {
                      <app-badge label="Expired" variant="danger" />
                    }
                  </td>
                  <td>
                    @for (cat of row.licenseCategories; track cat) {
                      <span class="cat-chip">{{ cat }}</span>
                    }
                  </td>
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

    <!-- Create Modal -->
    @if (showCreate) {
      <div class="modal-overlay" (click)="closeCreate()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Add Driver</h2>
          <div class="form-grid">
            <div class="form-group span-2">
              <label>Employee *</label>
              <select [(ngModel)]="createForm.employeeId">
                <option [ngValue]="0">Select employee…</option>
                @for (e of availableEmployees(); track e.employeeId) {
                  <option [ngValue]="e.employeeId">{{ e.firstName }} {{ e.lastName }} {{ e.department ? '(' + e.department + ')' : '' }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>License # *</label>
              <input [(ngModel)]="createForm.licenseNumber" placeholder="HR-1234567" />
            </div>
            <div class="form-group">
              <label>License Expiry *</label>
              <input type="date" [(ngModel)]="createForm.licenseExpiry" />
            </div>
            <div class="form-group span-2">
              <label>License Categories</label>
              <div class="checkbox-group">
                @for (cat of licenseCategories(); track cat.licenseCategoryId) {
                  <label class="checkbox-label">
                    <input type="checkbox"
                      [checked]="createForm.licenseCategoryIds.includes(cat.licenseCategoryId)"
                      (change)="toggleCreateCategory(cat.licenseCategoryId, $event)" />
                    {{ cat.code }}{{ cat.description ? ' – ' + cat.description : '' }}
                  </label>
                }
              </div>
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
              {{ saving() ? 'Saving…' : 'Add Driver' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Edit Driver</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>License #</label>
              <input [(ngModel)]="editForm.licenseNumber" />
            </div>
            <div class="form-group">
              <label>License Expiry</label>
              <input type="date" [(ngModel)]="editForm.licenseExpiry" />
            </div>
            <div class="form-group span-2">
              <label>License Categories</label>
              <div class="checkbox-group">
                @for (cat of licenseCategories(); track cat.licenseCategoryId) {
                  <label class="checkbox-label">
                    <input type="checkbox"
                      [checked]="editForm.licenseCategoryIds?.includes(cat.licenseCategoryId)"
                      (change)="toggleEditCategory(cat.licenseCategoryId, $event)" />
                    {{ cat.code }}{{ cat.description ? ' – ' + cat.description : '' }}
                  </label>
                }
              </div>
            </div>
            <div class="form-group span-2">
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
      title="Delete Driver"
      message="Delete this driver profile? This cannot be undone."
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    .expired-text { color: #dc2626; }
    .cat-chip { display:inline-block; background:#e0f2fe; color:#0369a1; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:600; margin:0 2px; }
    .checkbox-group { display:flex; flex-wrap:wrap; gap:8px; }
    .checkbox-label { display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; }
    .mono { font-family:monospace; }
  `]
})
export class DriversListComponent implements OnInit {
  drivers          = signal<Driver[]>([]);
  employees        = signal<Employee[]>([]);
  licenseCategories = signal<LicenseCategoryDto[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = ''; showCreate = false; showEdit = false;
  editId: number | null = null;
  deleteTarget: Driver | null = null;
  filter = signal<'all' | 'valid' | 'expired'>('all');

  createForm: CreateDriverDto = this.emptyCreateForm();
  editForm: UpdateDriverDto = {};

  expiredCount = computed(() => this.drivers().filter(d => d.licenseExpired).length);
  availableEmployees = computed(() => this.employees().filter(e => !e.hasDriverProfile));

  filtered = computed(() => {
    let list = this.drivers();
    if (this.filter() === 'valid')   list = list.filter(d => !d.licenseExpired);
    if (this.filter() === 'expired') list = list.filter(d => d.licenseExpired);
    const q = this.search.toLowerCase();
    if (q) list = list.filter(d =>
      d.fullName.toLowerCase().includes(q) ||
      d.licenseNumber.toLowerCase().includes(q)
    );
    return list;
  });

  constructor(
    private api: DriverApiService,
    private employeeApi: EmployeeApiService,
    private lookupApi: LookupApiService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.load();
    this.employeeApi.getAll().subscribe(e => this.employees.set(e));
    this.lookupApi.getLicenseCategories().subscribe(c => this.licenseCategories.set(c));
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: d => { this.drivers.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.createForm = this.emptyCreateForm();
    this.formError.set('');
    this.showCreate = true;
  }

  toggleCreateCategory(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.createForm.licenseCategoryIds = [...this.createForm.licenseCategoryIds, id];
    } else {
      this.createForm.licenseCategoryIds = this.createForm.licenseCategoryIds.filter(x => x !== id);
    }
  }

  toggleEditCategory(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.editForm.licenseCategoryIds ?? [];
    this.editForm = {
      ...this.editForm,
      licenseCategoryIds: checked ? [...current, id] : current.filter(x => x !== id)
    };
  }

  saveCreate(): void {
    if (!this.createForm.employeeId || !this.createForm.licenseNumber || !this.createForm.licenseExpiry) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.create(this.createForm).subscribe({
      next: () => { this.load(); this.closeCreate(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeCreate(): void { this.showCreate = false; this.formError.set(''); }

  startEdit(row: Driver): void {
    this.editId = row.driverId;
    const catIds = this.licenseCategories()
      .filter(c => row.licenseCategories.includes(c.code))
      .map(c => c.licenseCategoryId);
    this.editForm = { licenseNumber: row.licenseNumber, licenseExpiry: row.licenseExpiry.slice(0, 10), licenseCategoryIds: catIds, notes: row.notes };
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

  confirmDelete(row: Driver): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.driverId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; }
    });
  }

  private emptyCreateForm(): CreateDriverDto {
    return { employeeId: 0, licenseNumber: '', licenseExpiry: '', licenseCategoryIds: [] };
  }
}
