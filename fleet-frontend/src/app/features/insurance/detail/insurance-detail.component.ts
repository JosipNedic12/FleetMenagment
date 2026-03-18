import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil } from 'lucide-angular';
import { InsurancePolicyApiService } from '../../../core/auth/feature-api.services';
import { InsurancePolicy } from '../../../core/models/models';
import { CreateInsurancePolicyDto } from '../../../core/models/insurance.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-insurance-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BadgeComponent, LucideAngularModule, HasRoleDirective],
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard">Dashboard</a>
        <span class="bc-sep">›</span>
        <a routerLink="/insurance">Insurance</a>
        <span class="bc-sep">›</span>
        <span>{{ policy()?.policyNumber ?? 'Detail' }}</span>
      </nav>

      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            Insurance
          </button>
          <div>
            @if (policy()) {
              <h1 class="page-title">Policy {{ policy()!.policyNumber }} · <span class="mono">{{ policy()!.registrationNumber }}</span></h1>
              <p class="page-subtitle">{{ policy()!.insurer }} · Valid {{ policy()!.validFrom | date:'dd.MM.yyyy' }} – {{ policy()!.validTo | date:'dd.MM.yyyy' }}</p>
            } @else {
              <h1 class="page-title">Insurance Detail</h1>
            }
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <button *hasRole="['Admin','FleetManager']" class="btn btn-secondary" (click)="startEdit()" [disabled]="!policy()">
            <lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon>
            Edit
          </button>
          @if (policy()) {
            <app-badge
              [label]="statusLabel()"
              [variant]="statusVariant()"
            />
          }
        </div>
      </div>

      @if (loading()) {
        <div class="table-loading">Loading…</div>
      } @else if (error()) {
        <div class="table-empty">{{ error() }}</div>
      } @else if (!policy()) {
        <div class="table-empty">Insurance policy not found.</div>
      } @else {
        <div class="overview-grid">

          <!-- Policy Info -->
          <div class="info-group">
            <div class="info-group-title">Policy Info</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Policy ID</span>
                <span class="kv-value mono">{{ policy()!.policyId }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Policy Number</span>
                <span class="kv-value mono">{{ policy()!.policyNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Insurer</span>
                <span class="kv-value">{{ policy()!.insurer }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Status</span>
                <span class="kv-value">
                  <app-badge [label]="statusLabel()" [variant]="statusVariant()" />
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Vehicle</span>
                <span class="kv-value mono">{{ policy()!.registrationNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Premium</span>
                <span class="kv-value">{{ policy()!.premium | number:'1.2-2' }} €</span>
              </div>
            </div>
          </div>

          <!-- Validity & Notes -->
          <div class="info-group">
            <div class="info-group-title">Validity &amp; Notes</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Valid From</span>
                <span class="kv-value">{{ policy()!.validFrom | date:'dd.MM.yyyy' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Valid To</span>
                <span class="kv-value">{{ policy()!.validTo | date:'dd.MM.yyyy' }}</span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label">Coverage Notes</span>
                <span class="kv-value">{{ policy()!.coverageNotes || '—' }}</span>
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
          <h2 class="modal-title">Edit Policy</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Policy Number *</label>
              <input [(ngModel)]="editForm.policyNumber" placeholder="POL-2025-001" />
            </div>
            <div class="form-group">
              <label>Insurer *</label>
              <input [(ngModel)]="editForm.insurer" placeholder="Croatia osiguranje" />
            </div>
            <div class="form-group">
              <label>Premium (EUR) *</label>
              <input type="number" [(ngModel)]="editForm.premium" min="0" />
            </div>
            <div class="form-group">
              <label>Valid From *</label>
              <input type="date" [(ngModel)]="editForm.validFrom" />
            </div>
            <div class="form-group">
              <label>Valid To *</label>
              <input type="date" [(ngModel)]="editForm.validTo" />
            </div>
            <div class="form-group span-2">
              <label>Coverage Notes</label>
              <textarea [(ngModel)]="editForm.coverageNotes" rows="2" placeholder="AO + kasko…"></textarea>
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
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }

    @media (max-width: 600px) {
      .kv-grid { grid-template-columns: 1fr; }
      .kv-row:nth-child(odd):not(.kv-full) { border-right: none; }
    }
  `]
})
export class InsuranceDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Pencil };

  policy  = signal<InsurancePolicy | null>(null);
  loading = signal(true);
  error   = signal('');

  // Edit state
  showEdit = false;
  editForm: CreateInsurancePolicyDto = this.emptyForm();
  saving = signal(false);
  formError = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: InsurancePolicyApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: p => { this.policy.set(p); this.loading.set(false); },
      error: () => { this.error.set('Failed to load insurance policy.'); this.loading.set(false); },
    });
  }

  goBack(): void { this.router.navigate(['/insurance']); }

  statusLabel(): string {
    const p = this.policy();
    if (!p) return '';
    return p.isActive ? 'Active' : 'Expired';
  }

  statusVariant(): 'success' | 'danger' {
    const p = this.policy();
    if (!p) return 'danger';
    return p.isActive ? 'success' : 'danger';
  }

  startEdit(): void {
    const p = this.policy();
    if (!p) return;
    this.editForm = {
      vehicleId: p.vehicleId,
      policyNumber: p.policyNumber,
      insurer: p.insurer,
      validFrom: p.validFrom.slice(0, 10),
      validTo: p.validTo.slice(0, 10),
      premium: p.premium,
      coverageNotes: p.coverageNotes,
    };
    this.formError.set('');
    this.showEdit = true;
  }

  saveEdit(): void {
    const p = this.policy();
    if (!p) return;
    if (!this.editForm.policyNumber || !this.editForm.insurer || !this.editForm.validFrom || !this.editForm.validTo) {
      this.formError.set('Please fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.update(p.policyId, this.editForm).subscribe({
      next: () => {
        this.api.getById(p.policyId).subscribe({
          next: updated => { this.policy.set(updated); this.closeEdit(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
      },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.formError.set(''); }

  private emptyForm(): CreateInsurancePolicyDto {
    return { vehicleId: 0, policyNumber: '', insurer: '', validFrom: '', validTo: '', premium: 0 };
  }
}
