import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OdometerLogApiService, VehicleApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2 } from 'lucide-angular';
import { OdometerLog, CreateOdometerLogDto, Vehicle } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button.component';
import { downloadBlob } from '../../../shared/utils/download';

@Component({
  selector: 'app-odometer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, EuNumberPipe, PaginationComponent, ExportButtonComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@odometer.title">Odometer Logs</h1>
          <p class="page-subtitle" i18n="@@odometer.subtitle">{{ totalCount() }} entries for selected vehicle</p>
        </div>
        <div class="header-actions">
          <div style="width:320px">
            <app-search-select
              [items]="vehicles()"
              [displayFn]="vehicleDisplayFn"
              valueField="vehicleId"
              placeholder="Select vehicle…"
              i18n-placeholder="@@odometer.selectVehiclePlaceholder"
              [(ngModel)]="selectedVehicleId"
              (ngModelChange)="onVehicleChange($event)">
            </app-search-select>
          </div>
          @if (selectedVehicleId) {
            <app-export-button (exportAs)="onExport($event)" />
          }
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" [disabled]="!selectedVehicleId" (click)="openCreate()" i18n="@@odometer.addReadingBtn">+ Add Reading</button>
        </div>
      </div>

      @if (!selectedVehicleId) {
        <div class="empty-state" i18n="@@odometer.selectVehiclePrompt">Select a vehicle to view its odometer log.</div>
      } @else {
        <div class="table-card">
          @if (loading()) { <div class="table-loading" i18n="@@odometer.loading">Loading…</div> }
          @else if (items().length === 0) { <div class="table-empty" i18n="@@odometer.noEntries">No odometer entries for this vehicle.</div> }
          @else {
            <table class="table">
              <thead>
                <tr>
                  <th i18n="@@odometer.colDate">Date</th>
                  <th i18n="@@odometer.colReading">Reading (km)</th>
                  <th i18n="@@odometer.colNotes">Notes</th>
                  <th i18n="@@odometer.colLoggedAt">Logged At</th>
                  <th i18n="@@odometer.colActions">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of items(); track row.logId) {
                  <tr>
                    <td>{{ row.logDate | date:'dd.MM.yyyy' }}</td>
                    <td><strong>{{ row.odometerKm | euNumber }} km</strong></td>
                    <td class="notes-cell">{{ row.notes ?? '—' }}</td>
                    <td>{{ row.createdAt | date:'dd.MM.yyyy HH:mm' }}</td>
                    <td class="actions">
                      <button *hasRole="'Admin'" class="btn-icon danger" (click)="confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <app-pagination
              [page]="page()"
              [pageSize]="pageSize()"
              [totalCount]="totalCount()"
              [totalPages]="totalPages()"
              (pageChange)="onPageChange($event)"
              (pageSizeChange)="onPageSizeChange($event)"
            />
          }
        </div>
      }
    </div>

    <!-- Create Modal -->
    @if (showCreate) {
      <div class="modal-overlay" (click)="closeCreate()">
        <div class="modal-box" style="max-width:420px" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@odometer.modalTitle">Add Odometer Reading</h2>
          <p class="modal-sub">
            <ng-container i18n="@@odometer.currentReading">Current reading:</ng-container> <strong>{{ selectedVehicle()?.currentOdometerKm | euNumber }} km</strong>
          </p>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label i18n="@@odometer.labelReading">Reading (km) *</label>
              <input type="number" [(ngModel)]="form.odometerKm" [min]="(selectedVehicle()?.currentOdometerKm ?? 0) + 1" />
            </div>
            <div class="form-group">
              <label i18n="@@odometer.labelDate">Date *</label>
              <input type="date" [(ngModel)]="form.logDate" />
            </div>
            <div class="form-group">
              <label i18n="@@odometer.labelNotes">Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreate()" i18n="@@odometer.cancelBtn">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              @if (saving()) {
                <ng-container i18n="@@odometer.saving">Saving…</ng-container>
              } @else {
                <ng-container i18n="@@odometer.addReadingSubmit">Add Reading</ng-container>
              }
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Reading"
      i18n-title="@@odometer.deleteTitle"
      message="Delete this odometer entry? This cannot be undone."
      i18n-message="@@odometer.deleteMessage"
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    .modal-sub { font-size:13px; color:var(--text-muted); margin:-4px 0 16px; }
  `]
})
export class OdometerListComponent implements OnInit {
  readonly icons = { Eye, Pencil, Trash2 };
  readonly vehicleDisplayFn = (v: Vehicle) => `${v.make} ${v.model} – ${v.registrationNumber} (${v.currentOdometerKm?.toLocaleString()} km)`;
  private api = inject(OdometerLogApiService);
  private vehicleApi = inject(VehicleApiService);
  auth = inject(AuthService);

  // Server response
  items      = signal<OdometerLog[]>([]);
  totalCount = signal(0);
  totalPages = signal(0);

  // Pagination state
  page     = signal(1);
  pageSize = signal(10);

  vehicles          = signal<Vehicle[]>([]);
  loading           = signal(false);
  saving            = signal(false);
  formError         = signal('');
  selectedVehicleId = 0;
  showCreate        = false;
  deleteTarget: OdometerLog | null = null;
  form: CreateOdometerLogDto = { vehicleId: 0, odometerKm: 0, logDate: '' };

  selectedVehicle = computed(() => this.vehicles().find(v => v.vehicleId === this.selectedVehicleId));

  ngOnInit(): void {
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
  }

  onVehicleChange(vehicleId: number): void {
    if (!vehicleId) { this.items.set([]); this.totalCount.set(0); this.totalPages.set(0); return; }
    this.page.set(1);
    this.loadPage();
  }

  loadPage(): void {
    if (!this.selectedVehicleId) return;
    this.loading.set(true);
    this.api.getPaged(
      { page: this.page(), pageSize: this.pageSize(), sortBy: 'odometerKm', sortDirection: 'desc' },
      { vehicleId: this.selectedVehicleId }
    ).subscribe({
      next: res => { this.items.set(res.items); this.totalCount.set(res.totalCount); this.totalPages.set(res.totalPages); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onPageChange(p: number): void { this.page.set(p); this.loadPage(); }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.page.set(1); this.loadPage(); }

  onExport(format: 'xlsx' | 'pdf'): void {
    this.api.export(format, undefined, { vehicleId: this.selectedVehicleId }).subscribe(blob => {
      downloadBlob(blob, `odometer_${new Date().toISOString().slice(0,10)}.${format}`);
    });
  }

  openCreate(): void {
    const v = this.selectedVehicle();
    this.form = {
      vehicleId: this.selectedVehicleId,
      odometerKm: v ? v.currentOdometerKm + 1 : 0,
      logDate: new Date().toISOString().slice(0, 10)
    };
    this.formError.set(''); this.showCreate = true;
  }

  save(): void {
    const v = this.selectedVehicle();
    if (!this.form.odometerKm || !this.form.logDate) { this.formError.set('Fill all required fields.'); return; }
    if (v && this.form.odometerKm <= v.currentOdometerKm) {
      this.formError.set(`Reading must be greater than current odometer (${v.currentOdometerKm} km).`); return;
    }
    this.saving.set(true);
    this.api.create(this.form).subscribe({
      next: () => {
        this.vehicleApi.getAll().subscribe(v2 => this.vehicles.set(v2));
        this.loadPage();
        this.closeCreate();
        this.saving.set(false);
      },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeCreate(): void { this.showCreate = false; this.formError.set(''); }

  confirmDelete(row: OdometerLog): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.logId).subscribe({
      next: () => { this.loadPage(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }
}
