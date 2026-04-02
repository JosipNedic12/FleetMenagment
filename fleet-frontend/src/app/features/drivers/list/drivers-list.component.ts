import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DriverApiService, EmployeeApiService, LookupApiService } from '../../../core/auth/feature-api.services';
import { LucideAngularModule, Eye, Pencil, Trash2, UserRound as UserRoundIcon } from 'lucide-angular';
import { Driver, CreateDriverDto, UpdateDriverDto, Employee, LicenseCategoryDto } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExportButtonComponent } from '../../../shared/components/export-button/export-button.component';
import { FilterPanelComponent, FilterField } from '../../../shared/components/filter-panel/filter-panel.component';
import { downloadBlob } from '../../../shared/utils/download';

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective, LucideAngularModule, SearchSelectComponent, PaginationComponent, ExportButtonComponent, FilterPanelComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@drivers.list.title">Drivers</h1>
          <p class="page-subtitle" i18n="@@drivers.list.subtitle">{{ totalCount() }} drivers</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Search name, license#…" i18n-placeholder="@@drivers.list.searchPlaceholder" />
          <app-export-button (exportAs)="onExport($event)" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()" i18n="@@drivers.list.addDriver">+ Add Driver</button>
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"     (click)="onFilterChange('all')" i18n="@@COMMON.CHIPS.ALL">All</button>
        <button [class.active]="filter() === 'valid'"   (click)="onFilterChange('valid')" i18n="@@COMMON.CHIPS.VALID_LICENSE">Valid License</button>
        <button [class.active]="filter() === 'expired'" (click)="onFilterChange('expired')" i18n="@@COMMON.CHIPS.EXPIRED">Expired</button>
      </div>

      <app-filter-panel
        [fields]="filterFields"
        [appliedFilters]="appliedFilters()"
        (filtersApplied)="onFiltersApplied($event)"
        (filtersCleared)="onFiltersCleared()"
      />

      <div class="table-card">
        @if (loading()) {
          <div class="skeleton-header"></div>
          @for (i of skeletonRows; track i) {
            <div class="skeleton-row">
              <div class="skeleton-cell w-40"></div>
              <div class="skeleton-cell w-32"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-24"></div>
              <div class="skeleton-cell w-32"></div>
              <div class="skeleton-cell w-16"></div>
            </div>
          }
        } @else if (items().length === 0) {
          <div class="table-empty-state">
            <div class="empty-icon">
              <lucide-icon [img]="icons.UserRoundIcon" [size]="44" [strokeWidth]="1.3"></lucide-icon>
            </div>
            <h3 i18n="@@drivers.list.empty.title">No drivers found</h3>
            <p i18n="@@drivers.list.empty.hint">Try adjusting your search or filter, or add your first driver.</p>
            <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="openCreate()" i18n="@@drivers.list.addDriver">+ Add Driver</button>
          </div>
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th class="sortable" [class.sort-asc]="sortCol()==='name'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='name'&&sortDir()==='desc'" (click)="sort('name')" i18n="@@drivers.list.col.name">Name</th>
                <th class="sortable" [class.sort-asc]="sortCol()==='dept'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='dept'&&sortDir()==='desc'" (click)="sort('dept')" i18n="@@drivers.list.col.department">Department</th>
                <th i18n="@@drivers.list.col.licenseNumber">License #</th>
                <th class="sortable" [class.sort-asc]="sortCol()==='expiry'&&sortDir()==='asc'" [class.sort-desc]="sortCol()==='expiry'&&sortDir()==='desc'" (click)="sort('expiry')" i18n="@@drivers.list.col.expiry">Expiry</th>
                <th i18n="@@drivers.list.col.categories">Categories</th>
                <th i18n="@@drivers.list.col.actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of items(); track row.driverId) {
                <tr>
                  <td><strong>{{ row.fullName }}</strong></td>
                  <td>{{ row.department ?? '—' }}</td>
                  <td class="mono">{{ row.licenseNumber }}</td>
                  <td>
                    <span [class.expired-text]="row.licenseExpired">
                      {{ row.licenseExpiry | date:'dd.MM.yyyy' }}
                    </span>
                    @if (row.licenseExpired) {
                      <app-badge [label]="expiredLabel" variant="danger" />
                    }
                  </td>
                  <td>
                    @for (cat of row.licenseCategories; track cat) {
                      <span class="cat-chip">{{ cat }}</span>
                    }
                  </td>
                  <td class="actions">
                    <a [routerLink]="['/drivers', row.driverId]" class="btn-icon" title="View" i18n-title="@@drivers.list.action.view"><lucide-icon [img]="icons.Eye" [size]="15" [strokeWidth]="2"></lucide-icon></a>
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" i18n-title="@@drivers.list.action.edit" (click)="startEdit(row)"><lucide-icon [img]="icons.Pencil" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                    <button *hasRole="'Admin'" class="btn-icon danger" title="Delete" i18n-title="@@drivers.list.action.delete" (click)="confirmDelete(row)"><lucide-icon [img]="icons.Trash2" [size]="15" [strokeWidth]="2"></lucide-icon></button>
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

    <!-- Create Modal -->
    @if (showCreate) {
      <div class="modal-overlay" (click)="closeCreate()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@drivers.create.title">Add Driver</h2>
          <div class="form-grid">
            <div class="form-group span-2">
              <label i18n="@@drivers.create.employeeLabel">Employee *</label>
              <app-search-select
                [items]="availableEmployees()"
                [displayFn]="employeeDisplayFn"
                valueField="employeeId"
                placeholder="Select employee…"
                i18n-placeholder="@@drivers.create.employeePlaceholder"
                [(ngModel)]="createForm.employeeId">
              </app-search-select>
            </div>
            <div class="form-group">
              <label i18n="@@drivers.create.licenseNumberLabel">License # *</label>
              <input [(ngModel)]="createForm.licenseNumber" placeholder="HR-1234567" />
            </div>
            <div class="form-group">
              <label i18n="@@drivers.create.licenseExpiryLabel">License Expiry *</label>
              <input type="date" [(ngModel)]="createForm.licenseExpiry" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@drivers.create.licenseCategoriesLabel">License Categories</label>
              <div class="checkbox-group">
                @for (cat of licenseCategories(); track cat.licenseCategoryId) {
                  <label class="checkbox-label">
                    <input type="checkbox"
                      [checked]="createForm.licenseCategoryIds.includes(cat.licenseCategoryId)"
                      (change)="toggleCreateCategory(cat.licenseCategoryId, $event)" />
                    {{ cat.code }}{{ cat.description ? ' – ' + cat.description : '' }}
                  </label>
                }
              </div>
            </div>
            <div class="form-group span-2">
              <label i18n="@@drivers.create.notesLabel">Notes</label>
              <textarea [(ngModel)]="createForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeCreate()" i18n="@@drivers.modal.cancel">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveCreate()">
              @if (saving()) { <span class="btn-spinner"></span><ng-container i18n="@@drivers.modal.saving">Saving…</ng-container> } @else { <ng-container i18n="@@drivers.create.submit">Add Driver</ng-container> }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEdit) {
      <div class="modal-overlay" (click)="closeEdit()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title" i18n="@@drivers.edit.title">Edit Driver</h2>
          <div class="form-grid">
            <div class="form-group">
              <label i18n="@@drivers.create.licenseNumberLabel">License #</label>
              <input [(ngModel)]="editForm.licenseNumber" />
            </div>
            <div class="form-group">
              <label i18n="@@drivers.create.licenseExpiryLabel">License Expiry</label>
              <input type="date" [(ngModel)]="editForm.licenseExpiry" />
            </div>
            <div class="form-group span-2">
              <label i18n="@@drivers.create.licenseCategoriesLabel">License Categories</label>
              <div class="checkbox-group">
                @for (cat of licenseCategories(); track cat.licenseCategoryId) {
                  <label class="checkbox-label">
                    <input type="checkbox"
                      [checked]="editForm.licenseCategoryIds?.includes(cat.licenseCategoryId)"
                      (change)="toggleEditCategory(cat.licenseCategoryId, $event)" />
                    {{ cat.code }}{{ cat.description ? ' – ' + cat.description : '' }}
                  </label>
                }
              </div>
            </div>
            <div class="form-group span-2">
              <label i18n="@@drivers.create.notesLabel">Notes</label>
              <textarea [(ngModel)]="editForm.notes" rows="2"></textarea>
            </div>
          </div>
          @if (formError()) { <div class="form-error">{{ formError() }}</div> }
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeEdit()" i18n="@@drivers.modal.cancel">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
              @if (saving()) { <span class="btn-spinner"></span><ng-container i18n="@@drivers.modal.saving">Saving…</ng-container> } @else { <ng-container i18n="@@drivers.edit.submit">Update</ng-container> }
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Driver"
      i18n-title="@@drivers.delete.title"
      message="Delete this driver profile? This cannot be undone."
      i18n-message="@@drivers.delete.message"
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: [`
    .expired-text { color: #dc2626; }
    .cat-chip { display:inline-block; background:#e0f2fe; color:#0369a1; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:600; margin:0 2px; }
    .checkbox-group { display:flex; flex-wrap:wrap; gap:8px; }
    .checkbox-label { display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; }
  `]
})
export class DriversListComponent implements OnInit, OnDestroy {
  readonly icons = { Eye, Pencil, Trash2, UserRoundIcon };
  expiredLabel = $localize`:@@COMMON.CHIPS.EXPIRED:Expired`;
  readonly employeeDisplayFn = (e: Employee) =>
    `${e.firstName} ${e.lastName}${e.department ? ' (' + e.department + ')' : ''}`;
  private api = inject(DriverApiService);
  private employeeApi = inject(EmployeeApiService);
  private lookupApi = inject(LookupApiService);
  auth = inject(AuthService);

