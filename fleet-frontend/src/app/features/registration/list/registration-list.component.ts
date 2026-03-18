import { Component, OnInit, signal, computed, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RegistrationApiService, VehicleApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, Paperclip } from 'lucide-angular';
import { RegistrationRecord, CreateRegistrationRecordDto, Vehicle } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { DocumentListComponent } from '../../../shared/components/document-list/document-list.component';

@Component({
  selector: 'app-registration-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, FileUploadComponent, DocumentListComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Registration Records</h1>
          <p class="page-subtitle">{{ filtered().length }} records</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search vehicle, reg #…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true">+ New Record</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"    (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'active'" (click)="filter.set('active')">Active</button>
        <button [class.active]="filter() === 'expired'"(click)="filter.set('expired')">Expired</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty">No records found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Registration #</th>
                <th>Valid From</th>
                <th>Valid To</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.registrationId) {
                <tr (click)="goToDetail(row)">
                  <td><strong>{{ row.vehicleRegistrationNumber }}</strong></td>
                  <td class="mono">{{ row.registrationNumber }}</td>
                  <td>{{ row.validFrom | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.validTo | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.fee != null ? (row.fee | currency:'EUR':'symbol':'1.2-2') : '—' }}</td>
                  <td>
                    <app-badge [label]="row.isActive ? 'Active' : 'Expired'" [variant]="row.isActive ? 'success' : 'danger'" />
                  </td>
                  <td class="actions">
                    <button class="btn-icon" title="Documents" (click)="$event.stopPropagation(); openDocs(row)"><lucide-icon [img]="icons.Paperclip" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" (click)="$event.stopPropagation(); startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="'Admin'" class="btn-icon danger" (click)="$event.stopPropagation(); confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    @if (showForm) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">{{ editId ? 'Edit Registration' : 'New Registration Record' }}</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Vehicle *</label>
              <app-search-select
                [items]="vehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                placeholder="Select vehicle…"
                [disabled]="!!editId"
                [(ngModel)]="form.vehicleId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label>Registration # *</label>
              <input [(ngModel)]="form.registrationNumber" placeholder="PD-2025-ZG1234AB" />
            </div>
            <div class="form-group">
              <label>Valid From *</label>
              <input type="date" [(ngModel)]="form.validFrom" />
            </div>
            <div class="form-group">
              <label>Valid To *</label>
              <input type="date" [(ngModel)]="form.validTo" />
            </div>
            <div class="form-group">
              <label>Fee (EUR)</label>
              <input type="number" [(ngModel)]="form.fee" min="0" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <input [(ngModel)]="form.notes" placeholder="Optional notes" />
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : editId ? 'Update' : 'Create' }}</button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal [visible]="!!deleteTarget" title="Delete Registration Record" message="Delete this registration record?" (confirmed)="doDelete()" (cancelled)="deleteTarget = null" />

    @if (docsTarget) {
      <div class="modal-overlay" (click)="docsTarget = null">
        <div class="modal-box modal-box--wide" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Documents — {{ docsTarget.registrationNumber }}</h2>
          <app-file-upload
            [entityType]="'Registration'"
            [entityId]="docsTarget.registrationId"
            (uploaded)="docList.loadDocuments()"
          />
          <app-document-list
            #docList
            [entityType]="'Registration'"
            [entityId]="docsTarget.registrationId"
          />
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="docsTarget = null">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-box--wide { width: min(720px, 95vw); }
    tbody tr { cursor:pointer; transition:background 0.12s; }
    tbody tr:hover { background:var(--hover-bg); }
  `]
})
export class RegistrationListComponent implements OnInit {
  readonly icons = { Eye, Pencil, Trash2, Paperclip };
  readonly vehicleDisplayFn = (v: Vehicle) => `${v.registrationNumber} – ${v.make} ${v.model}`;
  @ViewChild('docList') docList!: DocumentListComponent;
  docsTarget: RegistrationRecord | null = null;
  records  = signal<RegistrationRecord[]>([]);
  vehicles = signal<Vehicle[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = signal(''); showForm = false; editId: number | null = null;
  deleteTarget: RegistrationRecord | null = null;
  filter = signal<'all' | 'active' | 'expired'>('all');
  form: CreateRegistrationRecordDto = this.emptyForm();

  filtered = computed(() => {
    let list = this.records();
    if (this.filter() === 'active')  list = list.filter(r => r.isActive);
    if (this.filter() === 'expired') list = list.filter(r => !r.isActive);
    const q = this.search().toLowerCase();
    if (q) list = list.filter(r => r.vehicleRegistrationNumber.toLowerCase().includes(q) || r.registrationNumber.toLowerCase().includes(q));
    return list;
  });

  private router = inject(Router);

  constructor(private api: RegistrationApiService, private vehicleApi: VehicleApiService, public auth: AuthService) {}

  ngOnInit(): void { this.load(); this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v)); }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({ next: d => { this.records.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  startEdit(row: RegistrationRecord): void {
    this.editId = row.registrationId;
    this.form = { vehicleId: row.vehicleId, registrationNumber: row.registrationNumber, validFrom: row.validFrom.slice(0,10), validTo: row.validTo.slice(0,10), fee: row.fee, notes: row.notes };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.vehicleId || !this.form.registrationNumber || !this.form.validFrom || !this.form.validTo) { this.formError.set('Fill all required fields.'); return; }
    this.saving.set(true);
    const obs = this.editId ? this.api.update(this.editId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.load(); this.closeForm(); this.saving.set(false); }, error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); } });
  }

  goToDetail(row: RegistrationRecord): void { this.router.navigate(['/registration', row.registrationId]); }

  openDocs(row: RegistrationRecord): void { this.docsTarget = row; }

  confirmDelete(row: RegistrationRecord): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.registrationId).subscribe({ next: () => { this.load(); this.deleteTarget = null; }, error: () => { this.deleteTarget = null; } });
  }
  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }
  private emptyForm(): CreateRegistrationRecordDto { return { vehicleId: 0, registrationNumber: '', validFrom: '', validTo: '' }; }
}