import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil } from 'lucide-angular';
import { RegistrationApiService } from '../../../core/auth/feature-api.services';
import { RegistrationRecord } from '../../../core/models/models';
import { CreateRegistrationRecordDto } from '../../../core/models/registration.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-registration-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BadgeComponent, LucideAngularModule, HasRoleDirective],
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard">Dashboard</a>
        <span class="bc-sep">›</span>
        <a routerLink="/registration">Registration</a>
        <span class="bc-sep">›</span>
        <span>{{ record()?.registrationNumber ?? 'Detail' }}</span>
      </nav>

      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            Registration
          </button>
          <div>
            @if (record()) {
              <h1 class="page-title">Registration {{ record()!.registrationNumber }} · <span class="mono">{{ record()!.vehicleRegistrationNumber }}</span></h1>
              <p class="page-subtitle">Valid {{ record()!.validFrom | date:'dd.MM.yyyy' }} – {{ record()!.validTo | date:'dd.MM.yyyy' }}</p>
            } @else {
              <h1 class="page-title">Registration Detail</h1>
            }
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <button *hasRole="['Admin','FleetManager']" class="btn btn-secondary" (click)="startEdit()" [disabled]="!record()">
            <lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon>
            Edit
          </button>
          @if (record()) {
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
      } @else if (!record()) {
        <div class="table-empty">Registration record not found.</div>
      } @else {
        <div class="overview-grid">

          <!-- Registration Info -->
          <div class="info-group">
            <div class="info-group-title">Registration Info</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Registration ID</span>
                <span class="kv-value mono">{{ record()!.registrationId }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Registration Number</span>
                <span class="kv-value mono">{{ record()!.registrationNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Vehicle</span>
                <span class="kv-value mono">{{ record()!.vehicleRegistrationNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Status</span>
                <span class="kv-value">
                  <app-badge [label]="statusLabel()" [variant]="statusVariant()" />
                </span>
              </div>
            </div>
          </div>

          <!-- Validity & Cost -->
          <div class="info-group">
            <div class="info-group-title">Validity &amp; Cost</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Valid From</span>
                <span class="kv-value">{{ record()!.validFrom | date:'dd.MM.yyyy' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Valid To</span>
                <span class="kv-value">{{ record()!.validTo | date:'dd.MM.yyyy' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Fee</span>
                <span class="kv-value">{{ record()!.fee != null ? (record()!.fee | number:'1.2-2') + ' €' : '—' }}</span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label">Notes</span>
                <span class="kv-value">{{ record()!.notes || '—' }}</span>
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
          <h2 class="modal-title">Edit Registration</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Registration # *</label>
              <input [(ngModel)]="editForm.registrationNumber" placeholder="PD-2025-ZG1234AB" />
            </div>
            <div class="form-group">
              <label>Valid From *</label>
              <input type="date" [(ngModel)]="editForm.validFrom" />
            </div>
            <div class="form-group">
              <label>Valid To *</label>
              <input type="date" [(ngModel)]="editForm.validTo" />
            </div>
            <div class="form-group">
              <label>Fee (EUR)</label>
              <input type="number" [(ngModel)]="editForm.fee" min="0" />
            </div>
            <div class="form-group span-2">
              <label>Notes</label>
              <input [(ngModel)]="editForm.notes" placeholder="Optional notes" />
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
export class RegistrationDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Pencil };

  record  = signal<RegistrationRecord | null>(null);
  loading = signal(true);
  error   = signal('');

  // Edit state
  showEdit = false;
  editForm: CreateRegistrationRecordDto = this.emptyForm();
  saving = signal(false);
  formError = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: RegistrationApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: r => { this.record.set(r); this.loading.set(false); },
      error: () => { this.error.set('Failed to load registration record.'); this.loading.set(false); },
    });
  }

  goBack(): void { this.router.navigate(['/registration']); }

  statusLabel(): string {
    const r = this.record();
    if (!r) return '';
    return r.isActive ? 'Active' : 'Expired';
  }

  statusVariant(): 'success' | 'danger' {
    const r = this.record();
    if (!r) return 'danger';
    return r.isActive ? 'success' : 'danger';
  }

  startEdit(): void {
    const r = this.record();
    if (!r) return;
    this.editForm = {
      vehicleId: r.vehicleId,
      registrationNumber: r.registrationNumber,
      validFrom: r.validFrom.slice(0, 10),
      validTo: r.validTo.slice(0, 10),
      fee: r.fee,
      notes: r.notes,
    };
    this.formError.set('');
    this.showEdit = true;
  }

  saveEdit(): void {
    const r = this.record();
    if (!r) return;
    if (!this.editForm.registrationNumber || !this.editForm.validFrom || !this.editForm.validTo) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.update(r.registrationId, this.editForm).subscribe({
      next: () => {
        this.api.getById(r.registrationId).subscribe({
          next: updated => { this.record.set(updated); this.closeEdit(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
      },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.formError.set(''); }

  private emptyForm(): CreateRegistrationRecordDto {
    return { vehicleId: 0, registrationNumber: '', validFrom: '', validTo: '' };
  }
}
