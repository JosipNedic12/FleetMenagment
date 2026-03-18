import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InspectionApiService, VehicleApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, Paperclip } from 'lucide-angular';
import { Inspection, CreateInspectionDto, Vehicle } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { DocumentListComponent } from '../../../shared/components/document-list/document-list.component';

@Component({
  selector: 'app-inspections-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, FileUploadComponent, DocumentListComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Inspections</h1>
          <p class="page-subtitle">{{ filtered().length }} records</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search vehicle…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true">+ Add Inspection</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"         (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'passed'"      (click)="filter.set('passed')">Passed</button>
        <button [class.active]="filter() === 'failed'"      (click)="filter.set('failed')">Failed</button>
        <button [class.active]="filter() === 'conditional'" (click)="filter.set('conditional')">Conditional</button>
      </div>

      <div class="table-card">
        @if (loading()) { <div class="table-loading">Loading…</div> }
        @else if (filtered().length === 0) { <div class="table-empty">No inspections found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Inspected At</th>
                <th>Valid To</th>
                <th>Result</th>
                <th>Odometer (km)</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.inspectionId) {
                <tr (click)="goToDetail(row)">
                  <td><strong>{{ row.registrationNumber }}</strong></td>
                  <td>{{ row.inspectedAt | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.validTo ? (row.validTo | date:'dd.MM.yyyy') : '—' }}</td>
                  <td>
                    <app-badge
                      [label]="row.result"
                      [variant]="row.result === 'passed' ? 'success' : row.result === 'failed' ? 'danger' : 'warning'"
                    />
                  </td>
                  <td>{{ row.odometerKm != null ? (row.odometerKm | number) : '—' }}</td>
                  <td class="notes-cell">{{ row.notes ?? '—' }}</td>
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
          <h2 class="modal-title">{{ editId ? 'Edit Inspection' : 'Add Inspection' }}</h2>
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
              <label>Result *</label>
              <select [(ngModel)]="form.result">
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="conditional">Conditional</option>
              </select>
            </div>
            <div class="form-group">
              <label>Inspected At *</label>
              <input type="date" [(ngModel)]="form.inspectedAt" />
            </div>
            <div class="form-group">
              <label>Valid To</label>
              <input type="date" [(ngModel)]="form.validTo" />
            </div>
            <div class="form-group">
              <label>Odometer (km)</label>
              <input type="number" [(ngModel)]="form.odometerKm" min="0" />
            </div>
            <div class="form-group">
              <label>Notes {{ form.result === 'failed' ? '*' : '' }}</label>
              <input [(ngModel)]="form.notes" placeholder="Required if failed" />
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

    <app-confirm-modal [visible]="!!deleteTarget" title="Delete Inspection" message="Delete this inspection record?" (confirmed)="doDelete()" (cancelled)="deleteTarget = null" />

    @if (docsTarget) {
      <div class="modal-overlay" (click)="docsTarget = null">
        <div class="modal-box modal-box--wide" (click)="$event.stopPropagation()">
          <h2 class="modal-title">Documents — {{ docsTarget.registrationNumber }} ({{ docsTarget.inspectedAt | date:'dd.MM.yyyy' }})</h2>
          <app-file-upload
            [entityType]="'Inspection'"
            [entityId]="docsTarget.inspectionId"
            (uploaded)="docList.loadDocuments()"
          />
          <app-document-list
            #docList
            [entityType]="'Inspection'"
            [entityId]="docsTarget.inspectionId"
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
export class InspectionsListComponent implements OnInit {
  readonly icons = { Eye, Pencil, Trash2, Paperclip };
  readonly vehicleDisplayFn = (v: Vehicle) => v.registrationNumber;
  @ViewChild('docList') docList!: DocumentListComponent;
  docsTarget: Inspection | null = null;
  inspections = signal<Inspection[]>([]);
  vehicles    = signal<Vehicle[]>([]);
  loading = signal(true); saving = signal(false); formError = signal('');
  search = signal(''); showForm = false; editId: number | null = null;
  deleteTarget: Inspection | null = null;
  filter = signal<'all' | 'passed' | 'failed' | 'conditional'>('all');
  form: CreateInspectionDto = this.emptyForm();

  filtered = computed(() => {
    let list = this.inspections();
    if (this.filter() !== 'all') list = list.filter(i => i.result === this.filter());
    const q = this.search().toLowerCase();
    if (q) list = list.filter(i => i.registrationNumber.toLowerCase().includes(q));
    return list;
  });

  private router = inject(Router);

  constructor(private api: InspectionApiService, private vehicleApi: VehicleApiService, public auth: AuthService) {}

  ngOnInit(): void { this.load(); this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v)); }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({ next: d => { this.inspections.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  startEdit(row: Inspection): void {
    this.editId = row.inspectionId;
    this.form = { vehicleId: row.vehicleId, inspectedAt: row.inspectedAt.slice(0,10), validTo: row.validTo?.slice(0,10), result: row.result, notes: row.notes, odometerKm: row.odometerKm };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.vehicleId || !this.form.inspectedAt || !this.form.result) { this.formError.set('Fill all required fields.'); return; }
    if (this.form.result === 'failed' && !this.form.notes) { this.formError.set('Notes are required when result is Failed.'); return; }
    this.saving.set(true);
    const obs = this.editId ? this.api.update(this.editId, this.form) : this.api.create(this.form);
    obs.subscribe({ next: () => { this.load(); this.closeForm(); this.saving.set(false); }, error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); } });
  }

  goToDetail(row: Inspection): void { this.router.navigate(['/inspections', row.inspectionId]); }

  openDocs(row: Inspection): void { this.docsTarget = row; }

  confirmDelete(row: Inspection): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.inspectionId).subscribe({ next: () => { this.load(); this.deleteTarget = null; }, error: () => { this.deleteTarget = null; } });
  }
  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }
  private emptyForm(): CreateInspectionDto { return { vehicleId: 0, inspectedAt: '', result: 'passed' }; }
}