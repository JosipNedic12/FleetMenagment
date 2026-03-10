import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaintenanceOrderApiService, VehicleApiService, VendorApiService, LookupApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, Check, X, Play, Plus, Wrench as WrenchIcon } from 'lucide-angular';
import {
  MaintenanceOrder, CreateMaintenanceOrderDto, UpdateMaintenanceOrderDto,
  CloseMaintenanceOrderDto, CancelMaintenanceOrderDto,
  MaintenanceItem, CreateMaintenanceItemDto,
  Vehicle, Vendor, MaintenanceTypeDto
} from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

type OrderStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Maintenance Orders</h1>
          <p class="page-subtitle">{{ filtered().length }} orders · {{ openCount() }} open</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search vehicle, vendor…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()">+ New Order</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"         (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'open'"        (click)="filter.set('open')">Open</button>
        <button [class.active]="filter() === 'in_progress'" (click)="filter.set('in_progress')">In Progress</button>
        <button [class.active]="filter() === 'closed'"      (click)="filter.set('closed')">Closed</button>
        <button [class.active]="filter() === 'cancelled'"   (click)="filter.set('cancelled')">Cancelled</button>
      </div>

      <div class="table-card">
        @if (loading()) {
          <div class="skeleton-header"></div>
          @for (i of skeletonRows; track i) {
            <div class="skeleton-row">
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-32"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-16"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-16"></div>
            </div>
          }
        } @else if (sorted().length === 0) {
          <div class="table-empty-state">
            <div class="empty-icon">
              <lucide-icon [img]="icons.WrenchIcon" [size]="44" [strokeWidth]="1.3"></lucide-icon>
            </div>
            <h3>No maintenance orders found</h3>
            <p>Try adjusting your search or filter, or create a new order.</p>
            <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()">+ New Order</button>
          </div>
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th class="sortable" [class.sort-asc]="sortCol()==='reg'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='reg'&&sortDir()==='desc'" (click)="sort('reg')">Vehicle</th>
                <th class="sortable" [class.sort-asc]="sortCol()==='vendor'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='vendor'&&sortDir()==='desc'" (click)="sort('vendor')">Vendor</th>
                <th>Status</th>
                <th class="sortable" [class.sort-asc]="sortCol()==='reported'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='reported'&&sortDir()==='desc'" (click)="sort('reported')">Reported</th>
                <th>Scheduled</th>
                <th>Items</th>
                <th class="sortable" [class.sort-asc]="sortCol()==='cost'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='cost'&&sortDir()==='desc'" (click)="sort('cost')">Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of sorted(); track row.orderId) {
                <tr>
                  <td><strong class="mono">{{ row.registrationNumber }}</strong></td>
                  <td>{{ row.vendorName ?? '—' }}</td>
                  <td>
                    <app-badge [label]="statusLabel(row.status)" [variant]="statusVariant(row.status)" />
                  </td>
                  <td>{{ row.reportedAt | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.scheduledAt ? (row.scheduledAt | date:'dd.MM.yyyy') : '—' }}</td>
                  <td>{{ row.items.length }}</td>
                  <td>{{ row.totalCost != null ? (row.totalCost | currency:'EUR':'symbol':'1.2-2') : '—' }}</td>
                  <td class="actions">
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" (click)="startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    @if (row.status === 'open') {
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon start-btn" title="Start order" (click)="startOrder(row)"><lucide-icon [img]="icons.Play" [size]="14" [strokeWidth]="2"></lucide-icon></button>
                    }
                    @if (row.status === 'in_progress') {
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon close-btn" title="Close order" (click)="openClose(row)"><lucide-icon [img]="icons.Check" [size]="15" [strokeWidth]="2.5"></lucide-icon></button>
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon warning-btn" title="Cancel order" (click)="openCancel(row)"><lucide-icon [img]="icons.X" [size]="15" [strokeWidth]="2.5"></lucide-icon></button>
                    }
                    @if (row.status === 'open' || row.status === 'in_progress') {
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Add item" (click)="openAddItem(row)"><lucide-icon [img]="icons.Plus" [size]="15" [strokeWidth]="2.5"></lucide-icon></button>
                    }
                  </td>
                </tr>
                @if (row.items.length > 0) {
                  <tr class="items-row">
                    <td colspan="8">
                      <div class="items-list">
                        @for (item of row.items; track item.itemId) {
                          <span class="item-chip">
                            {{ item.maintenanceTypeName }}
                            ({{ item.totalCost | currency:'EUR':'symbol':'1.0-0' }})
                            <button *hasRole="['Admin','FleetManager']" class="item-del" title="Remove" (click)="deleteItem(item)">×</button>
                          </span>
                        }
                      </div>
                    </td>
                  </tr>
                }
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
          <h2 class="modal-title">New Maintenance Order</h2>
          <div class="form-grid">
            <div class="form-group">
            <label>Vehicle *</label>
            <select [(ngModel)]="createForm.vehicleId" (ngModelChange)="onCreateVehicleChange($event)">
              <option [ngValue]="0">Select vehicle…</option>
              @for (v of vehicles(); track v.vehicleId) {
                <option [ngValue]="v.vehicleId">{{ v.registrationNumber }} – {{ v.make }} {{ v.model }}</option>
              }
            </select>
          </div>
            <div class="form-group">
              <label>Vendor *</label>
              <select [(ngModel)]="createForm.vendorId">
                <option [ngValue]="0">Select vendor…</option>
                @for (v of vendors(); track v.vendorId) {
                  <option [ngValue]="v.vendorId">{{ v.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Scheduled At *</label>
              <input type="datetime-local" [(ngModel)]="createForm.scheduledAt" />
            </div>
            <div class="form-group">
              <label>Odometer (km)</label>
              <input type="number" [(ngModel)]="createForm.odometerKm" [readonly]="true" />
            </div>
            <div class="form-group span-2">
              <label>Description *</label>
              <textarea [(ngModel)]="createForm.description" rows="3" placeholder="Describe the maintenance needed…"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreate()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveCreate()">
              @if (saving()) { <span class="btn-spinner"></span> Saving… } @else { Create Order }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Edit Order</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Vendor</label>
              <select [(ngModel)]="editForm.vendorId">
                <option [ngValue]="undefined">No vendor</option>
                @for (v of vendors(); track v.vendorId) {
                  <option [ngValue]="v.vendorId">{{ v.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Scheduled At</label>
              <input type="datetime-local" [(ngModel)]="editForm.scheduledAt" />
            </div>
            <div class="form-group span-2">
              <label>Description</label>
              <textarea [(ngModel)]="editForm.description" rows="3"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeEdit()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
              @if (saving()) { <span class="btn-spinner"></span> Saving… } @else { Update }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Close Modal -->
    @if (showClose) {
      <div class="modal-overlay" (click)="showClose = false">
        <div class="modal-box" style="max-width:360px" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Close Order</h2>
          <div class="form-group">
            <label>Odometer at close (km)</label>
            <input type="number" [(ngModel)]="closeForm.odometerKm" min="0" />
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="showClose = false">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveClose()">
              @if (saving()) { <span class="btn-spinner"></span> Saving… } @else { Close Order }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Cancel Modal -->
    @if (showCancel) {
      <div class="modal-overlay" (click)="showCancel = false">
        <div class="modal-box" style="max-width:360px" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Cancel Order</h2>
          <div class="form-group">
            <label>Reason *</label>
            <textarea [(ngModel)]="cancelForm.cancelReason" rows="3" placeholder="Explain why the order is cancelled…"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="showCancel = false">Back</button>
            <button class="btn btn-danger" [disabled]="saving()" (click)="saveCancel()">
              @if (saving()) { <span class="btn-spinner"></span> Saving… } @else { Cancel Order }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Add Item Modal -->
    @if (showAddItem) {
      <div class="modal-overlay" (click)="showAddItem = false">
        <div class="modal-box" style="max-width:420px" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Add Maintenance Item</h2>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label>Type *</label>
              <select [(ngModel)]="itemForm.maintenanceTypeId">
                <option [ngValue]="0">Select type…</option>
                @for (t of maintenanceTypes(); track t.maintenanceTypeId) {
                  <option [ngValue]="t.maintenanceTypeId">{{ t.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Parts Cost (EUR)</label>
              <input type="number" [(ngModel)]="itemForm.partsCost" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Labor Cost (EUR)</label>
              <input type="number" [(ngModel)]="itemForm.laborCost" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <input [(ngModel)]="itemForm.notes" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="showAddItem = false">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveAddItem()">
              @if (saving()) { <span class="btn-spinner"></span> Saving… } @else { Add Item }
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Order"
      message="Delete this maintenance order? This cannot be undone."
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    .start-btn { color:#16a34a; } .close-btn { color:#2563eb; } .warning-btn { color:#d97706; }
    .items-row td { background:var(--subtle-bg); padding:6px 16px; }
    .items-list { display:flex; flex-wrap:wrap; gap:6px; }
    .item-chip { background:#e0f2fe; color:#0369a1; border-radius:4px; padding:2px 8px; font-size:12px; display:flex; align-items:center; gap:4px; }
    .item-del { background:none; border:none; cursor:pointer; color:#ef4444; font-size:14px; padding:0; line-height:1; }
    .btn-danger { background:#ef4444; color:white; border:none; border-radius:8px; padding:8px 16px; font-size:14px; cursor:pointer; }
    .btn-danger:hover { background:#dc2626; }
  `]
})
export class MaintenanceListComponent implements OnInit {
  readonly icons = { Eye, Pencil, Trash2, Check, X, Play, Plus, WrenchIcon };
  private api = inject(MaintenanceOrderApiService);
  private vehicleApi = inject(VehicleApiService);
  private vendorApi = inject(VendorApiService);
  private lookupApi = inject(LookupApiService);
  auth = inject(AuthService);

  orders = signal<MaintenanceOrder[]>([]);
  vehicles = signal<Vehicle[]>([]);
  vendors = signal<Vendor[]>([]);
  maintenanceTypes = signal<MaintenanceTypeDto[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = signal(''); showCreate = false; showEdit = false;
  showClose = false; showCancel = false; showAddItem = false;
  editId: number | null = null;
  actionId: number | null = null;
  deleteTarget: MaintenanceOrder | null = null;
  filter = signal<'all' | OrderStatus>('all');
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  sortCol = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');

  createForm: CreateMaintenanceOrderDto = { vehicleId: 0, vendorId: 0, scheduledAt: '', odometerKm: 0, description: '' };
  editForm: UpdateMaintenanceOrderDto = {};
  closeForm: CloseMaintenanceOrderDto = {};
  cancelForm: CancelMaintenanceOrderDto = { cancelReason: '' };
  itemForm: CreateMaintenanceItemDto = { maintenanceTypeId: 0, partsCost: 0, laborCost: 0 };

  openCount = computed(() => this.orders().filter(o => o.status === 'open').length);
  filtered = computed(() => {
    let list = this.orders();
    if (this.filter() !== 'all') list = list.filter(o => o.status === this.filter());
    const q = this.search().toLowerCase();
    if (q) list = list.filter(o =>
      o.registrationNumber.toLowerCase().includes(q) ||
      (o.vendorName ?? '').toLowerCase().includes(q)
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
      if (col === 'reg')      { va = a.registrationNumber;  vb = b.registrationNumber; }
      if (col === 'vendor')   { va = a.vendorName ?? '';    vb = b.vendorName ?? ''; }
      if (col === 'reported') { va = a.reportedAt;          vb = b.reportedAt; }
      if (col === 'cost')     { va = a.totalCost ?? 0;      vb = b.totalCost ?? 0; }
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
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
    this.vendorApi.getAll().subscribe(v => this.vendors.set(v));
    this.lookupApi.getMaintenanceTypes().subscribe(t => this.maintenanceTypes.set(t));
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: d => { this.orders.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  statusLabel(s: string): string {
    return s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
  }
  statusVariant(s: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
    if (s === 'open') return 'warning';
    if (s === 'in_progress') return 'info';
    if (s === 'closed') return 'success';
    return 'neutral';
  }

  openCreate(): void {
    this.createForm = { vehicleId: 0, vendorId: 0, scheduledAt: '', odometerKm: 0, description: '' };
    this.formError.set('');
    this.showCreate = true;
  }
  onCreateVehicleChange(vehicleId: number): void {
    const vehicle = this.vehicles().find(v => v.vehicleId === vehicleId);
    if (vehicle) {
      this.createForm.odometerKm = vehicle.currentOdometerKm;
    }
  }
  saveCreate(): void {
  if (!this.createForm.vehicleId) { this.formError.set('Select a vehicle.'); return; }
  if (!this.createForm.vendorId) { this.formError.set('Select a vendor.'); return; }
  if (!this.createForm.scheduledAt) { this.formError.set('Set a scheduled date.'); return; }
  if (!this.createForm.description?.trim()) { this.formError.set('Enter a description.'); return; }
  this.saving.set(true);
  const payload = {
    ...this.createForm,
    scheduledAt: new Date(this.createForm.scheduledAt).toISOString()
  };
  this.api.create(payload).subscribe({
    next: () => { this.load(); this.closeCreate(); this.saving.set(false); },
    error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
  });
}
  closeCreate(): void { this.showCreate = false; this.formError.set(''); }

  startEdit(row: MaintenanceOrder): void {
    this.editId = row.orderId;
    this.editForm = { vendorId: row.vendorId, scheduledAt: row.scheduledAt?.slice(0, 16), description: row.description };
    this.formError.set(''); this.showEdit = true;
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
    if (this.showCreate)  { this.closeCreate();        return; }
    if (this.showEdit)    { this.closeEdit();           return; }
    if (this.showClose)   { this.showClose = false;    return; }
    if (this.showCancel)  { this.showCancel = false;   return; }
    if (this.showAddItem) { this.showAddItem = false;  return; }
  }

  startOrder(row: MaintenanceOrder): void {
    this.api.start(row.orderId).subscribe({ next: () => this.load(), error: () => {} });
  }

  openClose(row: MaintenanceOrder): void {
    this.actionId = row.orderId; this.closeForm = {}; this.showClose = true;
  }
  saveClose(): void {
    if (!this.actionId) return;
    this.saving.set(true);
    this.api.close(this.actionId, this.closeForm).subscribe({
      next: () => { this.load(); this.showClose = false; this.saving.set(false); },
      error: () => this.saving.set(false)
    });
  }

  openCancel(row: MaintenanceOrder): void {
    this.actionId = row.orderId; this.cancelForm = { cancelReason: '' }; this.showCancel = true;
  }
  saveCancel(): void {
    if (!this.actionId || !this.cancelForm.cancelReason) return;
    this.saving.set(true);
    this.api.cancel(this.actionId, this.cancelForm).subscribe({
      next: () => { this.load(); this.showCancel = false; this.saving.set(false); },
      error: () => this.saving.set(false)
    });
  }

  openAddItem(row: MaintenanceOrder): void {
    this.actionId = row.orderId;
    this.itemForm = { maintenanceTypeId: 0, partsCost: 0, laborCost: 0 };
    this.showAddItem = true;
  }
  saveAddItem(): void {
    if (!this.actionId || !this.itemForm.maintenanceTypeId) return;
    this.saving.set(true);
    this.api.addItem(this.actionId, this.itemForm).subscribe({
      next: () => { this.load(); this.showAddItem = false; this.saving.set(false); },
      error: () => this.saving.set(false)
    });
  }

  deleteItem(item: MaintenanceItem): void {
    this.api.deleteItem(item.itemId).subscribe({ next: () => this.load(), error: () => {} });
  }

  confirmDelete(row: MaintenanceOrder): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.orderId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }
}