  // Server response
  items      = signal<Driver[]>([]);
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
      key: 'licenseStatus', label: 'License Status', type: 'select',
      options: [
        { value: 'valid', label: 'Valid' },
        { value: 'expired', label: 'Expired' },
        { value: 'expiring_soon', label: 'Expiring Soon' },
      ]
    },
    { key: 'department', label: 'Department', type: 'text', placeholder: 'e.g. Sales' },
  ];

  loading  = signal(true);
  saving   = signal(false);
  formError = signal('');

  // Form data
  employees         = signal<Employee[]>([]);
  licenseCategories = signal<LicenseCategoryDto[]>([]);

  showCreate = false; showEdit = false;
  editId: number | null = null;
  deleteTarget: Driver | null = null;
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  createForm: CreateDriverDto = this.emptyCreateForm();
  editForm: UpdateDriverDto = {};

  availableEmployees = computed(() => this.employees().filter(e => !e.hasDriverProfile));

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(term => {
      this.search.set(term);
      this.page.set(1);
      this.loadPage();
    });
    this.loadPage();
    this.employeeApi.getAll().subscribe(e => this.employees.set(e));
    this.lookupApi.getLicenseCategories().subscribe(c => this.licenseCategories.set(c));
  }

  ngOnDestroy(): void { this.searchSubject.complete(); }

  loadPage(): void {
    this.loading.set(true);
    const filterObj: Record<string, any> = { ...this.appliedFilters() };
    if (this.filter() !== 'all') filterObj['licenseStatus'] = this.filter();
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
    const filterObj: Record<string, any> = {};
    if (this.filter() !== 'all') filterObj['licenseStatus'] = this.filter();
    this.api.export(format, this.search() || undefined, filterObj).subscribe(blob => {
      downloadBlob(blob, `drivers_${new Date().toISOString().slice(0,10)}.${format}`);
    });
  }

  openCreate(): void { this.createForm = this.emptyCreateForm(); this.formError.set(''); this.showCreate = true; }

  toggleCreateCategory(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { this.createForm.licenseCategoryIds = [...this.createForm.licenseCategoryIds, id]; }
    else { this.createForm.licenseCategoryIds = this.createForm.licenseCategoryIds.filter(x => x !== id); }
  }

  toggleEditCategory(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.editForm.licenseCategoryIds ?? [];
    this.editForm = { ...this.editForm, licenseCategoryIds: checked ? [...current, id] : current.filter(x => x !== id) };
  }

  saveCreate(): void {
    if (!this.createForm.employeeId || !this.createForm.licenseNumber || !this.createForm.licenseExpiry) {
      this.formError.set('Fill all required fields.'); return;
    }
    this.saving.set(true);
    this.api.create(this.createForm).subscribe({
      next: () => { this.loadPage(); this.closeCreate(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeCreate(): void { this.showCreate = false; this.formError.set(''); }

  startEdit(row: Driver): void {
    this.editId = row.driverId;
    const catIds = this.licenseCategories()
      .filter(c => row.licenseCategories.includes(c.code))
      .map(c => c.licenseCategoryId);
    this.editForm = { licenseNumber: row.licenseNumber, licenseExpiry: row.licenseExpiry.slice(0, 10), licenseCategoryIds: catIds, notes: row.notes };
    this.formError.set(''); this.showEdit = true;
  }

  saveEdit(): void {
    if (!this.editId) return;
    this.saving.set(true);
    this.api.update(this.editId, this.editForm).subscribe({
      next: () => { this.loadPage(); this.closeEdit(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  closeEdit(): void { this.showEdit = false; this.editId = null; this.formError.set(''); }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.showCreate) { this.closeCreate(); return; }
    if (this.showEdit)   { this.closeEdit();   return; }
  }

  confirmDelete(row: Driver): void { this.deleteTarget = row; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.driverId).subscribe({
      next: () => { this.loadPage(); this.deleteTarget = null; },
      error: () => { this.deleteTarget = null; }
    });
  }

  private emptyCreateForm(): CreateDriverDto {
    return { employeeId: 0, licenseNumber: '', licenseExpiry: '', licenseCategoryIds: [] };
  }
}
