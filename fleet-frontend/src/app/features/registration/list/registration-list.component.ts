import { Component, OnInit, OnDestroy, signal, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
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
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button.component';
import { FilterPanelComponent, FilterField } from '../../../shared/components/filter-panel/filter-panel.component';
import { downloadBlob, extractFilename } from '../../../shared/utils/download';

@Component({
  selector: 'app-registration-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, FileUploadComponent, DocumentListComponent, VehicleLabelComponent, EuNumberPipe, PaginationComponent, ExportButtonComponent, FilterPanelComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@registration.list.title">Registration Records</h1>
          <p class="page-subtitle" i18n="@@registration.list.subtitle">{{ totalCount() }} records</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search vehicle, reg #…" i18n-placeholder="@@registration.list.searchPlaceholder" />
          <app-export-button (exportAs)="onExport($event)" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true" i18n="@@registration.list.newRecord">+ New Record</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"    (click)="onFilterChange('all')" i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'active'" (click)="onFilterChange('active')" i18n="@@COMMON.CHIPS.ACTIVE">Active</button>
        <button [class.active]="filter() === 'expired'"(click)="onFilterChange('expired')" i18n="@@COMMON.CHIPS.EXPIRED">Expired</button>
      </div>

      <app-filter-panel
        [fields]="filterFields"
        [appliedFilters]="appliedFilters()"
        (filtersApplied)="onFiltersApplied($event)"
        (filtersCleared)="onFiltersCleared()"
      />

      <div class="table-card">
        @if (loading()) { <div class="table-loading" i18n="@@registration.list.loading">Loading…</div> }
        @else if (items().length === 0) { <div class="table-empty" i18n="@@registration.list.empty">No records found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th i18n="@@registration.table.vehicle">Vehicle</th>
                <th i18n="@@registration.table.registrationNumber">Registration #</th>
                <th i18n="@@registration.table.validFrom">Valid From</th>
                <th i18n="@@registration.table.validTo">Valid To</th>
                <th i18n="@@registration.table.fee">Fee</th>
                <th i18n="@@registration.table.status">Status</th>
                <th i18n="@@registration.table.actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.registrationId) {
                <tr>
                  <td><a [routerLink]="['/registration', row.registrationId]" class="name-link"><app-vehicle-label [make]="row.vehicleMake" [model]="row.vehicleModel" [registration]="row.vehicleRegistrationNumber" /></a></td>
                  <td class="mono">{{ row.registrationNumber }}</td>
                  <td>{{ row.validFrom | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.validTo | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.fee != null ? (row.fee | euNumber:'1.2-2') + ' €' : '—' }}</td>
                  <td>
                    <app-badge [label]="row.isActive ? activeLabel : expiredLabel" [variant]="row.isActive ? 'success' : 'danger'" />
                  </td>
                  <td class="actions">
                    <button class="btn-icon" title="Documents" (click)="openDocs(row)"><lucide-icon [img]="icons.Paperclip" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" (click)="startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
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
    </div>

    @if (showForm) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          @if (editId) {
            <h2 class="modal-title" i18n="@@registration.form.editTitle">Edit Registration</h2>
          } @else {
            <h2 class="modal-title" i18n="@@registration.form.newTitle">New Registration Record</h2>
          }
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@registration.form.vehicleLabel">Vehicle *</label>
              <app-search-select
                [items]="vehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                placeholder="Select vehicle…" i18n-placeholder="@@registration.form.vehiclePlaceholder"
                [disabled]="!!editId"
                [(ngModel)]="form.vehicleId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@registration.form.registrationNumberLabel">Registration # *</label>
              <input [(ngModel)]="form.registrationNumber" placeholder="PD-2025-ZG1234AB" i18n-placeholder="@@registration.form.registrationNumberPlaceholder" />
            </div>
            <div class="form-group">
              <label i18n="@@registration.form.validFromLabel">Valid From *</label>
              <input type="date" [(ngModel)]="form.validFrom" />
            </div>
            <div class="form-group">
              <label i18n="@@registration.form.validToLabel">Valid To *</label>
              <input type="date" [(ngModel)]="form.validTo" />
            </div>
            <div class="form-group">
              <label i18n="@@registration.form.feeLabel">Fee (EUR)</label>
              <input type="number" [(ngModel)]="form.fee" min="0" />
            </div>
            <div class="form-group">
              <label i18n="@@registration.form.notesLabel">Notes</label>
              <input [(ngModel)]="form.notes" placeholder="Optional notes" i18n-placeholder="@@registration.form.notesPlaceholder" />
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()" i18n="@@registration.form.cancel">Cancel</button>
            @if (saving()) {
              <button class="btn btn-primary" [disabled]="true" i18n="@@registration.form.saving">Saving…</button>
            } @else if (editId) {
              <button class="btn btn-primary" (click)="save()" i18n="@@registration.form.update">Update</button>
            } @else {
              <button class="btn btn-primary" (click)="save()" i18n="@@registration.form.create">Create</button>
            }
          </div>
        </div>
      </div>
    }

    <app-confirm-modal [visible]="!!deleteTarget" title="Delete Registration Record" i18n-title="@@registration.delete.title" message="Delete this registration record?" i18n-message="@@registration.delete.message" (confirmed)="doDelete()" (cancelled)="deleteTarget = null" />

    @if (docsTarget) {
      <div class="modal-overlay" (click)="docsTarget = null">
        <div class="modal-box modal-box--wide" (click)="$event.stopPropagation()">
          <h2 class="modal-title"><ng-container i18n="@@registration.docs.title">Documents —</ng-container> {{ docsTarget.registrationNumber }}</h2>
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
            <button class="btn btn-secondary" (click)="docsTarget = null" i18n="@@registration.docs.close">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .name-link { color: inherit; text-decoration: none; }
    .name-link:hover { color: var(--brand); }
    .name-link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 2px; }
  `]
})
export class RegistrationListComponent implements OnInit, OnDestroy {
  readonly icons = { Eye, Pencil, Trash2, Paperclip };
  activeLabel  = $localize`:@@COMMON.CHIPS.ACTIVE:Active`;
  expiredLabel = $localize`:@@COMMON.CHIPS.EXPIRED:Expired`;
  readonly vehicleDisplayFn = (v: Vehicle) => `${v.make} ${v.model} – ${v.registrationNumber}`;
  @ViewChild('docList') docList!: DocumentListComponent;
  docsTarget: RegistrationRecord | null = null;

  private api = inject(RegistrationApiService);
  private vehicleApi = inject(VehicleApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  // Server response
  items      = signal<RegistrationRecord[]>([]);
  totalCount = signal(0);
  totalPages = signal(0);

  // Pagination state
  page     = signal(1);
  pageSize = signal(10);

  // Filter/search state
  search         = signal('');
  filter         = signal<string>('all');
  appliedFilters = signal<Record<string, any>>({});

  filterFields: FilterField[] = [
    {
      key: 'status', label: $localize`:@@registration.filter.status:Status`, type: 'select',
      options: [
        { value: 'active',  label: $localize`:@@COMMON.CHIPS.ACTIVE:Aktivno` },
        { value: 'expired', label: $localize`:@@COMMON.CHIPS.EXPIRED:Isteklo` },
      ]
    },
    { key: 'vehicleId', label: $localize`:@@COMMON.FILTER.vehicle:Vozilo`, type: 'select', options: [] },
  ];

  loading  = signal(true);
  saving   = signal(false);
  formError = signal('');

  vehicles = signal<Vehicle[]>([]);
  showForm = false;
  editId: number | null = null;
  deleteTarget: RegistrationRecord | null = null;
  form: CreateRegistrationRecordDto = this.emptyForm();

  private searchSubject = new Subject<string>();
  private loadSubject = new Subject<void>();

  ngOnInit(): void {
    this.loadSubject.pipe(switchMap(() => this.buildPageRequest())).subscribe({
      next: res => { this.items.set(res.items); this.totalCount.set(res.totalCount); this.totalPages.set(res.totalPages); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(term => {
      this.search.set(term); this.page.set(1); this.loadPage();
    });
    this.loadPage();
    this.vehicleApi.getAll().subscribe(v => {
      this.vehicles.set(v);
      this.filterFields.find(f => f.key === 'vehicleId')!.options = v.map(x => ({ value: x.vehicleId.toString(), label: `${x.make} ${x.model} – ${x.registrationNumber}` }));
    });
  }

  ngOnDestroy(): void { this.searchSubject.complete(); this.loadSubject.complete(); }

  private buildPageRequest() {
    const filterObj: Record<string, any> = { ...this.appliedFilters() };
    if (this.filter() !== 'all') filterObj['status'] = this.filter();
    return this.api.getPaged(
      { page: this.page(), pageSize: this.pageSize(), search: this.search() || undefined },
      filterObj
    );
  }

  loadPage(): void {
    this.loading.set(true);
    this.loadSubject.next();
  }

  onSearchChange(term: string): void { this.searchSubject.next(term); }
  onFilterChange(value: string): void { this.filter.set(value); this.page.set(1); this.loadPage(); }
  onPageChange(p: number): void { this.page.set(p); this.loadPage(); }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.page.set(1); this.loadPage(); }

  onFiltersApplied(filters: Record<string, any>): void {
    this.appliedFilters.set(filters);
    this.page.set(1);
    this.loadPage();
  }

  onFiltersCleared(): void {
    this.appliedFilters.set({});
    this.filter.set('all');
    this.page.set(1);
    this.loadPage();
  }

  onExport(format: 'xlsx' | 'pdf'): void {
    const filterObj: Record<string, any> = { ...this.appliedFilters() };
    if (this.filter() !== 'all') filterObj['status'] = this.filter();
    this.api.export(format, this.search() || undefined, filterObj).subscribe(res => {
      const filename = extractFilename(res.headers.get('content-disposition'), `export.${format}`);
      downloadBlob(res.body!, filename);
    });
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
    obs.subscribe({
      next: () => { this.loadPage(); this.closeForm(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  goToDetail(row: RegistrationRecord): void { this.router.navigate(['/registration', row.registrationId]); }
  openDocs(row: RegistrationRecord): void { this.docsTarget = row; }
  confirmDelete(row: RegistrationRecord): void { this.deleteTarget = row; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.registrationId).subscribe({
      next: () => { this.loadPage(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }

  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }
  private emptyForm(): CreateRegistrationRecordDto { return { vehicleId: 0, registrationNumber: '', validFrom: '', validTo: '' }; }
}
