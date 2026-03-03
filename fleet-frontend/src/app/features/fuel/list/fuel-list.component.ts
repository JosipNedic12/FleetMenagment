import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FuelCardApiService, FuelTransactionApiService, VehicleApiService, LookupApiService } from '../../../core/auth/feature-api.services';
import {
  FuelCard, CreateFuelCardDto, UpdateFuelCardDto,
  FuelTransaction, CreateFuelTransactionDto,
  Vehicle, FuelTypeDto
} from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Fuel</h1>
          <p class="page-subtitle">Cards & transactions</p>
        </div>
      </div>

      <div class="tab-row">
        <button [class.tab-active]="tab() === 'cards'"        (click)="tab.set('cards')">Fuel Cards ({{ cards().length }})</button>
        <button [class.tab-active]="tab() === 'transactions'" (click)="tab.set('transactions')">Transactions ({{ transactions().length }})</button>
      </div>

      <!-- ── Cards Tab ──────────────────────────────────────────────────── -->
      @if (tab() === 'cards') {
        <div class="section-actions">
          <input class="search-input" [ngModel]="cardSearch()" (ngModelChange)="cardSearch.set($event)" placeholder="Search card#, provider…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreateCard()">+ Add Card</button>
        </div>
        <div class="table-card">
          @if (loadingCards()) { <div class="table-loading">Loading…</div> }
          @else if (filteredCards().length === 0) { <div class="table-empty">No cards found.</div> }
          @else {
            <table class="table">
              <thead>
                <tr>
                  <th>Card #</th>
                  <th>Provider</th>
                  <th>Vehicle</th>
                  <th>Valid From</th>
                  <th>Valid To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredCards(); track row.fuelCardId) {
                  <tr>
                    <td class="mono">{{ row.cardNumber }}</td>
                    <td>{{ row.provider ?? '—' }}</td>
                    <td>{{ row.registrationNumber ?? '—' }}</td>
                    <td>{{ row.validFrom ? (row.validFrom | date:'dd.MM.yyyy') : '—' }}</td>
                    <td>{{ row.validTo ? (row.validTo | date:'dd.MM.yyyy') : '—' }}</td>
                    <td>
                      <app-badge [label]="row.isActive ? 'Active' : 'Inactive'" [variant]="row.isActive ? 'success' : 'neutral'" />
                    </td>
                    <td class="actions">
                      <button *hasRole="['Admin','FleetManager']" class="btn-icon" (click)="startEditCard(row)">✏️</button>
                      <button *hasRole="'Admin'" class="btn-icon danger" (click)="confirmDeleteCard(row)">🗑</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- ── Transactions Tab ───────────────────────────────────────────── -->
      @if (tab() === 'transactions') {
        <div class="section-actions">
          <input class="search-input" [ngModel]="txSearch()" (ngModelChange)="txSearch.set($event)" placeholder="Search vehicle, station…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreateTx()">+ Add Transaction</button>
        </div>
        <div class="table-card">
          @if (loadingTx()) { <div class="table-loading">Loading…</div> }
          @else if (filteredTx().length === 0) { <div class="table-empty">No transactions found.</div> }
          @else {
            <table class="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Date</th>
                  <th>Fuel Type</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Station</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredTx(); track row.transactionId) {
                  <tr [class.suspicious-row]="row.isSuspicious">
                    <td><strong class="mono">{{ row.registrationNumber }}</strong></td>
                    <td>{{ row.postedAt | date:'dd.MM.yyyy' }}</td>
                    <td>{{ row.fuelTypeName }}</td>
                    <td>
                      @if (row.liters != null) { {{ row.liters | number:'1.2-2' }} L }
                      @else if (row.energyKwh != null) { {{ row.energyKwh | number:'1.2-2' }} kWh }
                    </td>
                    <td><strong>{{ row.totalCost | currency:'EUR':'symbol':'1.2-2' }}</strong></td>
                    <td>{{ row.stationName ?? '—' }}</td>
                    <td class="actions">
                      @if (!row.isSuspicious) {
                        <button *hasRole="['Admin','FleetManager']" class="btn-icon warning-btn" title="Mark suspicious" (click)="markSuspicious(row)">⚠</button>
                      } @else {
                        <app-badge label="Suspicious" variant="danger" />
                      }
                      <button *hasRole="'Admin'" class="btn-icon danger" (click)="confirmDeleteTx(row)">🗑</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>

    <!-- Create Card Modal -->
    @if (showCreateCard) {
      <div class="modal-overlay" (click)="closeCreateCard()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Add Fuel Card</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Card # *</label>
              <input [(ngModel)]="cardForm.cardNumber" placeholder="1234-5678-9012" />
            </div>
            <div class="form-group">
              <label>Provider</label>
              <input [(ngModel)]="cardForm.provider" placeholder="INA, Shell, Petrol…" />
            </div>
            <div class="form-group">
              <label>Vehicle</label>
              <select [(ngModel)]="cardForm.assignedVehicleId">
                <option [ngValue]="undefined">No vehicle</option>
                @for (v of vehicles(); track v.vehicleId) {
                  <option [ngValue]="v.vehicleId">{{ v.registrationNumber }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Valid From</label>
              <input type="date" [(ngModel)]="cardForm.validFrom" />
            </div>
            <div class="form-group">
              <label>Valid To</label>
              <input type="date" [(ngModel)]="cardForm.validTo" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <input [(ngModel)]="cardForm.notes" />
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreateCard()">Cancel</button>
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
          <h2 class="modal-title">Add Fuel Transaction</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Vehicle *</label>
              <select [(ngModel)]="txForm.vehicleId" (ngModelChange)="onTxVehicleChange($event)">
                <option [ngValue]="0">Select vehicle…</option>
                @for (v of vehicles(); track v.vehicleId) {
                  <option [ngValue]="v.vehicleId">{{ v.registrationNumber }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Fuel Card</label>
              <select [(ngModel)]="txForm.fuelCardId">
                <option [ngValue]="undefined">No card (cash)</option>
                @for (c of cards(); track c.fuelCardId) {
                  <option [ngValue]="c.fuelCardId">{{ c.cardNumber }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Fuel Type *</label>
              <select [(ngModel)]="txForm.fuelTypeId" (ngModelChange)="recalcTotalCost()">
                <option [ngValue]="0">Select type…</option>
                @for (f of fuelTypes(); track f.fuelTypeId) {
                  <option [ngValue]="f.fuelTypeId">{{ f.label }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input type="datetime-local" [(ngModel)]="txForm.postedAt" />
            </div>

            @if (!isElectric()) {
              <div class="form-group">
                <label>Liters</label>
                <input type="number" [(ngModel)]="txForm.liters" min="0" step="0.01"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
              <div class="form-group">
                <label>Price/L (EUR)</label>
                <input type="number" [(ngModel)]="txForm.pricePerLiter" min="0" step="0.001"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
            }
            @if (isElectric()) {
              <div class="form-group">
                <label>kWh</label>
                <input type="number" [(ngModel)]="txForm.energyKwh" min="0" step="0.01"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
              <div class="form-group">
                <label>Price/kWh (EUR)</label>
                <input type="number" [(ngModel)]="txForm.pricePerKwh" min="0" step="0.001"
                      (ngModelChange)="recalcTotalCost()" />
              </div>
            }

            <div class="form-group">
              <label>Total Cost (EUR) *</label>
              <input type="number" [(ngModel)]="txForm.totalCost" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Odometer (km) *</label>
              <input type="number" [(ngModel)]="txForm.odometerKm" min="0" required />
            </div>
            <div class="form-group">
              <label>Station</label>
              <input [(ngModel)]="txForm.stationName" placeholder="INA Zagreb…" />
            </div>
            <div class="form-group">
              <label>Receipt #</label>
              <input [(ngModel)]="txForm.receiptNumber" />
            </div>
            <div class="form-group span-2">
              <label>Notes</label>
              <textarea [(ngModel)]="txForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreateTx()">Cancel</button>
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
      [message]="'Delete card ' + (deleteCardTarget?.cardNumber ?? '') + '?'"
      (confirmed)="doDeleteCard()"
      (cancelled)="deleteCardTarget = null"
    />
    <app-confirm-modal
      [visible]="!!deleteTxTarget"
      title="Delete Transaction"
      message="Delete this fuel transaction? This cannot be undone."
      (confirmed)="doDeleteTx()"
      (cancelled)="deleteTxTarget = null"
    />
  `,
  styles: [`
    .tab-row { display:flex; gap:2px; margin-bottom:16px; }
    .tab-row button { padding:8px 20px; border:1.5px solid #e2e8f0; background:white; border-radius:7px; font-size:14px; cursor:pointer; color:var(--text-muted); transition:all .15s; }
    .tab-active { background:var(--brand) !important; color:white !important; border-color:var(--brand) !important; }
    .section-actions { display:flex; gap:12px; margin-bottom:16px; align-items:center; }
    .suspicious-row { background:#fff7ed; }
    .warning-btn { color:#d97706; }
  `]
})
export class FuelListComponent implements OnInit {
  private cardApi = inject(FuelCardApiService);
  private txApi = inject(FuelTransactionApiService);
  private vehicleApi = inject(VehicleApiService);
  private lookupApi = inject(LookupApiService);
  auth = inject(AuthService);

  cards = signal<FuelCard[]>([]);
  transactions = signal<FuelTransaction[]>([]);
  vehicles = signal<Vehicle[]>([]);
  fuelTypes = signal<FuelTypeDto[]>([]);
  loadingCards = signal(true);
  loadingTx = signal(true);
  saving = signal(false); formError = signal('');
  tab = signal<'cards' | 'transactions'>('cards');
  cardSearch = signal(''); txSearch = signal('');
  showCreateCard = false; showCreateTx = false;
  editCardId: number | null = null;
  deleteCardTarget: FuelCard | null = null;
  deleteTxTarget: FuelTransaction | null = null;

  cardForm: CreateFuelCardDto = { cardNumber: '' };
  txForm: CreateFuelTransactionDto = { vehicleId: 0, fuelTypeId: 0, postedAt: '', totalCost: 0 };

  filteredCards = computed(() => {
    const q = this.cardSearch().toLowerCase();
    return q ? this.cards().filter(c => c.cardNumber.toLowerCase().includes(q) || (c.provider ?? '').toLowerCase().includes(q)) : this.cards();
  });
  filteredTx = computed(() => {
    const q = this.txSearch().toLowerCase();
    return q ? this.transactions().filter(t => t.registrationNumber.toLowerCase().includes(q) || (t.stationName ?? '').toLowerCase().includes(q)) : this.transactions();
  });

  ngOnInit(): void {
    this.loadCards();
    this.loadTx();
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
    this.lookupApi.getFuelTypes().subscribe(f => this.fuelTypes.set(f));
  }

  loadCards(): void {
    this.loadingCards.set(true);
    this.cardApi.getAll().subscribe({
      next: d => { this.cards.set(d); this.loadingCards.set(false); },
      error: () => this.loadingCards.set(false)
    });
  }

  loadTx(): void {
    this.loadingTx.set(true);
    this.txApi.getAll().subscribe({
      next: d => { this.transactions.set(d); this.loadingTx.set(false); },
      error: () => this.loadingTx.set(false)
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
      next: () => { this.loadCards(); this.closeCreateCard(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }
  closeCreateCard(): void { this.showCreateCard = false; this.editCardId = null; this.formError.set(''); }

  openCreateTx(): void {
    this.txForm = { vehicleId: 0, fuelTypeId: 0, postedAt: new Date().toISOString(), totalCost: 0, odometerKm: 0 };
    this.formError.set(''); this.showCreateTx = true;
  }

  saveTx(): void {
    if (!this.txForm.vehicleId || !this.txForm.fuelTypeId || !this.txForm.postedAt) {
      this.formError.set('Fill all required fields.'); return;
    }
    if (!this.txForm.odometerKm || this.txForm.odometerKm <= 0) {
      this.formError.set('Odometer reading is required.'); return;
    }
    const payload = {
      ...this.txForm,
      postedAt: new Date(this.txForm.postedAt).toISOString()
    };
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

  confirmDeleteCard(row: FuelCard): void { this.deleteCardTarget = row; }
  doDeleteCard(): void {
    if (!this.deleteCardTarget) return;
    this.cardApi.deleteById(this.deleteCardTarget.fuelCardId).subscribe({ next: () => { this.loadCards(); this.deleteCardTarget = null; }, error: () => { this.deleteCardTarget = null; } });
  }
  confirmDeleteTx(row: FuelTransaction): void { this.deleteTxTarget = row; }
  doDeleteTx(): void {
    if (!this.deleteTxTarget) return;
    this.txApi.deleteById(this.deleteTxTarget.transactionId).subscribe({ next: () => { this.loadTx(); this.deleteTxTarget = null; }, error: () => { this.deleteTxTarget = null; } });
  }
  //________Helper______________________________
  onTxVehicleChange(vehicleId: number): void {
  const vehicle = this.vehicles().find(v => v.vehicleId === vehicleId);
  if (vehicle) {
    this.txForm.odometerKm = vehicle.currentOdometerKm + 1;
    const matchedType = this.fuelTypes().find(f => f.label.toLowerCase() === vehicle.fuelType?.toLowerCase());
    if (matchedType) {
      this.txForm.fuelTypeId = matchedType.fuelTypeId;
    }
    // Clear quantity fields when vehicle changes
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
