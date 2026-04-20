import { Component, OnInit, OnDestroy, signal, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
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
import { VehicleLabelComponent } from '../../../shared/components/vehicle-label/vehicle-label.component';
import { EuNumberPipe } from '../../../shared/pipes/eu-number.pipe';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button.component';
import { FilterPanelComponent, FilterField } from '../../../shared/components/filter-panel/filter-panel.component';
import { downloadBlob } from '../../../shared/utils/download';

@Component({
  selector: 'app-inspections-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, FileUploadComponent, DocumentListComponent, VehicleLabelComponent, EuNumberPipe, PaginationComponent, ExportButtonComponent, FilterPanelComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@inspections.list.title">Inspections</h1>
          <p class="page-subtitle" i18n="@@inspections.list.subtitle">{{ totalCount() }} records</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search vehicle…" i18n-placeholder="@@inspections.list.searchPlaceholder" />
          <app-export-button (exportAs)="onExport($event)" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true" i18n="@@inspections.list.addButton">+ Add Inspection</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"         (click)="onFilterChange('all')" i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'passed'"      (click)="onFilterChange('passed')" i18n="@@COMMON.CHIPS.PASSED">Passed</button>
        <button [class.active]="filter() === 'failed'"      (click)="onFilterChange('failed')" i18n="@@COMMON.CHIPS.FAILED">Failed</button>
        <button [class.active]="filter() === 'conditional'" (click)="onFilterChange('conditional')" i18n="@@COMMON.CHIPS.CONDITIONAL">Conditional</button>
      </div>

      <app-filter-panel
        [fields]="filterFields"
        [appliedFilters]="appliedFilters()"
        (filtersApplied)="onFiltersApplied($event)"
        (filtersCleared)="onFiltersCleared()"
      />

      <div class="table-card">
        @if (loading()) { <div class="table-loading" i18n="@@inspections.list.loading">Loading…</div> }
        @else if (items().length === 0) { <div class="table-empty" i18n="@@inspections.list.empty">No inspections found.</div> }
        @else {
          <table class="table">
            <thead>
              <tr>
                <th i18n="@@inspections.table.vehicle">Vehicle</th>
                <th i18n="@@inspections.table.inspectedAt">Inspected At</th>
                <th i18n="@@inspections.table.validTo">Valid To</th>
                <th i18n="@@inspections.table.result">Result</th>
                <th i18n="@@inspections.table.odometer">Odometer (km)</th>
                <th i18n="@@inspections.table.notes">Notes</th>
                <th i18n="@@inspections.table.actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.inspectionId) {
                <tr>
                  <td><a [routerLink]="['/inspections', row.inspectionId]" class="name-link"><app-vehicle-label [make]="row.vehicleMake" [model]="row.vehicleModel" [registration]="row.registrationNumber" /></a></td>
                  <td>{{ row.inspectedAt | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.validTo ? (row.validTo | date:'dd.MM.yyyy') : '—' }}</td>
                  <td>
                    <app-badge
                      [label]="resultLabel(row.result)"
                      [variant]="row.result === 'passed' ? 'success' : row.result === 'failed' ? 'danger' : 'warning'"
                    />
                  </td>
                  <td>{{ row.odometerKm != null ? (row.odometerKm | euNumber) : '—' }}</td>
                  <td class="notes-cell">{{ row.notes ?? '—' }}</td>
                  <td class="actions">
                    <button class="btn-icon" title="Documents" i18n-title="@@inspections.table.documentsTitle" (click)="openDocs(row)"><lucide-icon [img]="icons.Paperclip" [size]="15" [strokeWidth]="2"></lucide-icon></button>
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
            <h2 class="modal-title" i18n="@@inspections.form.editTitle">Edit Inspection</h2>
          } @else {
            <h2 class="modal-title" i18n="@@inspections.form.addTitle">Add Inspection</h2>
          }
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@inspections.form.vehicleLabel">Vehicle *</label>
              <app-search-select
                [items]="vehicles()"
                [displayFn]="vehicleDisplayFn"
                valueField="vehicleId"
                placeholder="Select vehicle…" i18n-placeholder="@@inspections.form.vehiclePlaceholder"
                [disabled]="!!editId"
                [(ngModel)]="form.vehicleId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@inspections.form.resultLabel">Result *</label>
              <select [(ngModel)]="form.result">
                <option value="passed" i18n="@@COMMON.CHIPS.PASSED">Passed</option>
                <option value="failed" i18n="@@COMMON.CHIPS.FAILED">Failed</option>
                <option value="conditional" i18n="@@COMMON.CHIPS.CONDITIONAL">Conditional</option>
              </select>
            </div>
            <div class="form-group">
              <label i18n="@@inspections.form.inspectedAtLabel">Inspected At *</label>
              <input type="date" [(ngModel)]="form.inspectedAt" />
            </div>
            <div class="form-group">
              <label i18n="@@inspections.form.validToLabel">Valid To</label>
              <input type="date" [(ngModel)]="form.validTo" />
            </div>
            <div class="form-group">
              <label i18n="@@inspections.form.odometerLabel">Odometer (km)</label>
              <input type="number" [(ngModel)]="form.odometerKm" min="0" />
            </div>
            <div class="form-group">
              <label i18n="@@inspections.form.notesLabel">Notes {{ form.result === 'failed' ? '*' : '' }}</label>
              <input [(ngModel)]="form.notes" placeholder="Required if failed" i18n-placeholder="@@inspections.form.notesPlaceholder" />
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()" i18n="@@inspections.form.cancel">Cancel</button>
            @if (saving()) {
              <button class="btn btn-primary" [disabled]="true" i18n="@@inspections.form.saving">Saving…</button>
            } @else if (editId) {
              <button class="btn btn-primary" (click)="save()" i18n="@@inspections.form.update">Update</button>
            } @else {
              <button class="btn btn-primary" (click)="save()" i18n="@@inspections.form.create">Create</button>
            }
          </div>
        </div>
      </div>
    }

    <app-confirm-modal [visible]="!!deleteTarget" title="Delete Inspection" i18n-title="@@inspections.delete.title" message="Delete this inspection record?" i18n-message="@@inspections.delete.message" (confirmed)="doDelete()" (cancelled)="deleteTarget = null" />

    @if (docsTarget) {
      <div class="modal-overlay" (click)="docsTarget = null">
        <div class="modal-box modal-box--wide" (click)="$event.stopPropagation()">
          <h2 class="modal-title"><ng-container i18n="@@inspections.docs.title">Documents —</ng-container> {{ docsTarget.registrationNumber }} ({{ docsTarget.inspectedAt | date:'dd.MM.yyyy' }})</h2>
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
            <button class="btn btn-secondary" (click)="docsTarget = null" i18n="@@inspections.docs.close">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-box--wide { width: min(720px, 95vw); }
    .name-link { color: inherit; text-decoration: none; }
    .name-link:hover { color: var(--brand); }
    .name-link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 2px; }
  `]
})
export class InspectionsListComponent implements OnInit, OnDestroy {
  readonly icons = { Eye, Pencil, Trash2, Paperclip };
  private readonly chipLabels: Record<string, string> = {
    passed:      $localize`:@@COMMON.CHIPS.PASSED:Passed`,
    failed:      $localize`:@@COMMON.CHIPS.FAILED:Failed`,
    conditional: $localize`:@@COMMON.CHIPS.CONDITIONAL:Conditional`,
  };
  resultLabel(s: string): string { return this.chipLabels[s] ?? s; }
  readonly vehicleDisplayFn = (v: Vehicle) => `${v.make} ${v.model} – ${v.registrationNumber}`;
  @ViewChild('docList') docList!: DocumentListComponent;
  docsTarget: Inspection | null = null;

  private api = inject(InspectionApiService);
  private vehicleApi = inject(VehicleApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  // Server response
  items      = signal<Inspection[]>([]);
  totalCount = signal(0);
  totalPages = signal(0);

  // Pagination state
  page     = signal(1);
  pageSize = signal(10);

  // Filter/search/sort state
  search         = signal('');
  filter         = signal<string>('all');
  sortCol        = signal('');
  sortDir        = signal<'asc' | 'desc'>('asc');
  appliedFilters = signal<Record<string, any>>({});

  filterFields: FilterField[] = [
    {
      key: 'result', label: $localize`:@@inspections.filter.result:Rezultat`, type: 'select',
      options: [
        { value: 'passed',      label: $localize`:@@COMMON.CHIPS.PASSED:Položeno` },
        { value: 'failed',      label: $localize`:@@COMMON.CHIPS.FAILED:Nije položeno` },
        { value: 'conditional', label: $localize`:@@COMMON.CHIPS.CONDITIONAL:Uvjetno` },
      ]
    },
    { key: 'vehicleId', label: $localize`:@@COMMON.FILTER.vehicle:Vozilo`,    type: 'select', options: [] },
    { key: 'dateFrom',  label: $localize`:@@COMMON.FILTER.dateFrom:Datum od`, type: 'date' },
    { key: 'dateTo',    label: $localize`:@@COMMON.FILTER.dateTo:Datum do`,   type: 'date' },
  ];

  loading  = signal(true);
  saving   = signal(false);
  formError = signal('');

  vehicles = signal<Vehicle[]>([]);
  showForm = false;
  editId: number | null = null;
  deleteTarget: Inspection | null = null;
  form: CreateInspectionDto = this.emptyForm();

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
    if (this.filter() !== 'all') filterObj['result'] = this.filter();
    return this.api.getPaged(
      { page: this.page(), pageSize: this.pageSize(), search: this.search() || undefined, sortBy: this.sortCol() || undefined, sortDirection: this.sortDir() },
      filterObj
    );
  }

  loadPage(): void {
    this.loading.set(true);
    this.loadSubject.next();
  }

  onSearchChange(term: string): void { this.searchSubject.next(term); }
  onFilterChange(value: string): void { this.filter.set(value); this.page.set(1); this.loadPage(); }

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

  sort(col: string): void {
    if (this.sortCol() === col) { this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc'); }
    else { this.sortCol.set(col); this.sortDir.set('asc'); }
    this.loadPage();
  }

  onPageChange(p: number): void { this.page.set(p); this.loadPage(); }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.page.set(1); this.loadPage(); }

  onExport(format: 'xlsx' | 'pdf'): void {
    const filterObj: Record<string, any> = { ...this.appliedFilters() };
    if (this.filter() !== 'all') filterObj['result'] = this.filter();
    this.api.export(format, this.search() || undefined, filterObj).subscribe(blob => {
      downloadBlob(blob, `inspections_${new Date().toISOString().slice(0,10)}.${format}`);
    });
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
    obs.subscribe({
      next: () => { this.loadPage(); this.closeForm(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  goToDetail(row: Inspection): void { this.router.navigate(['/inspections', row.inspectionId]); }
  openDocs(row: Inspection): void { this.docsTarget = row; }

  confirmDelete(row: Inspection): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.inspectionId).subscribe({
      next: () => { this.loadPage(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }

  closeForm(): void { this.showForm = false; this.editId = null; this.form = this.emptyForm(); this.formError.set(''); }
  private emptyForm(): CreateInspectionDto { return { vehicleId: 0, inspectedAt: '', result: 'passed' }; }
}
