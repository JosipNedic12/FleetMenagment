import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil } from 'lucide-angular';
import { FuelTransactionApiService } from '../../../core/auth/feature-api.services';
import { FuelTransaction } from '../../../core/models/models';
import { UpdateFuelTransactionDto } from '../../../core/models/fuel.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-fuel-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BadgeComponent, LucideAngularModule, HasRoleDirective],
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard">Dashboard</a>
        <span class="bc-sep">›</span>
        <a routerLink="/fuel">Fuel</a>
        <span class="bc-sep">›</span>
        <span>Transaction #{{ tx()?.transactionId ?? 'Detail' }}</span>
      </nav>

      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            Fuel
          </button>
          <div>
            @if (tx()) {
              <h1 class="page-title">Fuel Transaction #{{ tx()!.transactionId }} · <span class="mono">{{ tx()!.registrationNumber }}</span></h1>
              <p class="page-subtitle">{{ tx()!.postedAt | date:'dd.MM.yyyy' }} · {{ tx()!.fuelTypeName }} · {{ tx()!.totalCost | number:'1.2-2' }} €</p>
            } @else {
              <h1 class="page-title">Fuel Transaction Detail</h1>
            }
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <button *hasRole="['Admin','FleetManager']" class="btn btn-secondary" (click)="startEdit()" [disabled]="!tx()">
            <lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon>
            Edit
          </button>
          @if (tx()?.isSuspicious) {
            <app-badge label="Suspicious" variant="danger" />
          }
        </div>
      </div>

      @if (loading()) {
        <div class="table-loading">Loading…</div>
      } @else if (error()) {
        <div class="table-empty">{{ error() }}</div>
      } @else if (!tx()) {
        <div class="table-empty">Fuel transaction not found.</div>
      } @else {
        <div class="overview-grid">

          <!-- Transaction Info -->
          <div class="info-group">
            <div class="info-group-title">Transaction Info</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Transaction ID</span>
                <span class="kv-value mono">{{ tx()!.transactionId }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Date</span>
                <span class="kv-value">{{ tx()!.postedAt | date:'dd.MM.yyyy HH:mm' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Vehicle</span>
                <span class="kv-value mono">{{ tx()!.registrationNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Fuel Type</span>
                <span class="kv-value">{{ tx()!.fuelTypeName }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Station</span>
                <span class="kv-value">{{ tx()!.stationName || '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Suspicious</span>
                <span class="kv-value">
                  <app-badge
                    [label]="tx()!.isSuspicious ? 'Yes' : 'No'"
                    [variant]="tx()!.isSuspicious ? 'danger' : 'success'"
                  />
                </span>
              </div>
            </div>
          </div>

          <!-- Cost & Volume -->
          <div class="info-group">
            <div class="info-group-title">Cost &amp; Volume</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Litres</span>
                <span class="kv-value">{{ tx()!.liters != null ? (tx()!.liters | number:'1.2-2') : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Price / Litre</span>
                <span class="kv-value">{{ tx()!.pricePerLiter != null ? (tx()!.pricePerLiter | number:'1.3-3') + ' €' : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Energy (kWh)</span>
                <span class="kv-value">{{ tx()!.energyKwh != null ? (tx()!.energyKwh | number:'1.2-2') : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Price / kWh</span>
                <span class="kv-value">{{ tx()!.pricePerKwh != null ? (tx()!.pricePerKwh | number:'1.3-3') + ' €' : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Total Cost</span>
                <span class="kv-value">{{ tx()!.totalCost | number:'1.2-2' }} €</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Odometer</span>
                <span class="kv-value">{{ tx()!.odometerKm != null ? (tx()!.odometerKm | number) + ' km' : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Additional Details -->
          <div class="info-group info-group--full">
            <div class="info-group-title">Additional Details</div>
            <div class="kv-grid kv-grid--3">
              <div class="kv-row">
                <span class="kv-label">Fuel Card</span>
                <span class="kv-value mono">{{ tx()!.cardNumber || '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Receipt Number</span>
                <span class="kv-value mono">{{ tx()!.receiptNumber || '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Notes</span>
                <span class="kv-value">{{ tx()!.notes || '—' }}</span>
              </div>
            </div>
          </div>

        </div>
      }
    </div>

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Edit Transaction</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Date *</label>
              <input type="datetime-local" [(ngModel)]="editForm.postedAt" />
            </div>
            <div class="form-group">
              <label>Total Cost (EUR) *</label>
              <input type="number" [(ngModel)]="editForm.totalCost" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Odometer (km)</label>
              <input type="number" [(ngModel)]="editForm.odometerKm" min="0" />
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
              @if (saving()) { <span class="btn-spinner"></span> Saving… } @else { Update }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
      background: var(--card-bg); color: var(--text-secondary); font-size: 13px;
      font-weight: 500; cursor: pointer; font-family: inherit;
      transition: all 0.15s;
    }
    .back-btn:hover { border-color: var(--border); color: var(--text-primary); }

    .mono { font-family: monospace; }

    .breadcrumb {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 14px; font-size: 13px;
    }
    .breadcrumb a { color: #6366f1; text-decoration: none; font-weight: 500; }
    .breadcrumb a:hover { text-decoration: underline; }
    .bc-sep { color: var(--text-muted); }
    .breadcrumb span:last-child { color: var(--text-secondary); font-weight: 500; }

    .overview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .info-group {
      background: var(--card-bg); border: 1.5px solid var(--border);
      border-radius: 12px; overflow: hidden;
    }
    .info-group--full { grid-column: 1 / -1; }
    .info-group-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.6px; color: var(--text-muted);
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      background: var(--subtle-bg);
    }

    .kv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .kv-grid--3 { grid-template-columns: repeat(3, 1fr); }
    .kv-row {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    .kv-row:nth-child(odd):not(.kv-full) { border-right: 1px solid var(--border); }
    .kv-full { grid-column: 1 / -1; border-right: none !important; }
    .kv-label {
      font-size: 11px; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .kv-value { font-size: 14px; color: var(--text-primary); word-break: break-all; }

    /* Edit button */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1.5px solid transparent; font-family: inherit; transition: all 0.15s; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: var(--card-bg); border-color: var(--border); color: var(--text-secondary); }
    .btn-secondary:hover:not(:disabled) { border-color: #cbd5e1; color: var(--text-primary); }
    .btn-primary { background: var(--brand); color: white; border-color: var(--brand); }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.08); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { background: var(--card-bg); border-radius: 14px; padding: 28px 32px; width: min(520px, 95vw); box-shadow: 0 12px 40px rgba(0,0,0,.18); }
    .modal-title { font-size: 17px; font-weight: 700; margin: 0 0 20px; color: var(--text-primary); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
    .form-group input, .form-group textarea, .form-group select { padding: 8px 10px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: inherit; background: var(--input-bg); color: var(--text-primary); }
    .span-2 { grid-column: span 2; }
    .form-error { color: #dc2626; font-size: 13px; margin-top: 10px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
    .btn-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: white; border-radius: 50%; animation: spin .6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .overview-grid { grid-template-columns: 1fr; }
      .info-group--full { grid-column: 1; }
      .kv-grid--3 { grid-template-columns: 1fr 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }

    @media (max-width: 600px) {
      .kv-grid { grid-template-columns: 1fr; }
      .kv-grid--3 { grid-template-columns: 1fr; }
      .kv-row:nth-child(odd):not(.kv-full) { border-right: none; }
    }
  `]
})
export class FuelDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Pencil };

  tx      = signal<FuelTransaction | null>(null);
  loading = signal(true);
  error   = signal('');

  // Edit state
  showEdit = false;
  editForm: UpdateFuelTransactionDto = {};
  saving = signal(false);
  formError = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: FuelTransactionApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: t => { this.tx.set(t); this.loading.set(false); },
      error: () => { this.error.set('Failed to load fuel transaction.'); this.loading.set(false); },
    });
  }

  goBack(): void { this.router.navigate(['/fuel']); }

  startEdit(): void {
    const t = this.tx();
    if (!t) return;
    this.editForm = { postedAt: t.postedAt?.slice(0, 16), totalCost: t.totalCost, odometerKm: t.odometerKm, notes: t.notes };
    this.formError.set('');
    this.showEdit = true;
  }

  saveEdit(): void {
    const t = this.tx();
    if (!t) return;
    this.saving.set(true);
    this.api.update(t.transactionId, this.editForm).subscribe({
      next: () => {
        this.api.getById(t.transactionId).subscribe({
          next: updated => { this.tx.set(updated); this.closeEdit(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
      },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.formError.set(''); }
}
