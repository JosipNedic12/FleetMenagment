import { Component, OnInit, OnDestroy, signal, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { InsurancePolicyApiService, VehicleApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, Paperclip } from 'lucide-angular';
import { InsurancePolicy, CreateInsurancePolicyDto, Vehicle } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { DocumentListComponent } from '../../../shared/components/document-list/document-list.component';
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button.component';
import { downloadBlob } from '../../../shared/utils/download';

@Component({
  selector: 'app-insurance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, FileUploadComponent, DocumentListComponent, VehicleLabelComponent, EuNumberPipe, PaginationComponent, ExportButtonComponent],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@insurance.list.title">Insurance Policies</h1>
          <p class="page-subtitle" i18n="@@insurance.list.subtitle">{{ totalCount() }} records</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search vehicle, insurer, policy#…" i18n-placeholder="@@insurance.list.searchPlaceholder" />
          <app-export-button (exportAs)="onExport($event)" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true" i18n="@@insurance.list.newButton">
            + New Policy
          </button>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"    (click)="onFilterChange('all')" i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'active'" (click)="onFilterChange('active')" i18n="@@COMMON.CHIPS.ACTIVE">Active</button>
        <button [class.active]="filter() === 'expired'"(click)="onFilterChange('expired')" i18n="@@COMMON.CHIPS.EXPIRED">Expired</button>
      </div>

      <!-- Table -->
      <div class="table-card">
        @if (loading()) {
          <div class="table-loading" i18n="@@insurance.list.loading">Loading…</div>
        } @else if (items().length === 0) {
          <div class="table-empty" i18n="@@insurance.list.empty">No records found.</div>
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th i18n="@@insurance.list.colVehicle">Vehicle</th>
                <th i18n="@@insurance.list.colPolicyNumber">Policy #</th>
                <th i18n="@@insurance.list.colInsurer">Insurer</th>
                <th i18n="@@insurance.list.colValidFrom">Valid From</th>
                <th i18n="@@insurance.list.colValidTo">Valid To</th>
                <th i18n="@@insurance.list.colPremium">Premium</th>
                <th i18n="@@insurance.list.colStatus">Status</th>
                <th i18n="@@insurance.list.colActions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.policyId) {
                <tr (click)="goToDetail(row)">
                  <td><app-vehicle-label [make]="row.vehicleMake" [model]="row.vehicleModel" [registration]="row.registrationNumber" /></td>
                  <td class="mono">{{ row.policyNumber }}</td>
                  <td>{{ row.insurer }}</td>
                  <td>{{ row.validFrom | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.validTo | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.premium | euNumber:'1.2-2' }} €</td>
                  <td>
                    <app-badge
                      [label]="row.isActive ? activeLabel : expiredLabel"
                      [variant]="row.isActive ? 'success' : 'danger'"
                    />
                  </td>
                  <td class="actions">
                    <button class="btn-icon" title="Documents" i18n-title="@@insurance.list.actionDocuments" (click)="$event.stopPropagation(); openDocs(row)"><lucide-icon [img]="icons.Paperclip" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" i18n-title="@@insurance.list.actionEdit" (click)="$event.stopPropagation(); startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="'Admin'" class="btn-icon danger" title="Delete" i18n-title="@@insurance.list.actionDelete" (click)="$event.stopPropagation(); confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
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
    </div>

    <!-- Create / Edit Form Modal -->
    @if (showForm) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@insurance.list.formTitle">{{ editId ? 'Edit Policy' : 'New Insurance Policy' }}</h2>

          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@insurance.list.fieldVehicle">Vehicle *</label>
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
              <label i18n="@@insurance.list.fieldPolicyNumber">Policy Number *</label>
              <input [(ngModel)]="form.policyNumber" placeholder="POL-2025-001" i18n-placeholder="@@insurance.list.fieldPolicyNumberPlaceholder" />
            </div>
            <div class="form-group">
              <label i18n="@@insurance.list.fieldInsurer">Insurer *</label>
              <input [(ngModel)]="form.insurer" placeholder="Croatia osiguranje" i18n-placeholder="@@insurance.list.fieldInsurerPlaceholder" />
            </div>
            <div class="form-group">
              <label i18n="@@insurance.list.fieldPremium">Premium (EUR) *</label>
              <input type="number" [(ngModel)]="form.premium" min="0" />
            </div>
            <div class="form-group">
              <label i18n="@@insurance.list.fieldValidFrom">Valid From *</label>
              <input type="date" [(ngModel)]="form.validFrom" />
            </div>
            <div class="form-group">
              <label i18n="@@insurance.list.fieldValidTo">Valid To *</label>
              <input type="date" [(ngModel)]="form.validTo" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@insurance.list.fieldCoverageNotes">Coverage Notes</label>
              <textarea [(ngModel)]="form.coverageNotes" rows="2" placeholder="AO + kasko…" i18n-placeholder="@@insurance.list.fieldCoverageNotesPlaceholder"></textarea>
            </div>
          </div>

          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }

          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()" i18n="@@insurance.list.cancelButton">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()" i18n="@@insurance.list.saveButton">
              {{ saving() ? 'Saving…' : editId ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirmation -->
    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Insurance Policy" i18n-title="@@insurance.list.deleteTitle"
      [message]="'Delete policy ' + (deleteTarget?.policyNumber ?? '') + '? This cannot be undone.'"
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />

    <!-- Documents modal -->
    @if (docsTarget) {
      <div class="modal-overlay" (click)="docsTarget = null">
        <div class="modal-box modal-box--wide" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@insurance.list.docsTitle">Documents — {{ docsTarget.policyNumber }}</h2>
          <app-file-upload
            [entityType]="'Insurance'"
            [entityId]="docsTarget.policyId"
            (uploaded)="docList.loadDocuments()"
          />
          <app-document-list
            #docList
            [entityType]="'Insurance'"
            [entityId]="docsTarget.policyId"
          />
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="docsTarget = null" i18n="@@insurance.list.closeButton">Close</button>
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
export class InsuranceListComponent implements OnInit, OnDestroy {
  readonly icons = { Eye, Pencil, Trash2, Paperclip };
  activeLabel  = $localize`:@@COMMON.CHIPS.ACTIVE:Active`;
  expiredLabel = $localize`:@@COMMON.CHIPS.EXPIRED:Expired`;
  readonly vehicleDisplayFn = (v: Vehicle) => `${v.make} ${v.model} – ${v.registrationNumber}`;
  @ViewChild('docList') docList!: DocumentListComponent;
  docsTarget: InsurancePolicy | null = null;
  private api = inject(InsurancePolicyApiService);
  private vehicleApi = inject(VehicleApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  // Server response
  items      = signal<InsurancePolicy[]>([]);
  totalCount = signal(0);
  totalPages = signal(0);

  // Pagination state
  page     = signal(1);
  pageSize = signal(10);

  // Filter/search/sort state
  search  = signal('');
  filter  = signal<string>('all');
  sortCol = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');

  loading  = signal(true);
  saving   = signal(false);
  formError = signal('');

  vehicles = signal<Vehicle[]>([]);
  showForm = false;
  editId: number | null = null;
  deleteTarget: InsurancePolicy | null = null;

  form: CreateInsurancePolicyDto = this.emptyForm();

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(term => {
      this.search.set(term); this.page.set(1); this.loadPage();
    });
    this.loadPage();
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
  }

  ngOnDestroy(): void { this.searchSubject.complete(); }

  loadPage(): void {
    this.loading.set(true);
    const filterObj: Record<string, any> = {};
    if (this.filter() !== 'all') filterObj['status'] = this.filter();
    this.api.getPaged(
      { page: this.page(), pageSize: this.pageSize(), search: this.search() || undefined, sortBy: this.sortCol() || undefined, sortDirection: this.sortDir() },
      filterObj
    ).subscribe({
      next: res => { this.items.set(res.items); this.totalCount.set(res.totalCount); this.totalPages.set(res.totalPages); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearchChange(term: string): void { this.searchSubject.next(term); }
  onFilterChange(value: string): void { this.filter.set(value); this.page.set(1); this.loadPage(); }
  onPageChange(p: number): void { this.page.set(p); this.loadPage(); }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.page.set(1); this.loadPage(); }

  onExport(format: 'xlsx' | 'pdf'): void {
    const filterObj: Record<string, any> = {};
    if (this.filter() !== 'all') filterObj['status'] = this.filter();
    this.api.export(format, this.search() || undefined, filterObj).subscribe(blob => {
      downloadBlob(blob, `insurance_${new Date().toISOString().slice(0,10)}.${format}`);
    });
  }

  startEdit(row: InsurancePolicy): void {
    this.editId = row.policyId;
    this.form = {
      vehicleId:     row.vehicleId,
      policyNumber:  row.policyNumber,
      insurer:       row.insurer,
      validFrom:     row.validFrom.slice(0, 10),
      validTo:       row.validTo.slice(0, 10),
      premium:       row.premium,
      coverageNotes: row.coverageNotes
    };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.vehicleId || !this.form.policyNumber || !this.form.insurer || !this.form.validFrom || !this.form.validTo) {
      this.formError.set('Please fill all required fields.'); return;
    }
    this.saving.set(true);
    this.formError.set('');

    const obs = this.editId
      ? this.api.update(this.editId, this.form)
      : this.api.create(this.form);

    obs.subscribe({
      next: () => { this.loadPage(); this.closeForm(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  goToDetail(row: InsurancePolicy): void { this.router.navigate(['/insurance', row.policyId]); }
  openDocs(row: InsurancePolicy): void { this.docsTarget = row; }
  confirmDelete(row: InsurancePolicy): void { this.deleteTarget = row; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.policyId).subscribe({
      next: () => { this.loadPage(); this.deleteTarget = null; },
      error: ()  => { this.deleteTarget = null; }
    });
  }

  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }

  private emptyForm(): CreateInsurancePolicyDto {
    return { vehicleId: 0, policyNumber: '', insurer: '', validFrom: '', validTo: '', premium: 0 };
  }
}
