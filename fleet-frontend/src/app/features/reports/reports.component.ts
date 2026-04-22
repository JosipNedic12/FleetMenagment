import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Fuel, Wrench, MapPin, CalendarDays } from 'lucide-angular';
import { ExportButtonComponent } from '../../shared/components/export-button/export-button.component';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  VehicleApiService,
  FuelTransactionApiService,
  MaintenanceOrderApiService,
  OdometerLogApiService,
  InsurancePolicyApiService,
  RegistrationApiService,
  InspectionApiService,
} from '../../core/auth/feature-api.services';
import { Vehicle, FuelTransaction, MaintenanceOrder, OdometerLog, InsurancePolicy, RegistrationRecord, Inspection } from '../../core/models/models';
import { exportXlsx, exportPdf, CsvColumn } from '../../shared/utils/csv-export';
import { TranslateService } from '../../core/services/translate.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const EXPORT_NAMES = {
  fuel:        'troskovi-goriva',
  maintenance: 'troskovi-odrzavanja',
  utilization: 'iskoristenost-voznog-parka',
  compliance:  'izvjestaj-uskladenosti',
} as const;

function exportDate(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

type Tab = 'fuel' | 'maintenance' | 'utilization' | 'compliance';

interface FuelRow {
  vehicleId: number;
  reg: string;
  makeModel: string;
  totalCost: number;
  totalLiters: number;
  txCount: number;
  months: Record<string, number>; // 'MM/YYYY' -> cost
}

interface MaintenanceRow {
  vehicleId: number;
  reg: string;
  makeModel: string;
  totalCost: number;
  orderCount: number;
  partsCost: number;
  laborCost: number;
  byType: Record<string, number>;
}

interface UtilizationRow {
  vehicleId: number;
  reg: string;
  makeModel: string;
  status: string;
  kmThisMonth: number;
  kmTotal: number;
  lastLogDate: string | null;
}

interface ComplianceRow {
  vehicleId: number;
  reg: string;
  makeModel: string;
  type: 'Insurance' | 'Registration' | 'Inspection';
  expiresAt: string;
  daysLeft: number;
  status: 'ok' | 'soon' | 'expired';
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ExportButtonComponent, PaginationComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title" i18n="@@reports.title">Reports</h1>
          <p class="page-subtitle" i18n="@@reports.subtitle">Fleet analytics and compliance overview</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="searchSubject.next($event)"
            placeholder="Traži marku, model, registraciju, VIN…"
            i18n-placeholder="@@reports.searchPlaceholder" />
        </div>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'fuel'" (click)="setTab('fuel')">
          <lucide-icon [img]="icons.Fuel" [size]="14" [strokeWidth]="2"></lucide-icon> <ng-container i18n="@@reports.tab.fuel">Fuel Cost</ng-container>
        </button>
        <button class="tab" [class.active]="activeTab() === 'maintenance'" (click)="setTab('maintenance')">
          <lucide-icon [img]="icons.Wrench" [size]="14" [strokeWidth]="2"></lucide-icon> <ng-container i18n="@@reports.tab.maintenance">Maintenance Spend</ng-container>
        </button>
        <button class="tab" [class.active]="activeTab() === 'utilization'" (click)="setTab('utilization')">
          <lucide-icon [img]="icons.MapPin" [size]="14" [strokeWidth]="2"></lucide-icon> <ng-container i18n="@@reports.tab.utilization">Fleet Utilization</ng-container>
        </button>
        <button class="tab" [class.active]="activeTab() === 'compliance'" (click)="setTab('compliance')">
          <lucide-icon [img]="icons.CalendarDays" [size]="14" [strokeWidth]="2"></lucide-icon> <ng-container i18n="@@reports.tab.compliance">Compliance Expiry</ng-container>
        </button>
      </div>

      @if (loading()) {
        <div class="loading" i18n="@@reports.loading">Loading report data…</div>
      } @else {

        <!-- FUEL REPORT -->
        @if (activeTab() === 'fuel') {
          <div class="report-section">
            <div class="section-header">
              <h2 class="section-title" i18n="@@reports.fuel.sectionTitle">Fuel Cost Report</h2>
              <app-export-button (exportAs)="onExportFuel($event)" />
            </div>
            <div class="report-summary">
              <div class="summary-card">
                <span class="s-value">{{ totalFuelCost() | number:'1.2-2' }} €</span>
                <span class="s-label" i18n="@@reports.fuel.totalSpend">Total Fuel Spend</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalFuelLiters() | number:'1.0-0' }} L</span>
                <span class="s-label" i18n="@@reports.fuel.totalLiters">Total Liters</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ avgCostPerLiter() | number:'1.3-3' }} €/L</span>
                <span class="s-label" i18n="@@reports.fuel.avgPricePerLiter">Avg Price per Liter</span>
              </div>
            </div>
            <div class="report-table-wrap">
              <table class="report-table">
                <thead>
                  <tr>
                    <th i18n="@@reports.col.vehicle">Vehicle</th>
                    <th class="num" i18n="@@reports.fuel.col.transactions">Transactions</th>
                    <th class="num" i18n="@@reports.fuel.col.liters">Liters</th>
                    <th class="num" i18n="@@reports.fuel.col.totalCost">Total Cost (€)</th>
                    <th class="num" i18n="@@reports.fuel.col.avgPerFill">Avg per Fill (€)</th>
                    @for (m of fuelMonths(); track m) {
                      <th class="num">{{ m }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of pagedFilteredFuelRows(); track row.vehicleId) {
                    <tr>
                      <td>
                        <div class="cell-primary">{{ row.reg }}</div>
                        <div class="cell-sub">{{ row.makeModel }}</div>
                      </td>
                      <td class="num">{{ row.txCount }}</td>
                      <td class="num">{{ row.totalLiters | number:'1.0-0' }}</td>
                      <td class="num bold">{{ row.totalCost | number:'1.2-2' }}</td>
                      <td class="num">{{ (row.txCount > 0 ? row.totalCost / row.txCount : 0) | number:'1.2-2' }}</td>
                      @for (m of fuelMonths(); track m) {
                        <td class="num">{{ (row.months[m] ?? 0) | number:'1.2-2' }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination
              [page]="pageFuel()"
              [pageSize]="pageSizeFuel()"
              [totalCount]="filteredFuelRows().length"
              [totalPages]="totalPagesFuel()"
              (pageChange)="pageFuel.set($event)"
              (pageSizeChange)="onPageSizeFuel($event)"
            />
          </div>
        }

        <!-- MAINTENANCE REPORT -->
        @if (activeTab() === 'maintenance') {
          <div class="report-section">
            <div class="section-header">
              <h2 class="section-title" i18n="@@reports.maintenance.sectionTitle">Maintenance Spend Report</h2>
              <app-export-button (exportAs)="onExportMaintenance($event)" />
            </div>
            <div class="report-summary">
              <div class="summary-card">
                <span class="s-value">{{ totalMaintCost() | number:'1.2-2' }} €</span>
                <span class="s-label" i18n="@@reports.maintenance.totalSpend">Total Maintenance Spend</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalMaintOrders() }}</span>
                <span class="s-label" i18n="@@reports.maintenance.closedOrders">Closed Orders</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalMaintPartsCost() | number:'1.2-2' }} €</span>
                <span class="s-label" i18n="@@reports.maintenance.partsCost">Parts Cost</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalMaintLaborCost() | number:'1.2-2' }} €</span>
                <span class="s-label" i18n="@@reports.maintenance.laborCost">Labor Cost</span>
              </div>
            </div>
            <div class="report-table-wrap">
              <table class="report-table">
                <thead>
                  <tr>
                    <th i18n="@@reports.col.vehicle">Vehicle</th>
                    <th class="num" i18n="@@reports.maintenance.col.orders">Orders</th>
                    <th class="num" i18n="@@reports.maintenance.col.parts">Parts (€)</th>
                    <th class="num" i18n="@@reports.maintenance.col.labor">Labor (€)</th>
                    <th class="num" i18n="@@reports.maintenance.col.total">Total (€)</th>
                    <th class="num" i18n="@@reports.maintenance.col.avgPerOrder">Avg per Order (€)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of pagedFilteredMaintenanceRows(); track row.vehicleId) {
                    <tr>
                      <td>
                        <div class="cell-primary">{{ row.reg }}</div>
                        <div class="cell-sub">{{ row.makeModel }}</div>
                      </td>
                      <td class="num">{{ row.orderCount }}</td>
                      <td class="num">{{ row.partsCost | number:'1.2-2' }}</td>
                      <td class="num">{{ row.laborCost | number:'1.2-2' }}</td>
                      <td class="num bold">{{ row.totalCost | number:'1.2-2' }}</td>
                      <td class="num">{{ (row.orderCount > 0 ? row.totalCost / row.orderCount : 0) | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination
              [page]="pageMaintenance()"
              [pageSize]="pageSizeMaintenance()"
              [totalCount]="filteredMaintenanceRows().length"
              [totalPages]="totalPagesMaintenance()"
              (pageChange)="pageMaintenance.set($event)"
              (pageSizeChange)="onPageSizeMaintenance($event)"
            />
          </div>
        }

        <!-- UTILIZATION REPORT -->
        @if (activeTab() === 'utilization') {
          <div class="report-section">
            <div class="section-header">
              <h2 class="section-title" i18n="@@reports.utilization.sectionTitle">Fleet Utilization Report</h2>
              <app-export-button (exportAs)="onExportUtilization($event)" />
            </div>
            <div class="report-summary">
              <div class="summary-card">
                <span class="s-value">{{ activeVehicleCount() }}</span>
                <span class="s-label" i18n="@@reports.utilization.activeVehicles">Active Vehicles</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalKmThisMonth() | number:'1.0-0' }} km</span>
                <span class="s-label" i18n="@@reports.utilization.fleetKmThisMonth">Fleet KM This Month</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ avgKmPerVehicle() | number:'1.0-0' }} km</span>
                <span class="s-label" i18n="@@reports.utilization.avgKmPerVehicle">Avg KM per Active Vehicle</span>
              </div>
            </div>
            <div class="report-table-wrap">
              <table class="report-table">
                <thead>
                  <tr>
                    <th i18n="@@reports.col.vehicle">Vehicle</th>
                    <th i18n="@@reports.utilization.col.status">Status</th>
                    <th class="num" i18n="@@reports.utilization.col.kmThisMonth">KM This Month</th>
                    <th class="num" i18n="@@reports.utilization.col.totalOdometer">Total Odometer (km)</th>
                    <th i18n="@@reports.utilization.col.lastLog">Last Log</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of pagedFilteredUtilizationRows(); track row.vehicleId) {
                    <tr>
                      <td>
                        <div class="cell-primary">{{ row.reg }}</div>
                        <div class="cell-sub">{{ row.makeModel }}</div>
                      </td>
                      <td><span class="badge badge-{{ row.status }}">{{ statusLabel(row.status) }}</span></td>
                      <td class="num bold">{{ row.kmThisMonth | number:'1.0-0' }}</td>
                      <td class="num">{{ row.kmTotal | number:'1.0-0' }}</td>
                      <td class="muted">{{ row.lastLogDate ? (row.lastLogDate | date:'dd.MM.yyyy') : '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination
              [page]="pageUtilization()"
              [pageSize]="pageSizeUtilization()"
              [totalCount]="filteredUtilizationRows().length"
              [totalPages]="totalPagesUtilization()"
              (pageChange)="pageUtilization.set($event)"
              (pageSizeChange)="onPageSizeUtilization($event)"
            />
          </div>
        }

        <!-- COMPLIANCE EXPIRY -->
        @if (activeTab() === 'compliance') {
          <div class="report-section">
            <div class="section-header">
              <h2 class="section-title" i18n="@@reports.compliance.sectionTitle">Compliance Expiry Report</h2>
              <app-export-button (exportAs)="onExportCompliance($event)" />
            </div>
            <div class="report-summary">
              <div class="summary-card accent-red">
                <span class="s-value">{{ expiredCount() }}</span>
                <span class="s-label" i18n="@@reports.compliance.expired">Expired</span>
              </div>
              <div class="summary-card accent-amber">
                <span class="s-value">{{ expiringCount() }}</span>
                <span class="s-label" i18n="@@reports.compliance.expiringIn30">Expiring in 30 days</span>
              </div>
              <div class="summary-card accent-green">
                <span class="s-value">{{ okCount() }}</span>
                <span class="s-label" i18n="@@reports.compliance.ok">OK</span>
              </div>
            </div>
            <div class="report-table-wrap">
              <table class="report-table">
                <thead>
                  <tr>
                    <th i18n="@@reports.col.vehicle">Vehicle</th>
                    <th i18n="@@reports.compliance.col.type">Type</th>
                    <th i18n="@@reports.compliance.col.expires">Expires</th>
                    <th class="num" i18n="@@reports.compliance.col.daysLeft">Days Left</th>
                    <th i18n="@@reports.compliance.col.status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of pagedFilteredComplianceRows(); track row.vehicleId + row.type) {
                    <tr [class.row-expired]="row.status === 'expired'" [class.row-soon]="row.status === 'soon'">
                      <td>
                        <div class="cell-primary">{{ row.reg }}</div>
                        <div class="cell-sub">{{ row.makeModel }}</div>
                      </td>
                      <td>{{ typeLabel(row.type) }}</td>
                      <td>{{ row.expiresAt | date:'dd.MM.yyyy' }}</td>
                      <td class="num">{{ row.daysLeft }}</td>
                      <td><span class="badge badge-{{ row.status }}">{{ complianceStatusLabel(row.status) }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination
              [page]="pageCompliance()"
              [pageSize]="pageSizeCompliance()"
              [totalCount]="filteredComplianceRows().length"
              [totalPages]="totalPagesCompliance()"
              (pageChange)="pageCompliance.set($event)"
              (pageSizeChange)="onPageSizeCompliance($event)"
            />
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 24px; background: var(--subtle-bg); border-radius: 10px; padding: 4px; width: 100%; max-width: fit-content; }
    .tab { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: none; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: inherit; }
    .tab:hover { background: var(--card-bg); color: var(--text-primary); }
    .tab.active { background: var(--card-bg); color: var(--brand); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

    .loading { padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }

    .report-section { display: flex; flex-direction: column; gap: 20px; }

    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0; }


    .report-summary { display: flex; gap: 16px; flex-wrap: wrap; }
    .summary-card { background: var(--card-bg); border: 1.5px solid var(--border); border-radius: 10px; padding: 16px 20px; min-width: 140px; display: flex; flex-direction: column; gap: 4px; }
    .summary-card.accent-red { border-left: 4px solid #ef4444; }
    .summary-card.accent-amber { border-left: 4px solid #f59e0b; }
    .summary-card.accent-green { border-left: 4px solid #10b981; }
    .s-value { font-size: 24px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .s-label { font-size: 12px; color: var(--text-muted); }

    .report-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 10px; }
    .report-table { width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 10px; overflow: hidden; border: 1.5px solid var(--border); font-size: 13px; min-width: 480px; }
    .report-table th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); background: var(--subtle-bg); border-bottom: 1px solid var(--border); }
    .report-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); color: var(--text-secondary); vertical-align: middle; }
    .report-table tr:last-child td { border-bottom: none; }
    .report-table tr:hover td { background: var(--hover-bg); }
    .report-table tr.row-expired td { background: var(--row-danger-bg); }
    .report-table tr.row-soon td { background: var(--row-warn-bg); }

    .num { text-align: right; }
    .bold { font-weight: 700; color: var(--text-primary); }
    .muted { color: var(--text-muted); }

    .cell-primary { font-weight: 600; color: var(--text-primary); }
    .cell-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-service { background: #fef3c7; color: #92400e; }
    .badge-retired, .badge-sold { background: var(--subtle-bg); color: #64748b; }
    .badge-ok { background: #d1fae5; color: #065f46; }
    .badge-soon { background: #fef3c7; color: #92400e; }
    .badge-expired { background: #fee2e2; color: #991b1b; }

    @media (max-width: 767px) {
      .tabs { max-width: 100%; }
      .tab { padding: 7px 10px; font-size: 12px; gap: 4px; }
      .section-header { flex-wrap: wrap; gap: 8px; }
      .report-summary { gap: 10px; }
      .summary-card { min-width: 0; flex: 1; padding: 12px 14px; }
      .s-value { font-size: 20px; }
    }

    @media (max-width: 480px) {
      .tab lucide-icon { display: none; }
      .summary-card { flex: 1 1 calc(50% - 5px); }
    }
  `]
})
export class ReportsComponent implements OnInit, OnDestroy {
  readonly icons = { Fuel, Wrench, MapPin, CalendarDays };
  loading = signal(true);
  search = signal('');
  readonly searchSubject = new Subject<string>();
  activeTab = signal<Tab>('fuel');

  private vehicles = signal<Vehicle[]>([]);
  private fuelTx = signal<FuelTransaction[]>([]);
  private maintenanceOrders = signal<MaintenanceOrder[]>([]);
  private odometerLogs = signal<OdometerLog[]>([]);
  private insurance = signal<InsurancePolicy[]>([]);
  private registrations = signal<RegistrationRecord[]>([]);
  private inspections = signal<Inspection[]>([]);

  private readonly typeLabels: Record<string, string> = {
    inspection:   $localize`:@@COMMON.TYPE.inspection:Inspection`,
    insurance:    $localize`:@@COMMON.TYPE.insurance:Insurance`,
    registration: $localize`:@@COMMON.TYPE.registration:Registration`,
  };

  private readonly statusLabels: Record<string, string> = {
    active:  $localize`:@@COMMON.STATUS.active:Active`,
    in_shop: $localize`:@@COMMON.STATUS.in_shop:In Shop`,
    retired: $localize`:@@COMMON.STATUS.retired:Retired`,
    sold:    $localize`:@@COMMON.STATUS.sold:Sold`,
  };

  private readonly complianceStatusLabels: Record<string, string> = {
    ok:      $localize`:@@COMMON.STATUS.ok:OK`,
    soon:    $localize`:@@COMMON.STATUS.soon:Soon`,
    expired: $localize`:@@COMMON.STATUS.expired:Expired`,
  };

  typeLabel(type: string): string {
    return this.typeLabels[type.toLowerCase()] ?? type;
  }

  statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  complianceStatusLabel(status: string): string {
    return this.complianceStatusLabels[status] ?? status;
  }

  constructor(
    private vehicleApi: VehicleApiService,
    private fuelApi: FuelTransactionApiService,
    private maintenanceApi: MaintenanceOrderApiService,
    private odometerApi: OdometerLogApiService,
    private insuranceApi: InsurancePolicyApiService,
    private registrationApi: RegistrationApiService,
    private inspectionApi: InspectionApiService,
    private ts: TranslateService,
  ) {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(term => this.search.set(term));

    effect(() => {
      this.search();
      this.pageFuel.set(1);
      this.pageMaintenance.set(1);
      this.pageUtilization.set(1);
      this.pageCompliance.set(1);
    });
  }

  ngOnDestroy(): void { this.searchSubject.complete(); }

  ngOnInit(): void {
    forkJoin({
      vehicles: this.vehicleApi.getAll(),
      fuel: this.fuelApi.getAll(),
      maintenance: this.maintenanceApi.getAll(),
      odometer: this.odometerApi.getAll(),
      insurance: this.insuranceApi.getAll(),
      registrations: this.registrationApi.getAll(),
      inspections: this.inspectionApi.getAll(),
    }).subscribe({
      next: (data) => {
        this.vehicles.set(data.vehicles);
        this.fuelTx.set(data.fuel);
        this.maintenanceOrders.set(data.maintenance);
        this.odometerLogs.set(data.odometer);
        this.insurance.set(data.insurance);
        this.registrations.set(data.registrations);
        this.inspections.set(data.inspections);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: Tab): void { this.activeTab.set(tab); }

  // ─── Search helpers ────────────────────────────────────────────────────────

  private vehicleMap = computed(() => new Map(this.vehicles().map(v => [v.vehicleId, v])));

  private matchesSearch(vehicleId: number, reg: string, makeModel: string): boolean {
    const term = this.search().trim().toLowerCase();
    if (!term) return true;
    const v = this.vehicleMap().get(vehicleId);
    const haystack = `${makeModel} ${reg} ${v?.vin ?? ''}`.toLowerCase();
    return haystack.includes(term);
  }

  // ─── Pagination state ──────────────────────────────────────────────────────

  pageFuel = signal(1);
  pageSizeFuel = signal(10);
  pageMaintenance = signal(1);
  pageSizeMaintenance = signal(10);
  pageUtilization = signal(1);
  pageSizeUtilization = signal(10);
  pageCompliance = signal(1);
  pageSizeCompliance = signal(10);

  // ─── Fuel report ───────────────────────────────────────────────────────────

  private toMonthKey(iso: string): string {
    const [y, m] = iso.slice(0, 7).split('-');
    return `${m}/${y}`;
  }

  fuelMonths = computed<string[]>(() => {
    const isoSet = new Set<string>();
    for (const t of this.fuelTx()) {
      isoSet.add(t.postedAt.slice(0, 7));
    }
    return [...isoSet].sort().map(iso => this.toMonthKey(iso));
  });

  fuelRows = computed<FuelRow[]>(() => {
    const vMap = new Map(this.vehicles().map(v => [v.vehicleId, v]));
    const rowMap = new Map<number, FuelRow>();

    for (const t of this.fuelTx()) {
      const v = vMap.get(t.vehicleId);
      if (!rowMap.has(t.vehicleId)) {
        rowMap.set(t.vehicleId, {
          vehicleId: t.vehicleId,
          reg: t.registrationNumber,
          makeModel: v ? `${v.make} ${v.model}` : '—',
          totalCost: 0,
          totalLiters: 0,
          txCount: 0,
          months: {},
        });
      }
      const row = rowMap.get(t.vehicleId)!;
      row.totalCost += t.totalCost ?? 0;
      row.totalLiters += t.liters ?? 0;
      row.txCount++;
      const month = this.toMonthKey(t.postedAt);
      row.months[month] = (row.months[month] ?? 0) + (t.totalCost ?? 0);
    }

    return [...rowMap.values()].sort((a, b) => b.totalCost - a.totalCost);
  });

  filteredFuelRows = computed(() =>
    this.fuelRows().filter(r => this.matchesSearch(r.vehicleId, r.reg, r.makeModel)));

  totalFuelCost = computed(() => this.filteredFuelRows().reduce((s, r) => s + r.totalCost, 0));
  totalFuelLiters = computed(() => this.filteredFuelRows().reduce((s, r) => s + r.totalLiters, 0));
  avgCostPerLiter = computed(() => this.totalFuelLiters() > 0 ? this.totalFuelCost() / this.totalFuelLiters() : 0);

  totalPagesFuel = computed(() => Math.max(1, Math.ceil(this.filteredFuelRows().length / this.pageSizeFuel())));
  pagedFilteredFuelRows = computed(() => {
    const start = (this.pageFuel() - 1) * this.pageSizeFuel();
    return this.filteredFuelRows().slice(start, start + this.pageSizeFuel());
  });
  onPageSizeFuel(size: number): void { this.pageSizeFuel.set(size); this.pageFuel.set(1); }

  onExportFuel(format: 'xlsx' | 'pdf'): void {
    const months = this.fuelMonths();
    const cols: CsvColumn<FuelRow>[] = [
      { header: 'Registration', value: r => r.reg },
      { header: 'Vehicle', value: r => r.makeModel },
      { header: 'Transactions', value: r => r.txCount },
      { header: 'Liters', value: r => r.totalLiters.toFixed(0) },
      { header: 'Total Cost (€)', value: r => r.totalCost.toFixed(2) },
      { header: 'Avg per Fill (€)', value: r => (r.txCount > 0 ? r.totalCost / r.txCount : 0).toFixed(2) },
      ...months.map(m => ({ header: m, value: (r: FuelRow) => (r.months[m] ?? 0).toFixed(2) })),
    ];
    const date = exportDate();
    const base = EXPORT_NAMES.fuel;
    if (format === 'xlsx') exportXlsx(`${base}-${date}.xlsx`, this.filteredFuelRows(), cols);
    else exportPdf(`${base}-${date}.pdf`, this.ts.exportTitleFuel, `${this.ts.exportGenerated} ${new Date().toLocaleDateString()}`, this.filteredFuelRows(), cols);
  }

  // ─── Maintenance report ────────────────────────────────────────────────────

  maintenanceRows = computed<MaintenanceRow[]>(() => {
    const vMap = new Map(this.vehicles().map(v => [v.vehicleId, v]));
    const rowMap = new Map<number, MaintenanceRow>();

    for (const o of this.maintenanceOrders()) {
      if (o.status !== 'closed') continue;
      const v = vMap.get(o.vehicleId);
      if (!rowMap.has(o.vehicleId)) {
        rowMap.set(o.vehicleId, {
          vehicleId: o.vehicleId,
          reg: o.registrationNumber,
          makeModel: v ? `${v.make} ${v.model}` : '—',
          totalCost: 0,
          orderCount: 0,
          partsCost: 0,
          laborCost: 0,
          byType: {},
        });
      }
      const row = rowMap.get(o.vehicleId)!;
      row.orderCount++;
      for (const item of o.items) {
        row.partsCost += item.partsCost ?? 0;
        row.laborCost += item.laborCost ?? 0;
        row.totalCost += item.totalCost ?? 0;
        row.byType[item.maintenanceTypeName] = (row.byType[item.maintenanceTypeName] ?? 0) + (item.totalCost ?? 0);
      }
    }

    return [...rowMap.values()].sort((a, b) => b.totalCost - a.totalCost);
  });

  filteredMaintenanceRows = computed(() =>
    this.maintenanceRows().filter(r => this.matchesSearch(r.vehicleId, r.reg, r.makeModel)));

  totalMaintCost = computed(() => this.filteredMaintenanceRows().reduce((s, r) => s + r.totalCost, 0));
  totalMaintOrders = computed(() => this.filteredMaintenanceRows().reduce((s, r) => s + r.orderCount, 0));
  totalMaintPartsCost = computed(() => this.filteredMaintenanceRows().reduce((s, r) => s + r.partsCost, 0));
  totalMaintLaborCost = computed(() => this.filteredMaintenanceRows().reduce((s, r) => s + r.laborCost, 0));

  totalPagesMaintenance = computed(() => Math.max(1, Math.ceil(this.filteredMaintenanceRows().length / this.pageSizeMaintenance())));
  pagedFilteredMaintenanceRows = computed(() => {
    const start = (this.pageMaintenance() - 1) * this.pageSizeMaintenance();
    return this.filteredMaintenanceRows().slice(start, start + this.pageSizeMaintenance());
  });
  onPageSizeMaintenance(size: number): void { this.pageSizeMaintenance.set(size); this.pageMaintenance.set(1); }

  onExportMaintenance(format: 'xlsx' | 'pdf'): void {
    const cols: CsvColumn<MaintenanceRow>[] = [
      { header: 'Registration', value: r => r.reg },
      { header: 'Vehicle', value: r => r.makeModel },
      { header: 'Orders', value: r => r.orderCount },
      { header: 'Parts (€)', value: r => r.partsCost.toFixed(2) },
      { header: 'Labor (€)', value: r => r.laborCost.toFixed(2) },
      { header: 'Total (€)', value: r => r.totalCost.toFixed(2) },
      { header: 'Avg per Order (€)', value: r => (r.orderCount > 0 ? r.totalCost / r.orderCount : 0).toFixed(2) },
    ];
    const date = exportDate();
    const base = EXPORT_NAMES.maintenance;
    if (format === 'xlsx') exportXlsx(`${base}-${date}.xlsx`, this.filteredMaintenanceRows(), cols);
    else exportPdf(`${base}-${date}.pdf`, this.ts.exportTitleMaintenance, `${this.ts.exportGenerated} ${new Date().toLocaleDateString()}`, this.filteredMaintenanceRows(), cols);
  }

  // ─── Utilization report ────────────────────────────────────────────────────

  utilizationRows = computed<UtilizationRow[]>(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const byVehicle = new Map<number, OdometerLog[]>();
    for (const log of this.odometerLogs()) {
      if (!byVehicle.has(log.vehicleId)) byVehicle.set(log.vehicleId, []);
      byVehicle.get(log.vehicleId)!.push(log);
    }

    return this.vehicles().map(v => {
      const logs = (byVehicle.get(v.vehicleId) ?? []).sort((a, b) =>
        new Date(a.logDate).getTime() - new Date(b.logDate).getTime()
      );

      const thisMonthLogs = logs.filter(l => new Date(l.logDate) >= monthStart);
      let kmThisMonth = 0;
      if (thisMonthLogs.length > 0) {
        const max = Math.max(...thisMonthLogs.map(l => l.odometerKm));
        const before = logs.filter(l => new Date(l.logDate) < monthStart);
        const baseline = before.length > 0
          ? before[before.length - 1].odometerKm
          : Math.min(...thisMonthLogs.map(l => l.odometerKm));
        kmThisMonth = Math.max(0, max - baseline);
      }

      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

      return {
        vehicleId: v.vehicleId,
        reg: v.registrationNumber,
        makeModel: `${v.make} ${v.model}`,
        status: v.status,
        kmThisMonth,
        kmTotal: v.currentOdometerKm,
        lastLogDate: lastLog?.logDate ?? null,
      };
    }).sort((a, b) => b.kmThisMonth - a.kmThisMonth);
  });

  filteredUtilizationRows = computed(() =>
    this.utilizationRows().filter(r => this.matchesSearch(r.vehicleId, r.reg, r.makeModel)));

  activeVehicleCount = computed(() => this.filteredUtilizationRows().filter(r => r.status === 'active').length);
  totalKmThisMonth = computed(() => this.filteredUtilizationRows().reduce((s, r) => s + r.kmThisMonth, 0));
  avgKmPerVehicle = computed(() => {
    const active = this.filteredUtilizationRows().filter(r => r.status === 'active');
    return active.length > 0 ? this.totalKmThisMonth() / active.length : 0;
  });

  totalPagesUtilization = computed(() => Math.max(1, Math.ceil(this.filteredUtilizationRows().length / this.pageSizeUtilization())));
  pagedFilteredUtilizationRows = computed(() => {
    const start = (this.pageUtilization() - 1) * this.pageSizeUtilization();
    return this.filteredUtilizationRows().slice(start, start + this.pageSizeUtilization());
  });
  onPageSizeUtilization(size: number): void { this.pageSizeUtilization.set(size); this.pageUtilization.set(1); }

  onExportUtilization(format: 'xlsx' | 'pdf'): void {
    const cols: CsvColumn<UtilizationRow>[] = [
      { header: this.ts.exportColRegistration, value: r => r.reg },
      { header: this.ts.exportColVehicle, value: r => r.makeModel },
      { header: this.ts.exportColStatus, value: r => this.statusLabel(r.status) },
      { header: this.ts.exportColKmThisMonth, value: r => r.kmThisMonth.toFixed(0) },
      { header: this.ts.exportColTotalOdometer, value: r => r.kmTotal.toFixed(0) },
      { header: this.ts.exportColLastLogDate, value: r => r.lastLogDate ?? '' },
    ];
    const date = exportDate();
    const base = EXPORT_NAMES.utilization;
    if (format === 'xlsx') exportXlsx(`${base}-${date}.xlsx`, this.filteredUtilizationRows(), cols);
    else exportPdf(`${base}-${date}.pdf`, this.ts.exportTitleUtilization, `${this.ts.exportGenerated} ${new Date().toLocaleDateString()}`, this.filteredUtilizationRows(), cols);
  }

  // ─── Compliance expiry ─────────────────────────────────────────────────────

  complianceRows = computed<ComplianceRow[]>(() => {
    const vMap = new Map(this.vehicles().map(v => [v.vehicleId, v]));
    const now = new Date();
    const rows: ComplianceRow[] = [];

    const toRow = (vehicleId: number, reg: string, type: ComplianceRow['type'], expiresAt: string): ComplianceRow => {
      const v = vMap.get(vehicleId);
      const exp = new Date(expiresAt);
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
      return {
        vehicleId,
        reg,
        makeModel: v ? `${v.make} ${v.model}` : '—',
        type,
        expiresAt,
        daysLeft,
        status: daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'soon' : 'ok',
      };
    };

    for (const p of this.insurance()) {
      rows.push(toRow(p.vehicleId, p.registrationNumber, 'Insurance', p.validTo));
    }
    for (const r of this.registrations()) {
      rows.push(toRow(r.vehicleId, r.vehicleRegistrationNumber, 'Registration', r.validTo));
    }
    for (const i of this.inspections()) {
      if (i.validTo) rows.push(toRow(i.vehicleId, i.registrationNumber, 'Inspection', i.validTo));
    }

    return rows.sort((a, b) => a.daysLeft - b.daysLeft);
  });

  filteredComplianceRows = computed(() =>
    this.complianceRows().filter(r => this.matchesSearch(r.vehicleId, r.reg, r.makeModel)));

  expiredCount = computed(() => this.filteredComplianceRows().filter(r => r.status === 'expired').length);
  expiringCount = computed(() => this.filteredComplianceRows().filter(r => r.status === 'soon').length);
  okCount = computed(() => this.filteredComplianceRows().filter(r => r.status === 'ok').length);

  totalPagesCompliance = computed(() => Math.max(1, Math.ceil(this.filteredComplianceRows().length / this.pageSizeCompliance())));
  pagedFilteredComplianceRows = computed(() => {
    const start = (this.pageCompliance() - 1) * this.pageSizeCompliance();
    return this.filteredComplianceRows().slice(start, start + this.pageSizeCompliance());
  });
  onPageSizeCompliance(size: number): void { this.pageSizeCompliance.set(size); this.pageCompliance.set(1); }

  onExportCompliance(format: 'xlsx' | 'pdf'): void {
    const cols: CsvColumn<ComplianceRow>[] = [
      { header: this.ts.exportColRegistration, value: r => r.reg },
      { header: this.ts.exportColVehicle, value: r => r.makeModel },
      { header: this.ts.exportColType, value: r => this.typeLabel(r.type) },
      { header: this.ts.exportColExpires, value: r => r.expiresAt },
      { header: this.ts.exportColDaysLeft, value: r => r.daysLeft },
      { header: this.ts.exportColStatus, value: r => this.complianceStatusLabel(r.status) },
    ];
    const date = exportDate();
    const base = EXPORT_NAMES.compliance;
    if (format === 'xlsx') exportXlsx(`${base}-${date}.xlsx`, this.filteredComplianceRows(), cols);
    else exportPdf(`${base}-${date}.pdf`, this.ts.exportTitleCompliance, `${this.ts.exportGenerated} ${new Date().toLocaleDateString()}`, this.filteredComplianceRows(), cols);
  }
}
