import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil } from 'lucide-angular';
import { FineApiService, DriverApiService } from '../../../core/auth/feature-api.services';
import { Fine, Driver } from '../../../core/models/models';
import { CreateFineDto } from '../../../core/models/fine.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';

@Component({
  selector: 'app-fine-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BadgeComponent, LucideAngularModule, HasRoleDirective, SearchSelectComponent, EuNumberPipe],
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard" i18n="@@fines.detail.breadcrumbDashboard">Dashboard</a>
        <span class="bc-sep">›</span>
        <a routerLink="/fines" i18n="@@fines.detail.breadcrumbFines">Fines</a>
        <span class="bc-sep">›</span>
        <span>Fine #{{ fine()?.fineId ?? detailLabel }}</span>
      </nav>

      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@fines.detail.backBtn">Fines</ng-container>
          </button>
          <div>
            @if (fine()) {
              <h1 class="page-title">Fine #{{ fine()!.fineId }} · {{ fine()!.vehicleMake }} {{ fine()!.vehicleModel }}</h1>
              <p class="page-subtitle"><span class="mono">{{ fine()!.registrationNumber }}</span> · {{ fine()!.reason }} · {{ fine()!.occurredAt | date:'dd.MM.yyyy' }}</p>
            } @else {
              <h1 class="page-title" i18n="@@fines.detail.titleFallback">Fine Detail</h1>
            }
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <button *hasRole="['Admin','FleetManager']" class="btn btn-secondary" (click)="startEdit()" [disabled]="!fine()">
            <lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@fines.detail.editBtn">Edit</ng-container>
          </button>
          @if (fine()) {
            <app-badge
              [label]="fine()!.isPaid ? labelPaid : labelUnpaid"
              [variant]="fine()!.isPaid ? 'success' : 'danger'"
            />
          }
        </div>
      </div>

      @if (loading()) {
        <div class="table-loading" i18n="@@fines.detail.loading">Loading…</div>
      } @else if (error()) {
        <div class="table-empty">{{ error() }}</div>
      } @else if (!fine()) {
        <div class="table-empty" i18n="@@fines.detail.notFound">Fine not found.</div>
      } @else {
        <div class="overview-grid">

          <!-- Vehicle & Driver -->
          <div class="info-group">
            <div class="info-group-title" i18n="@@fines.detail.sectionVehicleDriver">Vehicle & Driver</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelVehicle">Vehicle</span>
                <span class="kv-value">{{ fine()!.vehicleMake }} {{ fine()!.vehicleModel }}<br><span class="mono" style="font-size:12px; color:var(--text-muted)">{{ fine()!.registrationNumber }}</span></span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelDriver">Driver</span>
                <span class="kv-value">{{ fine()!.driverName || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Fine Info -->
          <div class="info-group">
            <div class="info-group-title" i18n="@@fines.detail.sectionFineInfo">Fine Info</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelAmount">Amount</span>
                <span class="kv-value">{{ fine()!.amount | euNumber:'1.2-2' }} €</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelViolation">Violation</span>
                <span class="kv-value">{{ fine()!.reason }}</span>
              </div>
            </div>
          </div>

          <!-- Details -->
          <div class="info-group info-group--full">
            <div class="info-group-title" i18n="@@fines.detail.sectionDetails">Details</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelFineId">Fine ID</span>
                <span class="kv-value mono">{{ fine()!.fineId }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelStatus">Status</span>
                <span class="kv-value">
                  <app-badge
                    [label]="fine()!.isPaid ? labelPaid : labelUnpaid"
                    [variant]="fine()!.isPaid ? 'success' : 'danger'"
                  />
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelDate">Date</span>
                <span class="kv-value">{{ fine()!.occurredAt | date:'dd.MM.yyyy' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelPaidAt">Paid At</span>
                <span class="kv-value">{{ fine()!.paidAt ? (fine()!.paidAt | date:'dd.MM.yyyy') : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@fines.detail.labelPaymentMethod">Payment Method</span>
                <span class="kv-value">{{ fine()!.paymentMethod || '—' }}</span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label" i18n="@@fines.detail.labelNotes">Notes</span>
                <span class="kv-value">{{ fine()!.notes || '—' }}</span>
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
          <h2 class="modal-title" i18n="@@fines.detail.editModalTitle">Edit Fine</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@fines.form.vehicleLabel">Vehicle</label>
              <input [value]="fine()?.registrationNumber ?? ''" disabled style="opacity:0.6" />
            </div>
            <div class="form-group">
              <label i18n="@@fines.form.driverLabel">Driver</label>
              <app-search-select
                [items]="drivers()"
                [displayFn]="driverDisplayFn"
                valueField="driverId"
                placeholder="Unknown" i18n-placeholder="@@fines.form.driverPlaceholder"
                [(ngModel)]="editForm.driverId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@fines.form.occurredAtLabel">Occurred At *</label>
              <input type="datetime-local" [(ngModel)]="editForm.occurredAt" />
            </div>
            <div class="form-group">
              <label i18n="@@fines.form.amountLabel">Amount (EUR) *</label>
              <input type="number" [(ngModel)]="editForm.amount" min="0.01" step="0.01" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@fines.form.reasonLabel">Reason *</label>
              <input [(ngModel)]="editForm.reason" placeholder="Speeding, illegal parking…" i18n-placeholder="@@fines.form.reasonPlaceholder" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@fines.form.notesLabel">Notes</label>
              <textarea [(ngModel)]="editForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeEdit()" i18n="@@fines.form.cancelBtn">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
              @if (saving()) { <span class="btn-spinner"></span><ng-container i18n="@@fines.form.saving"> Saving…</ng-container> } @else { <ng-container i18n="@@fines.form.updateBtn">Update</ng-container> }
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
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }

    @media (max-width: 600px) {
      .kv-grid { grid-template-columns: 1fr; }
      .kv-row:nth-child(odd):not(.kv-full) { border-right: none; }
    }
  `]
})
export class FineDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Pencil };

  readonly detailLabel  = $localize`:@@fines.detail.breadcrumbDetail:Detail`;
  readonly labelPaid    = $localize`:@@COMMON.CHIPS.PAID:Paid`;
  readonly labelUnpaid  = $localize`:@@COMMON.CHIPS.UNPAID:Unpaid`;

  fine    = signal<Fine | null>(null);
  loading = signal(true);
  error   = signal('');

  // Edit state
  drivers = signal<Driver[]>([]);
  showEdit = false;
  editForm: CreateFineDto = this.emptyForm();
  saving = signal(false);
  formError = signal('');
  driverDisplayFn = (d: Driver) => d.fullName;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: FineApiService,
    private driverApi: DriverApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: f => { this.fine.set(f); this.loading.set(false); },
      error: () => { this.error.set('Failed to load fine.'); this.loading.set(false); },
    });
    this.driverApi.getAll().subscribe(d => this.drivers.set(d));
  }

  goBack(): void { this.router.navigate(['/fines']); }

  startEdit(): void {
    const f = this.fine();
    if (!f) return;
    this.editForm = {
      vehicleId: f.vehicleId,
      driverId: f.driverId,
      occurredAt: f.occurredAt.slice(0, 16),
      amount: f.amount,
      reason: f.reason,
      notes: f.notes,
    };
    this.formError.set('');
    this.showEdit = true;
  }

  saveEdit(): void {
    const f = this.fine();
    if (!f) return;
    if (!this.editForm.occurredAt || !this.editForm.reason || !this.editForm.amount) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.update(f.fineId, this.editForm).subscribe({
      next: () => {
        this.api.getById(f.fineId).subscribe({
          next: updated => { this.fine.set(updated); this.closeEdit(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
      },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.formError.set(''); }

  private emptyForm(): CreateFineDto {
    return { vehicleId: 0, occurredAt: '', amount: 0, reason: '' };
  }
}
