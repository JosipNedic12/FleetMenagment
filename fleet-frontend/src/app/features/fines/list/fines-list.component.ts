import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FineApiService, VehicleApiService, DriverApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, CreditCard } from 'lucide-angular';
import { Fine, CreateFineDto, MarkFinePaidDto, Vehicle, Driver } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';

@Component({
  selector: 'app-fines-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, VehicleLabelComponent, EuNumberPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@fines.list.title">Fines</h1>
          <p class="page-subtitle" i18n="@@fines.list.subtitle">{{ filtered().length }} records · {{ unpaidCount() }} unpaid</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search vehicle, reason…" i18n-placeholder="@@fines.list.searchPlaceholder" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true">
            <ng-container i18n="@@fines.list.recordFineBtn">+ Record Fine</ng-container>
          </button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"    (click)="filter.set('all')" i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'unpaid'" (click)="filter.set('unpaid')" i18n="@@COMMON.CHIPS.UNPAID">Unpaid</button>
        <button [class.active]="filter() === 'paid'"   (click)="filter.set('paid')" i18n="@@COMMON.CHIPS.PAID">Paid</button>
      </div>

      <div class="table-card">
        @if (loading()) {
          <div class="table-loading" i18n="@@fines.list.loading">Loading…</div>
        } @else if (filtered().length === 0) {
          <div class="table-empty" i18n="@@fines.list.empty">No fines found.</div>
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th i18n="@@fines.list.colVehicle">Vehicle</th>
                <th i18n="@@fines.list.colDriver">Driver</th>
                <th i18n="@@fines.list.colOccurred">Occurred</th>
                <th i18n="@@fines.list.colReason">Reason</th>
                <th i18n="@@fines.list.colAmount">Amount</th>
                <th i18n="@@fines.list.colStatus">Status</th>
                <th i18n="@@fines.list.colActions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.fineId) {
                <tr (click)="goToDetail(row)">
                  <td><app-vehicle-label [make]="row.vehicleMake" [model]="row.vehicleModel" [registration]="row.registrationNumber" /></td>
                  <td>{{ row.driverName ?? '—' }}</td>
                  <td>{{ row.occurredAt | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.reason }}</td>
                  <td><strong>{{ row.amount | euNumber:'1.2-2' }} €</strong></td>
                  <td>
                    <app-badge
                      [label]="row.isPaid ? paidLabel : unpaidLabel"
                      [variant]="row.isPaid ? 'success' : 'danger'"
                    />
                  </td>
                  <td class="actions">
                    @if (!row.isPaid) {
                      <button
                        *hasRole="['Admin','FleetManager']"
                        class="btn-icon"
                        title="Mark as Paid" i18n-title="@@fines.list.markPaidTitle"
                        (click)="$event.stopPropagation(); openPayModal(row)"
                      ><lucide-icon [img]="icons.CreditCard" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    }
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" i18n-title="@@fines.list.editTitle" (click)="$event.stopPropagation(); startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="'Admin'" class="btn-icon danger" title="Delete" i18n-title="@@fines.list.deleteTitle" (click)="$event.stopPropagation(); confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- Create / Edit form -->
    @if (showForm) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">{{ editId ? editFineLabel : recordFineLabel }}</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@fines.form.vehicleLabel">Vehicle *</label>
              <app-search-select
                [items]="vehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                placeholder="Select vehicle…" i18n-placeholder="@@fines.form.vehiclePlaceholder"
                [disabled]="!!editId"
                [(ngModel)]="form.vehicleId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@fines.form.driverLabel">Driver</label>
              <app-search-select
                [items]="drivers()"
                [displayFn]="driverDisplayFn"
                valueField="driverId"
                placeholder="Unknown" i18n-placeholder="@@fines.form.driverPlaceholder"
                [(ngModel)]="form.driverId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@fines.form.occurredAtLabel">Occurred At *</label>
              <input type="datetime-local" [(ngModel)]="form.occurredAt" />
            </div>
            <div class="form-group">
              <label i18n="@@fines.form.amountLabel">Amount (EUR) *</label>
              <input type="number" [(ngModel)]="form.amount" min="0.01" step="0.01" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@fines.form.reasonLabel">Reason *</label>
              <input [(ngModel)]="form.reason" placeholder="Speeding, illegal parking…" i18n-placeholder="@@fines.form.reasonPlaceholder" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@fines.form.notesLabel">Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()" i18n="@@fines.form.cancelBtn">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? savingLabel : editId ? updateLabel : createLabel }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Mark as paid modal -->
    @if (payTarget) {
      <div class="modal-overlay" (click)="payTarget = null">
        <div class="modal-box" style="max-width:380px" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@fines.pay.title">Mark Fine as Paid</h2>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label i18n="@@fines.pay.paidAtLabel">Paid At *</label>
              <input type="datetime-local" [(ngModel)]="payForm.paidAt" />
            </div>
            <div class="form-group">
              <label i18n="@@fines.pay.paymentMethodLabel">Payment Method</label>
              <input [(ngModel)]="payForm.paymentMethod" placeholder="Bank transfer, cash…" i18n-placeholder="@@fines.pay.paymentMethodPlaceholder" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="payTarget = null" i18n="@@fines.pay.cancelBtn">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="doMarkPaid()">
              {{ saving() ? savingLabel : confirmPaymentLabel }}
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Fine" i18n-title="@@fines.delete.title"
      message="Delete this fine record? This cannot be undone." i18n-message="@@fines.delete.message"
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    tbody tr { cursor:pointer; transition:background 0.12s; }
    tbody tr:hover { background:var(--hover-bg); }
  `]
})
export class FinesListComponent implements OnInit {
  readonly icons = { Eye, Pencil, Trash2, CreditCard };

  // i18n labels used in interpolated expressions
  paidLabel   = $localize`:@@COMMON.CHIPS.PAID:Paid`;
  unpaidLabel = $localize`:@@COMMON.CHIPS.UNPAID:Unpaid`;
  editFineLabel = $localize`:@@fines.list.editFineTitle:Edit Fine`;
  recordFineLabel = $localize`:@@fines.list.recordFineTitle:Record Fine`;
  savingLabel = $localize`:@@fines.form.saving:Saving…`;
  updateLabel = $localize`:@@fines.form.updateBtn:Update`;
  createLabel = $localize`:@@fines.form.createBtn:Create`;
  confirmPaymentLabel = $localize`:@@fines.pay.confirmBtn:Confirm Payment`;
  readonly vehicleDisplayFn = (v: Vehicle) => `${v.make} ${v.model} – ${v.registrationNumber}`;
  readonly driverDisplayFn  = (d: Driver)  => d.fullName;
  fines    = signal<Fine[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers  = signal<Driver[]>([]);
  loading  = signal(true);
  saving   = signal(false);
  formError = signal('');

  search   = signal('');
  showForm = false;
  editId: number | null = null;
  deleteTarget: Fine | null = null;
  payTarget: Fine | null = null;
  filter = signal<'all' | 'unpaid' | 'paid'>('all');

  form: CreateFineDto = this.emptyForm();
  payForm: MarkFinePaidDto = { paidAt: new Date().toISOString().slice(0,16), paymentMethod: '' };

  unpaidCount = computed(() => this.fines().filter(f => !f.isPaid).length);
  filtered = computed(() => {
    let list = this.fines();
    if (this.filter() === 'unpaid') list = list.filter(f => !f.isPaid);
    if (this.filter() === 'paid')   list = list.filter(f => f.isPaid);
    const q = this.search().toLowerCase();
    if (q) list = list.filter(f => f.registrationNumber.toLowerCase().includes(q) || f.reason.toLowerCase().includes(q));
    return list;
  });

  private router = inject(Router);

  constructor(private api: FineApiService, private vehicleApi: VehicleApiService, private driverApi: DriverApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.load();
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
    this.driverApi.getAll().subscribe(d => this.drivers.set(d));
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({ next: d => { this.fines.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  startEdit(row: Fine): void {
    this.editId = row.fineId;
    this.form = { vehicleId: row.vehicleId, driverId: row.driverId, occurredAt: row.occurredAt.slice(0,16), amount: row.amount, reason: row.reason, notes: row.notes };
    this.showForm = true;
  }

  openPayModal(row: Fine): void {
    this.payTarget = row;
    this.payForm = { paidAt: new Date().toISOString().slice(0,16), paymentMethod: '' };
  }

  doMarkPaid(): void {
    if (!this.payTarget) return;
    this.saving.set(true);
    this.api.markPaid(this.payTarget.fineId, this.payForm).subscribe({
      next: () => { this.load(); this.payTarget = null; this.saving.set(false); },
      error: () => this.saving.set(false)
    });
  }

  save(): void {
    if (!this.form.vehicleId || !this.form.occurredAt || !this.form.reason || !this.form.amount) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    const obs = this.editId ? this.api.update(this.editId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.load(); this.closeForm(); this.saving.set(false); }, error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); } });
  }

  goToDetail(row: Fine): void { this.router.navigate(['/fines', row.fineId]); }

  confirmDelete(row: Fine): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.fineId).subscribe({ next: () => { this.load(); this.deleteTarget = null; }, error: () => { this.deleteTarget = null; } });
  }

  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }
  private emptyForm(): CreateFineDto { return { vehicleId: 0, occurredAt: '', amount: 0, reason: '' }; }
}