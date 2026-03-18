import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil, TriangleAlert } from 'lucide-angular';
import { AccidentApiService, DriverApiService } from '../../../core/auth/feature-api.services';
import { Accident, Driver } from '../../../core/models/models';
import { CreateAccidentDto } from '../../../core/models/accident.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-accident-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BadgeComponent, LucideAngularModule, HasRoleDirective, SearchSelectComponent],
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard">Dashboard</a>
        <span class="bc-sep">›</span>
        <a routerLink="/accidents">Accidents</a>
        <span class="bc-sep">›</span>
        <span>Accident #{{ accident()?.accidentId ?? 'Detail' }}</span>
      </nav>

      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            Accidents
          </button>
          <div>
            @if (accident()) {
              <h1 class="page-title">Accident #{{ accident()!.accidentId }} · <span class="mono">{{ accident()!.registrationNumber }}</span></h1>
              <p class="page-subtitle">{{ accident()!.occurredAt | date:'dd.MM.yyyy HH:mm' }} · {{ accident()!.severity | titlecase }}</p>
            } @else {
              <h1 class="page-title">Accident Detail</h1>
            }
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <button *hasRole="['Admin','FleetManager']" class="btn btn-secondary" (click)="startEdit()" [disabled]="!accident()">
            <lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon>
            Edit
          </button>
          @if (accident()) {
            <app-badge
              [label]="accident()!.severity | titlecase"
              [variant]="severityVariant(accident()!.severity)"
            />
          }
        </div>
      </div>

      @if (loading()) {
        <div class="table-loading">Loading…</div>
      } @else if (error()) {
        <div class="table-empty">{{ error() }}</div>
      } @else if (!accident()) {
        <div class="table-empty">Accident not found.</div>
      } @else {
        <div class="overview-grid">

          <!-- Vehicle & Driver -->
          <div class="info-group">
            <div class="info-group-title">Vehicle & Driver</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Registration</span>
                <span class="kv-value mono">{{ accident()!.registrationNumber }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Driver</span>
                <span class="kv-value">{{ accident()!.driverName || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Severity & Damage -->
          <div class="info-group">
            <div class="info-group-title">Severity & Damage</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Severity</span>
                <span class="kv-value">
                  <app-badge
                    [label]="accident()!.severity | titlecase"
                    [variant]="severityVariant(accident()!.severity)"
                  />
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Damage Estimate</span>
                <span class="kv-value">{{ accident()!.damageEstimate != null ? (accident()!.damageEstimate | currency:'EUR':'symbol':'1.2-2') : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Details -->
          <div class="info-group info-group--full">
            <div class="info-group-title">Details</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label">Accident ID</span>
                <span class="kv-value mono">{{ accident()!.accidentId }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Date & Time</span>
                <span class="kv-value">{{ accident()!.occurredAt | date:'dd.MM.yyyy HH:mm' }}</span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label">Description</span>
                <span class="kv-value">{{ accident()!.description || '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Police Report</span>
                <span class="kv-value">{{ accident()!.policeReport || '—' }}</span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label">Notes</span>
                <span class="kv-value">{{ accident()!.notes || '—' }}</span>
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
          <h2 class="modal-title">Edit Accident</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Driver</label>
              <app-search-select
                [items]="drivers()"
                [displayFn]="driverDisplayFn"
                valueField="driverId"
                placeholder="Unknown"
                [(ngModel)]="editForm.driverId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label>Occurred At *</label>
              <input type="datetime-local" [(ngModel)]="editForm.occurredAt" />
            </div>
            <div class="form-group">
              <label>Severity *</label>
              <select [(ngModel)]="editForm.severity">
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="total">Total Loss</option>
              </select>
            </div>
            <div class="form-group">
              <label>Damage Estimate (EUR)</label>
              <input type="number" [(ngModel)]="editForm.damageEstimate" min="0" step="0.01" />
            </div>
            @if (editForm.severity === 'total') {
              <div class="form-group span-2 total-warning">
                <lucide-icon [img]="icons.TriangleAlert" [size]="14" [strokeWidth]="2"></lucide-icon> <strong>Total loss</strong> will automatically retire the vehicle.
              </div>
            }
            <div class="form-group span-2">
              <label>Description *</label>
              <textarea [(ngModel)]="editForm.description" rows="3" placeholder="Describe what happened…"></textarea>
            </div>
            <div class="form-group">
              <label>Police Report #</label>
              <input [(ngModel)]="editForm.policeReport" placeholder="PP-ZG-2025-0001" />
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

    .total-warning {
      background: #fff7ed; border: 1px solid #fed7aa;
      border-radius: 8px; padding: 10px 14px;
      font-size: 13px; color: #92400e;
    }

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
export class AccidentDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Pencil, TriangleAlert };

  accident = signal<Accident | null>(null);
  loading  = signal(true);
  error    = signal('');

  // Edit state
  drivers = signal<Driver[]>([]);
  showEdit = false;
  editForm: CreateAccidentDto = this.emptyForm();
  saving = signal(false);
  formError = signal('');
  driverDisplayFn = (d: Driver) => d.fullName;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: AccidentApiService,
    private driverApi: DriverApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: a => { this.accident.set(a); this.loading.set(false); },
      error: () => { this.error.set('Failed to load accident.'); this.loading.set(false); },
    });
    this.driverApi.getAll().subscribe(d => this.drivers.set(d));
  }

  severityVariant(severity: string): BadgeVariant {
    switch (severity) {
      case 'minor': return 'success';
      case 'major': return 'warning';
      case 'total': return 'danger';
      default:      return 'neutral';
    }
  }

  goBack(): void { this.router.navigate(['/accidents']); }

  startEdit(): void {
    const a = this.accident();
    if (!a) return;
    this.editForm = {
      vehicleId: a.vehicleId,
      driverId: a.driverId,
      occurredAt: a.occurredAt.slice(0, 16),
      severity: a.severity,
      description: a.description,
      damageEstimate: a.damageEstimate,
      policeReport: a.policeReport,
      notes: a.notes,
    };
    this.formError.set('');
    this.showEdit = true;
  }

  saveEdit(): void {
    const a = this.accident();
    if (!a) return;
    if (!this.editForm.occurredAt || !this.editForm.description) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.update(a.accidentId, this.editForm).subscribe({
      next: () => {
        this.api.getById(a.accidentId).subscribe({
          next: updated => { this.accident.set(updated); this.closeEdit(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
      },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.formError.set(''); }

  private emptyForm(): CreateAccidentDto {
    return { vehicleId: 0, occurredAt: '', severity: 'minor', description: '' };
  }
}
