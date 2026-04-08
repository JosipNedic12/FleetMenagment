import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FuelCardApiService, FuelTransactionApiService, VehicleApiService, LookupApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, TriangleAlert } from 'lucide-angular';
import {
  FuelCard, CreateFuelCardDto, UpdateFuelCardDto,
  FuelTransaction, CreateFuelTransactionDto,
  Vehicle, FuelTypeDto
} from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button.component';
import { FilterPanelComponent, FilterField } from '../../../shared/components/filter-panel/filter-panel.component';
import { downloadBlob } from '../../../shared/utils/download';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, VehicleLabelComponent, EuNumberPipe, PaginationComponent, ExportButtonComponent, FilterPanelComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@fuel.pageTitle">Fuel</h1>
          <p class="page-subtitle" i18n="@@fuel.pageSubtitle">Cards & transactions</p>
        </div>
      </div>

      <div class="tab-row">
        <button [class.tab-active]="tab() === 'cards'"        (click)="tab.set('cards')" i18n="@@fuel.tabCards">Fuel Cards ({{ cardsTotalCount() }})</button>
        <button [class.tab-active]="tab() === 'transactions'" (click)="tab.set('transactions')" i18n="@@fuel.tabTransactions">Transactions ({{ txTotalCount() }})</button>
      </div>

      <!-- ── Cards Tab ──────────────────────────────────────────────────── -->
      @if (tab() === 'cards') {
        <div class="section-actions">
          <input class="search-input" [ngModel]="cardSearch()" (ngModelChange)="onCardSearchChange($event)" placeholder="Search card#, provider…" i18n-placeholder="@@fuel.cardSearchPlaceholder" />
          <app-export-button (exportAs)="onExportCards($event)" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreateCard()" i18n="@@fuel.addCard">+ Add Card</button>
        </div>
        <div class="table-card">
          @if (loadingCards()) { <div class="table-loading" i18n="@@fuel.loading">Loading…</div> }
          @else if (cardItems().length === 0) { <div class="table-empty" i18n="@@fuel.noCardsFound">No cards found.</div> }
          @else {
            <table class="table">
              <thead>
                <tr>
                  <th i18n="@@fuel.colCardNumber">Card #</th>
                  <th i18n="@@fuel.colProvider">Provider</th>
                  <th i18n="@@fuel.colVehicle">Vehicle</th>
                  <th i18n="@@fuel.colValidFrom">Valid From</th>
                  <th i18n="@@fuel.colValidTo">Valid To</th>
                  <th i18n="@@fuel.colStatus">Status</th>
                  <th i18n="@@fuel.colActions">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of cardItems(); track row.fuelCardId) {
                  <tr>
                    <td class="mono">{{ row.cardNumber }}</td>
                    <td>{{ row.provider ?? '—' }}</td>
                    <td>@if (row.registrationNumber) { <app-vehicle-label [make]="row.vehicleMake ?? ''" [model]="row.vehicleModel ?? ''" [registration]="row.registrationNumber" /> } @else { — }</td>
                    <td>{{ row.validFrom ? (row.validFrom | date:'dd.MM.yyyy') : '—' }}</td>
                    <td>{{ row.validTo ? (row.validTo | date:'dd.MM.yyyy') : '—' }}</td>
                    <td>
                      <app-badge [label]="row.isActive ? activeLabel : inactiveLabel" [variant]="row.isActive ? 'success' : 'neutral'" />
                    </td>
                    <td class="actions">
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon" (click)="$event.stopPropagation(); startEditCard(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                      <button *hasRole="'Admin'" class="btn-icon danger" (click)="$event.stopPropagation(); confirmDeleteCard(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <app-pagination
              [page]="cardPage()"
              [pageSize]="cardPageSize()"
              [totalCount]="cardsTotalCount()"
              [totalPages]="cardsTotalPages()"
              (pageChange)="onCardPageChange($event)"
              (pageSizeChange)="onCardPageSizeChange($event)"
            />
          }
        </div>
      }

      <!-- ── Transactions Tab ───────────────────────────────────────────── -->
      @if (tab() === 'transactions') {
        <div class="section-actions">
          <input class="search-input" [ngModel]="txSearch()" (ngModelChange)="onTxSearchChange($event)" placeholder="Search vehicle, station…" i18n-placeholder="@@fuel.txSearchPlaceholder" />
          <app-export-button (exportAs)="onExportTx($event)" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreateTx()" i18n="@@fuel.addTransaction">+ Add Transaction</button>
        </div>
        <app-filter-panel
          [fields]="txFilterFields"
          [appliedFilters]="txAppliedFilters()"
          (filtersApplied)="onTxFiltersApplied($event)"
          (filtersCleared)="onTxFiltersCleared()"
        />
        <div class="table-card">
          @if (loadingTx()) { <div class="table-loading" i18n="@@fuel.loading">Loading…</div> }
          @else if (txItems().length === 0) { <div class="table-empty" i18n="@@fuel.noTransactionsFound">No transactions found.</div> }
          @else {
            <table class="table">
              <thead>
                <tr>
                  <th i18n="@@fuel.colVehicle">Vehicle</th>
                  <th i18n="@@fuel.colDate">Date</th>
                  <th i18n="@@fuel.colFuelType">Fuel Type</th>
                  <th i18n="@@fuel.colQuantity">Quantity</th>
                  <th i18n="@@fuel.colTotal">Total</th>
                  <th i18n="@@fuel.colStation">Station</th>
                  <th i18n="@@fuel.colActions">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of txItems(); track row.transactionId) {
                  <tr [class.suspicious-row]="row.isSuspicious" (click)="goToDetail(row)">
                    <td><app-vehicle-label [make]="row.vehicleMake" [model]="row.vehicleModel" [registration]="row.registrationNumber" /></td>
                    <td>{{ row.postedAt | date:'dd.MM.yyyy' }}</td>
                    <td>{{ row.fuelTypeName }}</td>
                    <td>
                      @if (row.liters != null) { {{ row.liters | euNumber:'1.2-2' }} L }
                      @else if (row.energyKwh != null) { {{ row.energyKwh | euNumber:'1.2-2' }} kWh }
                    </td>
                    <td><strong>{{ row.totalCost | euNumber:'1.2-2' }} €</strong></td>
                    <td>{{ row.stationName ?? '—' }}</td>
                    <td class="actions">
                      @if (!row.isSuspicious) {
                        <button *hasRole="['Admin','FleetManager']" class="btn-icon warning-btn" title="Mark suspicious" i18n-title="@@fuel.markSuspiciousTitle" (click)="$event.stopPropagation(); markSuspicious(row)"><lucide-icon [img]="icons.TriangleAlert" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                      } @else {
                        <app-badge [label]="suspiciousLabel" variant="danger" />
                      }
                      <button *hasRole="'Admin'" class="btn-icon danger" (click)="$event.stopPropagation(); confirmDeleteTx(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <app-pagination
              [page]="txPage()"
              [pageSize]="txPageSize()"
              [totalCount]="txTotalCount()"
              [totalPages]="txTotalPages()"
              (pageChange)="onTxPageChange($event)"
              (pageSizeChange)="onTxPageSizeChange($event)"
            />
          }
        </div>
      }
    </div>

    <!-- Create Card Modal -->
    @if (showCreateCard) {
      <div class="modal-overlay" (click)="closeCreateCard()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@fuel.addCardTitle">Add Fuel Card</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@fuel.labelCardNumber">Card # *</label>
              <input [(ngModel)]="cardForm.cardNumber" placeholder="1234-5678-9012" />
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelProvider">Provider</label>
              <input [(ngModel)]="cardForm.provider" placeholder="INA, Shell, Petrol…" />
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelVehicle">Vehicle</label>
              <app-search-select
                [items]="vehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                placeholder="No vehicle"
                i18n-placeholder="@@fuel.noVehiclePlaceholder"
                [(ngModel)]="cardForm.assignedVehicleId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelValidFrom">Valid From</label>
              <input type="date" [(ngModel)]="cardForm.validFrom" />
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelValidTo">Valid To</label>
              <input type="date" [(ngModel)]="cardForm.validTo" />
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelNotes">Notes</label>
              <input [(ngModel)]="cardForm.notes" />
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreateCard()" i18n="@@fuel.cancel">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveCard()">
              {{ saving() ? 'Saving…' : editCardId ? 'Update' : 'Add Card' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Create Transaction Modal -->
    @if (showCreateTx) {
      <div class="modal-overlay" (click)="closeCreateTx()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@fuel.addTransactionTitle">Add Fuel Transaction</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@fuel.labelVehicleRequired">Vehicle *</label>
              <app-search-select
                [items]="vehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                placeholder="Select vehicle…"
                i18n-placeholder="@@fuel.selectVehiclePlaceholder"
                [(ngModel)]="txForm.vehicleId"
                (ngModelChange)="onTxVehicleChange($event)">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelFuelCard">Fuel Card</label>
              <app-search-select
                [items]="allCards()"
                [displayFn]="fuelCardDisplayFn"
                valueField="fuelCardId"
                placeholder="No card (cash)"
                i18n-placeholder="@@fuel.noCardPlaceholder"
                [(ngModel)]="txForm.fuelCardId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelFuelTypeRequired">Fuel Type *</label>
              <select [(ngModel)]="txForm.fuelTypeId" (ngModelChange)="recalcTotalCost()">
                <option [ngValue]="0" i18n="@@fuel.selectTypePlaceholder">Select type…</option>
                @for (f of fuelTypes(); track f.fuelTypeId) {
                  <option [ngValue]="f.fuelTypeId">{{ f.label }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelDateRequired">Date *</label>
              <input type="datetime-local" [(ngModel)]="txForm.postedAt" />
            </div>

            @if (!isElectric()) {
              <div class="form-group">
                <label i18n="@@fuel.labelLiters">Liters</label>
                <input type="number" [(ngModel)]="txForm.liters" min="0" step="0.01"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
              <div class="form-group">
                <label i18n="@@fuel.labelPricePerLiter">Price/L (EUR)</label>
                <input type="number" [(ngModel)]="txForm.pricePerLiter" min="0" step="0.001"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
            }
            @if (isElectric()) {
              <div class="form-group">
                <label i18n="@@fuel.labelKwh">kWh</label>
                <input type="number" [(ngModel)]="txForm.energyKwh" min="0" step="0.01"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
              <div class="form-group">
                <label i18n="@@fuel.labelPricePerKwh">Price/kWh (EUR)</label>
                <input type="number" [(ngModel)]="txForm.pricePerKwh" min="0" step="0.001"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
            }

            <div class="form-group">
              <label i18n="@@fuel.labelTotalCostRequired">Total Cost (EUR) *</label>
              <input type="number" [(ngModel)]="txForm.totalCost" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelOdometer">Odometer (km)</label>
              <input type="number" [(ngModel)]="txForm.odometerKm" min="0" />
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelStation">Station</label>
              <input [(ngModel)]="txForm.stationName" placeholder="INA Zagreb…" />
            </div>
            <div class="form-group">
              <label i18n="@@fuel.labelReceiptNumber">Receipt #</label>
              <input [(ngModel)]="txForm.receiptNumber" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@fuel.labelNotes">Notes</label>
              <textarea [(ngModel)]="txForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreateTx()" i18n="@@fuel.cancel">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveTx()">
              {{ saving() ? 'Saving…' : 'Add Transaction' }}
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteCardTarget"
      title="Delete Fuel Card"
      i18n-title="@@fuel.deleteCardTitle"
      [message]="'Delete card ' + (deleteCardTarget?.cardNumber ?? '') + '?'"
      (confirmed)="doDeleteCard()"
      (cancelled)="deleteCardTarget = null"
    />
    <app-confirm-modal
      [visible]="!!deleteTxTarget"
      title="Delete Transaction"
      i18n-title="@@fuel.deleteTxTitle"
      message="Delete this fuel transaction? This cannot be undone."
      i18n-message="@@fuel.deleteTxMessage"
      (confirmed)="doDeleteTx()"
      (cancelled)="deleteTxTarget = null"
    />
  `,
  styles: [`
    .tab-row { display:flex; gap:2px; margin-bottom:16px; }
    .tab-row button { padding:8px 20px; border:1.5px solid var(--border); background:var(--card-bg); border-radius:7px; font-size:14px; cursor:pointer; color:var(--text-muted); transition:all .15s; }
    .tab-active { background:var(--brand) !important; color:white !important; border-color:var(--brand) !important; }
    .section-actions { display:flex; gap:12px; margin-bottom:16px; align-items:center; }
    .suspicious-row { background:#fff7ed; }
    .warning-btn { color:#d97706; }
    tbody tr { cursor:pointer; transition:background 0.12s; }
    tbody tr:hover { background:var(--hover-bg); }
  `]
})
export class FuelListComponent implements OnInit, OnDestroy {
  readonly icons = { Eye, Pencil, Trash2, TriangleAlert };
  activeLabel     = $localize`:@@COMMON.CHIPS.ACTIVE:Active`;
  inactiveLabel   = $localize`:@@COMMON.CHIPS.INACTIVE:Inactive`;
  suspiciousLabel = $localize`:@@COMMON.CHIPS.SUSPICIOUS:Suspicious`;
  readonly vehicleDisplayFn  = (v: Vehicle)  => `${v.make} ${v.model} – ${v.registrationNumber}`;
  readonly fuelCardDisplayFn = (c: FuelCard) => c.cardNumber;
  private cardApi = inject(FuelCardApiService);
  private txApi = inject(FuelTransactionApiService);
  private vehicleApi = inject(VehicleApiService);
  private lookupApi = inject(LookupApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  // Cards tab server state
  cardItems        = signal<FuelCard[]>([]);
  cardsTotalCount  = signal(0);
  cardsTotalPages  = signal(0);
  cardPage         = signal(1);
  cardPageSize     = signal(10);
  cardSearch       = signal('');
  loadingCards     = signal(true);

  // Transactions tab server state
  txItems        = signal<FuelTransaction[]>([]);
  txTotalCount   = signal(0);
  txTotalPages   = signal(0);
  txPage         = signal(1);
  txPageSize     = signal(10);
  txSearch       = signal('');
  loadingTx      = signal(true);

  tab              = signal<'cards' | 'transactions'>('cards');
  txAppliedFilters = signal<Record<string, any>>({});
  saving           = signal(false);
  formError        = signal('');

  txFilterFields: FilterField[] = [
    { key: 'vehicleId',  label: $localize`:@@COMMON.FILTER.vehicle:Vozilo`,   type: 'select', options: [] },
    { key: 'fuelTypeId', label: $localize`:@@fuel.filter.fuelType:Gorivo`,    type: 'select', options: [] },
    { key: 'dateFrom',   label: $localize`:@@COMMON.FILTER.dateFrom:Datum od`, type: 'date' },
    { key: 'dateTo',     label: $localize`:@@COMMON.FILTER.dateTo:Datum do`,   type: 'date' },
  ];

  // Form data
  vehicles  = signal<Vehicle[]>([]);
  allCards  = signal<FuelCard[]>([]);   // full list for tx create dropdown
  fuelTypes = signal<FuelTypeDto[]>([]);

  showCreateCard = false; showCreateTx = false;
  editCardId: number | null = null;
  deleteCardTarget: FuelCard | null = null;
  deleteTxTarget: FuelTransaction | null = null;

  cardForm: CreateFuelCardDto = { cardNumber: '' };
  txForm: CreateFuelTransactionDto = { vehicleId: 0, fuelTypeId: 0, postedAt: '', totalCost: 0 };

  private cardSearchSubject = new Subject<string>();
  private txSearchSubject   = new Subject<string>();

  ngOnInit(): void {
    this.cardSearchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(term => {
      this.cardSearch.set(term); this.cardPage.set(1); this.loadCards();
    });
    this.txSearchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(term => {
      this.txSearch.set(term); this.txPage.set(1); this.loadTx();
    });
    this.loadCards();
    this.loadTx();
    this.vehicleApi.getAll().subscribe(v => {
      this.vehicles.set(v);
      this.txFilterFields.find(f => f.key === 'vehicleId')!.options = v.map(x => ({ value: x.vehicleId.toString(), label: `${x.make} ${x.model} – ${x.registrationNumber}` }));
    });
    this.cardApi.getAll().subscribe(c => this.allCards.set(c));
    this.lookupApi.getFuelTypes().subscribe(f => {
      this.fuelTypes.set(f);
      this.txFilterFields.find(ff => ff.key === 'fuelTypeId')!.options = f.map(x => ({ value: x.fuelTypeId.toString(), label: x.label }));
    });
  }

  ngOnDestroy(): void { this.cardSearchSubject.complete(); this.txSearchSubject.complete(); }

  loadCards(): void {
    this.loadingCards.set(true);
    this.cardApi.getPaged(
      { page: this.cardPage(), pageSize: this.cardPageSize(), search: this.cardSearch() || undefined }
    ).subscribe({
      next: res => { this.cardItems.set(res.items); this.cardsTotalCount.set(res.totalCount); this.cardsTotalPages.set(res.totalPages); this.loadingCards.set(false); },
      error: () => this.loadingCards.set(false)
    });
  }

  loadTx(): void {
    this.loadingTx.set(true);
    this.txApi.getPaged(
      { page: this.txPage(), pageSize: this.txPageSize(), search: this.txSearch() || undefined },
      this.txAppliedFilters()
    ).subscribe({
      next: res => { this.txItems.set(res.items); this.txTotalCount.set(res.totalCount); this.txTotalPages.set(res.totalPages); this.loadingTx.set(false); },
      error: () => this.loadingTx.set(false)
    });
  }

  onCardSearchChange(term: string): void { this.cardSearchSubject.next(term); }
  onCardPageChange(p: number): void { this.cardPage.set(p); this.loadCards(); }
  onCardPageSizeChange(size: number): void { this.cardPageSize.set(size); this.cardPage.set(1); this.loadCards(); }

  onTxSearchChange(term: string): void { this.txSearchSubject.next(term); }
  onTxPageChange(p: number): void { this.txPage.set(p); this.loadTx(); }
  onTxPageSizeChange(size: number): void { this.txPageSize.set(size); this.txPage.set(1); this.loadTx(); }

  onTxFiltersApplied(filters: Record<string, any>): void {
    this.txAppliedFilters.set(filters);
    this.txPage.set(1);
    this.loadTx();
  }

  onTxFiltersCleared(): void {
    this.txAppliedFilters.set({});
    this.txPage.set(1);
    this.loadTx();
  }

  onExportCards(format: 'xlsx' | 'pdf'): void {
    this.cardApi.export(format, this.cardSearch() || undefined).subscribe(blob => {
      downloadBlob(blob, `fuel_cards_${new Date().toISOString().slice(0,10)}.${format}`);
    });
  }

  onExportTx(format: 'xlsx' | 'pdf'): void {
    this.txApi.export(format, this.txSearch() || undefined, this.txAppliedFilters()).subscribe(blob => {
      downloadBlob(blob, `fuel_transactions_${new Date().toISOString().slice(0,10)}.${format}`);
    });
  }

  openCreateCard(): void { this.editCardId = null; this.cardForm = { cardNumber: '' }; this.formError.set(''); this.showCreateCard = true; }
  startEditCard(row: FuelCard): void {
    this.editCardId = row.fuelCardId;
    this.cardForm = { cardNumber: row.cardNumber, provider: row.provider, assignedVehicleId: row.assignedVehicleId, validFrom: row.validFrom?.slice(0, 10), validTo: row.validTo?.slice(0, 10), notes: row.notes };
    this.formError.set(''); this.showCreateCard = true;
  }
  saveCard(): void {
    if (!this.cardForm.cardNumber) { this.formError.set('Card number is required.'); return; }
    this.saving.set(true);
    const obs = this.editCardId
      ? this.cardApi.update(this.editCardId, this.cardForm as UpdateFuelCardDto)
      : this.cardApi.create(this.cardForm);
    obs.subscribe({
      next: () => { this.loadCards(); this.cardApi.getAll().subscribe(c => this.allCards.set(c)); this.closeCreateCard(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }
  closeCreateCard(): void { this.showCreateCard = false; this.editCardId = null; this.formError.set(''); }

  openCreateTx(): void {
    this.txForm = { vehicleId: 0, fuelTypeId: 0, postedAt: new Date().toISOString(), totalCost: 0 };
    this.formError.set(''); this.showCreateTx = true;
  }
  saveTx(): void {
    if (!this.txForm.vehicleId || !this.txForm.fuelTypeId || !this.txForm.postedAt) {
      this.formError.set('Fill all required fields.'); return;
    }
    const payload = { ...this.txForm, postedAt: new Date(this.txForm.postedAt).toISOString() };
    this.saving.set(true);
    this.txApi.create(payload).subscribe({
      next: () => { this.loadTx(); this.closeCreateTx(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }
  closeCreateTx(): void { this.showCreateTx = false; this.formError.set(''); }

  markSuspicious(row: FuelTransaction): void {
    this.txApi.markSuspicious(row.transactionId).subscribe({ next: () => this.loadTx(), error: () => {} });
  }

  goToDetail(row: FuelTransaction): void { this.router.navigate(['/fuel', row.transactionId]); }

  confirmDeleteCard(row: FuelCard): void { this.deleteCardTarget = row; }
  doDeleteCard(): void {
    if (!this.deleteCardTarget) return;
    this.cardApi.deleteById(this.deleteCardTarget.fuelCardId).subscribe({
      next: () => { this.loadCards(); this.deleteCardTarget = null; },
      error: () => { this.deleteCardTarget = null; }
    });
  }
  confirmDeleteTx(row: FuelTransaction): void { this.deleteTxTarget = row; }
  doDeleteTx(): void {
    if (!this.deleteTxTarget) return;
    this.txApi.deleteById(this.deleteTxTarget.transactionId).subscribe({
      next: () => { this.loadTx(); this.deleteTxTarget = null; },
      error: () => { this.deleteTxTarget = null; }
    });
  }

  onTxVehicleChange(vehicleId: number): void {
    const vehicle = this.vehicles().find(v => v.vehicleId === vehicleId);
    if (vehicle) {
      const matchedType = this.fuelTypes().find(f => f.label.toLowerCase() === vehicle.fuelType?.toLowerCase());
      if (matchedType) { this.txForm.fuelTypeId = matchedType.fuelTypeId; }
      this.txForm.liters = undefined;
      this.txForm.pricePerLiter = undefined;
      this.txForm.energyKwh = undefined;
      this.txForm.pricePerKwh = undefined;
      this.txForm.totalCost = 0;
    }
  }

  isElectric(): boolean {
    const ft = this.fuelTypes().find(f => f.fuelTypeId === this.txForm.fuelTypeId);
    return ft?.label?.toLowerCase().includes('electric') ?? false;
  }

  recalcTotalCost(): void {
    if (this.txForm.liters && this.txForm.pricePerLiter) {
      this.txForm.totalCost = parseFloat((this.txForm.liters * this.txForm.pricePerLiter).toFixed(2));
    } else if (this.txForm.energyKwh && this.txForm.pricePerKwh) {
      this.txForm.totalCost = parseFloat((this.txForm.energyKwh * this.txForm.pricePerKwh).toFixed(2));
    }
  }
}
