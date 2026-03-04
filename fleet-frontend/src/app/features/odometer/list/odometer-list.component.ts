import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OdometerLogApiService, VehicleApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2 } from 'lucide-angular';
import { OdometerLog, CreateOdometerLogDto, Vehicle } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-odometer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent, HasRoleDirective, LucideAngularModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Odometer Logs</h1>
          <p class="page-subtitle">{{ logs().length }} entries for selected vehicle</p>
        </div>
        <div class="header-actions">
          <select class="search-input" [(ngModel)]="selectedVehicleId" (ngModelChange)="onVehicleChange($event)">
            <option [ngValue]="0">Select vehicle…</option>
            @for (v of vehicles(); track v.vehicleId) {
              <option [ngValue]="v.vehicleId">{{ v.registrationNumber }} – {{ v.make }} {{ v.model }} ({{ v.currentOdometerKm | number }} km)</option>
            }
          </select>
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" [disabled]="!selectedVehicleId" (click)="openCreate()">+ Add Reading</button>
        </div>
      </div>

      @if (!selectedVehicleId) {
        <div class="empty-state">Select a vehicle to view its odometer log.</div>
      } @else {
        <div class="table-card">
          @if (loading()) { <div class="table-loading">Loading…</div> }
          @else if (logs().length === 0) { <div class="table-empty">No odometer entries for this vehicle.</div> }
          @else {
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reading (km)</th>
                  <th>Notes</th>
                  <th>Logged At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of sortedLogs(); track row.logId) {
                  <tr>
                    <td>{{ row.logDate | date:'dd.MM.yyyy' }}</td>
                    <td><strong>{{ row.odometerKm | number }} km</strong></td>
                    <td class="notes-cell">{{ row.notes ?? '—' }}</td>
                    <td>{{ row.createdAt | date:'dd.MM.yyyy HH:mm' }}</td>
                    <td class="actions">
                      <button *hasRole="'Admin'" class="btn-icon danger" (click)="confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>

    <!-- Create Modal -->
    @if (showCreate) {
      <div class="modal-overlay" (click)="closeCreate()">
        <div class="modal-box" style="max-width:420px" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Add Odometer Reading</h2>
          <p class="modal-sub">
            Current reading: <strong>{{ selectedVehicle()?.currentOdometerKm | number }} km</strong>
          </p>
          <div class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group">
              <label>Reading (km) *</label>
              <input type="number" [(ngModel)]="form.odometerKm" [min]="(selectedVehicle()?.currentOdometerKm ?? 0) + 1" />
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input type="date" [(ngModel)]="form.logDate" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreate()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Add Reading' }}
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Reading"
      message="Delete this odometer entry? This cannot be undone."
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
  private api = inject(OdometerLogApiService);
  private vehicleApi = inject(VehicleApiService);
  auth = inject(AuthService);

  logs     = signal<OdometerLog[]>([]);
  vehicles = signal<Vehicle[]>([]);
  loading = signal(false); saving = signal(false); formError = signal('');
  selectedVehicleId = 0;
  showCreate = false;
  deleteTarget: OdometerLog | null = null;
  form: CreateOdometerLogDto = { vehicleId: 0, odometerKm: 0, logDate: '' };

  selectedVehicle = computed(() => this.vehicles().find(v => v.vehicleId === this.selectedVehicleId));
  sortedLogs = computed(() => [...this.logs()].sort((a, b) => b.odometerKm - a.odometerKm));

  ngOnInit(): void {
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
  }

  onVehicleChange(vehicleId: number): void {
    if (!vehicleId) { this.logs.set([]); return; }
    this.loading.set(true);
    this.api.getByVehicle(vehicleId).subscribe({
      next: d => { this.logs.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
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
      next: () => { this.onVehicleChange(this.selectedVehicleId); this.vehicleApi.getAll().subscribe(v2 => this.vehicles.set(v2)); this.closeCreate(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeCreate(): void { this.showCreate = false; this.formError.set(''); }

  confirmDelete(row: OdometerLog): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.logId).subscribe({
      next: () => { this.onVehicleChange(this.selectedVehicleId); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }
}
