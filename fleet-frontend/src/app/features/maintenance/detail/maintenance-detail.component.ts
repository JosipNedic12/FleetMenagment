import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Pencil } from 'lucide-angular';
import { MaintenanceOrderApiService, VendorApiService } from '../../../core/auth/feature-api.services';
import { MaintenanceOrder, Vendor } from '../../../core/models/models';
import { UpdateMaintenanceOrderDto } from '../../../core/models/maintenance.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';

@Component({
  selector: 'app-maintenance-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BadgeComponent, LucideAngularModule, HasRoleDirective, SearchSelectComponent, EuNumberPipe],
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard" i18n="@@maintenance.breadcrumb.dashboard">Dashboard</a>
        <span class="bc-sep">›</span>
        <a routerLink="/maintenance" i18n="@@maintenance.breadcrumb.maintenance">Maintenance</a>
        <span class="bc-sep">›</span>
        <span i18n="@@maintenance.breadcrumb.orderDetail">Order #{{ order()?.orderId ?? 'Detail' }}</span>
      </nav>

      <div class="page-header">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="back-btn" (click)="goBack()">
            <lucide-icon [img]="icons.ArrowLeft" [size]="16" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@maintenance.breadcrumb.maintenance">Maintenance</ng-container>
          </button>
          <div>
            @if (order()) {
              <h1 class="page-title" i18n="@@maintenance.detail.title">Maintenance Order #{{ order()!.orderId }} · {{ order()!.vehicleMake }} {{ order()!.vehicleModel }}</h1>
              <p class="page-subtitle" i18n="@@maintenance.detail.subtitle"><span class="mono">{{ order()!.registrationNumber }}</span> · Reported {{ order()!.reportedAt | date:'dd.MM.yyyy' }}{{ order()!.vendorName ? ' · ' + order()!.vendorName : '' }}</p>
            } @else {
              <h1 class="page-title" i18n="@@maintenance.detail.titleFallback">Maintenance Detail</h1>
            }
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px">
          <button *hasRole="['Admin','FleetManager']" class="btn btn-secondary" (click)="startEdit()" [disabled]="!order()">
            <lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@maintenance.action.edit">Edit</ng-container>
          </button>
          @if (order()) {
            <app-badge
              [label]="statusLabel(order()!.status)"
              [variant]="statusVariant(order()!.status)"
            />
          }
        </div>
      </div>

      @if (loading()) {
        <div class="table-loading" i18n="@@maintenance.detail.loading">Loading…</div>
      } @else if (error()) {
        <div class="table-empty">{{ error() }}</div>
      } @else if (!order()) {
        <div class="table-empty" i18n="@@maintenance.detail.notFound">Maintenance order not found.</div>
      } @else {
        <div class="overview-grid">

          <!-- Order Info -->
          <div class="info-group">
            <div class="info-group-title" i18n="@@maintenance.detail.sectionOrderInfo">Order Info</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.detail.labelOrderId">Order ID</span>
                <span class="kv-value mono">{{ order()!.orderId }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.col.status">Status</span>
                <span class="kv-value">
                  <app-badge [label]="statusLabel(order()!.status)" [variant]="statusVariant(order()!.status)" />
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.col.vehicle">Vehicle</span>
                <span class="kv-value">{{ order()!.vehicleMake }} {{ order()!.vehicleModel }}<br><span class="mono" style="font-size:12px; color:var(--text-muted)">{{ order()!.registrationNumber }}</span></span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.col.vendor">Vendor</span>
                <span class="kv-value">{{ order()!.vendorName || '—' }}</span>
              </div>
              <div class="kv-row kv-full">
                <span class="kv-label" i18n="@@maintenance.form.descriptionOptional">Description</span>
                <span class="kv-value">{{ order()!.description || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Dates & Cost -->
          <div class="info-group">
            <div class="info-group-title" i18n="@@maintenance.detail.sectionDatesCost">Dates &amp; Cost</div>
            <div class="kv-grid">
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.col.reported">Reported</span>
                <span class="kv-value">{{ order()!.reportedAt | date:'dd.MM.yyyy' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.col.scheduled">Scheduled</span>
                <span class="kv-value">{{ order()!.scheduledAt ? (order()!.scheduledAt | date:'dd.MM.yyyy') : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.detail.labelClosed">Closed</span>
                <span class="kv-value">{{ order()!.closedAt ? (order()!.closedAt | date:'dd.MM.yyyy') : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.detail.labelOdometer">Odometer</span>
                <span class="kv-value">{{ order()!.odometerKm != null ? (order()!.odometerKm | euNumber) + ' km' : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.col.total">Total Cost</span>
                <span class="kv-value">{{ order()!.totalCost != null ? (order()!.totalCost | euNumber:'1.2-2') + ' €' : '—' }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label" i18n="@@maintenance.detail.labelCancelReason">Cancel Reason</span>
                <span class="kv-value">{{ order()!.cancelReason || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Items -->
          @if (order()!.items && order()!.items.length > 0) {
            <div class="info-group info-group--full">
              <div class="info-group-title" i18n="@@maintenance.detail.sectionItems">Maintenance Items</div>
              <table class="table">
                <thead>
                  <tr>
                    <th i18n="@@maintenance.form.type">Type</th>
                    <th i18n="@@maintenance.form.partsCost">Parts Cost</th>
                    <th i18n="@@maintenance.form.laborCost">Labor Cost</th>
                    <th i18n="@@maintenance.col.total">Total</th>
                    <th i18n="@@maintenance.form.notes">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of order()!.items; track item.itemId) {
                    <tr>
                      <td>{{ item.maintenanceTypeName }}</td>
                      <td>{{ item.partsCost | euNumber:'1.2-2' }} €</td>
                      <td>{{ item.laborCost | euNumber:'1.2-2' }} €</td>
                      <td>{{ item.totalCost | euNumber:'1.2-2' }} €</td>
                      <td>{{ item.notes || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

        </div>
      }
    </div>

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@maintenance.edit.title">Edit Order</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@maintenance.form.vendorOptional">Vendor</label>
              <app-search-select
                [items]="vendors()"
                [displayFn]="vendorDisplayFn"
                valueField="vendorId"
                placeholder="No vendor"
                i18n-placeholder="@@maintenance.form.noVendor"
                [(ngModel)]="editForm.vendorId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@maintenance.form.scheduledAtOptional">Scheduled At</label>
              <input type="datetime-local" [(ngModel)]="editForm.scheduledAt" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@maintenance.form.descriptionOptional">Description</label>
              <textarea [(ngModel)]="editForm.description" rows="3"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeEdit()" i18n="@@maintenance.btn.cancel">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
              @if (saving()) { <span class="btn-spinner"></span><ng-container i18n="@@maintenance.btn.saving"> Saving…</ng-container> } @else { <ng-container i18n="@@maintenance.btn.update">Update</ng-container> }
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
export class MaintenanceDetailComponent implements OnInit {
  readonly icons = { ArrowLeft, Pencil };

  order   = signal<MaintenanceOrder | null>(null);
  loading = signal(true);
  error   = signal('');

  // Edit state
  vendors = signal<Vendor[]>([]);
  showEdit = false;
  editForm: UpdateMaintenanceOrderDto = {};
  saving = signal(false);
  formError = signal('');
  vendorDisplayFn = (v: Vendor) => v.name;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: MaintenanceOrderApiService,
    private vendorApi: VendorApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: o => { this.order.set(o); this.loading.set(false); },
      error: () => { this.error.set('Failed to load maintenance order.'); this.loading.set(false); },
    });
    this.vendorApi.getAll().subscribe(v => this.vendors.set(v));
  }

  goBack(): void { this.router.navigate(['/maintenance']); }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      open:        'Otvoreno',
      in_progress: 'U tijeku',
      closed:      'Zatvoreno',
      cancelled:   'Otkazano',
    };
    return labels[status] ?? status;
  }

  statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'closed':      return 'success';
      case 'in_progress': return 'warning';
      case 'cancelled':   return 'danger';
      default:            return 'neutral';
    }
  }

  startEdit(): void {
    const o = this.order();
    if (!o) return;
    this.editForm = { vendorId: o.vendorId, scheduledAt: o.scheduledAt?.slice(0, 16), description: o.description };
    this.formError.set('');
    this.showEdit = true;
  }

  saveEdit(): void {
    const o = this.order();
    if (!o) return;
    this.saving.set(true);
    this.api.update(o.orderId, this.editForm).subscribe({
      next: () => {
        this.api.getById(o.orderId).subscribe({
          next: updated => { this.order.set(updated); this.closeEdit(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
      },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.formError.set(''); }
}
