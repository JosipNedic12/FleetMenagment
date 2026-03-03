import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
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

type Tab = 'fuel' | 'maintenance' | 'utilization' | 'compliance';

interface FuelRow {
  vehicleId: number;
  reg: string;
  makeModel: string;
  totalCost: number;
  totalLiters: number;
  txCount: number;
  months: Record<string, number>; // 'YYYY-MM' -> cost
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
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">Fleet analytics and compliance overview</p>
        </div>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'fuel'" (click)="setTab('fuel')">⛽ Fuel Cost</button>
        <button class="tab" [class.active]="activeTab() === 'maintenance'" (click)="setTab('maintenance')">🔧 Maintenance Spend</button>
        <button class="tab" [class.active]="activeTab() === 'utilization'" (click)="setTab('utilization')">📍 Fleet Utilization</button>
        <button class="tab" [class.active]="activeTab() === 'compliance'" (click)="setTab('compliance')">📅 Compliance Expiry</button>
      </div>

      @if (loading()) {
        <div class="loading">Loading report data…</div>
      } @else {

        <!-- FUEL REPORT -->
        @if (activeTab() === 'fuel') {
          <div class="report-section">
            <div class="report-summary">
              <div class="summary-card">
                <span class="s-value">{{ totalFuelCost() | number:'1.2-2' }} €</span>
                <span class="s-label">Total Fuel Spend</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalFuelLiters() | number:'1.0-0' }} L</span>
                <span class="s-label">Total Liters</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ avgCostPerLiter() | number:'1.3-3' }} €/L</span>
                <span class="s-label">Avg Price per Liter</span>
              </div>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th class="num">Transactions</th>
                  <th class="num">Liters</th>
                  <th class="num">Total Cost (€)</th>
                  <th class="num">Avg per Fill (€)</th>
                  @for (m of fuelMonths(); track m) {
                    <th class="num">{{ m }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of fuelRows(); track row.vehicleId) {
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
        }

        <!-- MAINTENANCE REPORT -->
        @if (activeTab() === 'maintenance') {
          <div class="report-section">
            <div class="report-summary">
              <div class="summary-card">
                <span class="s-value">{{ totalMaintCost() | number:'1.2-2' }} €</span>
                <span class="s-label">Total Maintenance Spend</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalMaintOrders() }}</span>
                <span class="s-label">Closed Orders</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalMaintPartsCost() | number:'1.2-2' }} €</span>
                <span class="s-label">Parts Cost</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalMaintLaborCost() | number:'1.2-2' }} €</span>
                <span class="s-label">Labor Cost</span>
              </div>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th class="num">Orders</th>
                  <th class="num">Parts (€)</th>
                  <th class="num">Labor (€)</th>
                  <th class="num">Total (€)</th>
                  <th class="num">Avg per Order (€)</th>
                </tr>
              </thead>
              <tbody>
                @for (row of maintenanceRows(); track row.vehicleId) {
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
        }

        <!-- UTILIZATION REPORT -->
        @if (activeTab() === 'utilization') {
          <div class="report-section">
            <div class="report-summary">
              <div class="summary-card">
                <span class="s-value">{{ activeVehicleCount() }}</span>
                <span class="s-label">Active Vehicles</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ totalKmThisMonth() | number:'1.0-0' }} km</span>
                <span class="s-label">Fleet KM This Month</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ avgKmPerVehicle() | number:'1.0-0' }} km</span>
                <span class="s-label">Avg KM per Active Vehicle</span>
              </div>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th class="num">KM This Month</th>
                  <th class="num">Total Odometer (km)</th>
                  <th>Last Log</th>
                </tr>
              </thead>
              <tbody>
                @for (row of utilizationRows(); track row.vehicleId) {
                  <tr>
                    <td>
                      <div class="cell-primary">{{ row.reg }}</div>
                      <div class="cell-sub">{{ row.makeModel }}</div>
                    </td>
                    <td><span class="badge badge-{{ row.status }}">{{ row.status }}</span></td>
                    <td class="num bold">{{ row.kmThisMonth | number:'1.0-0' }}</td>
                    <td class="num">{{ row.kmTotal | number:'1.0-0' }}</td>
                    <td class="muted">{{ row.lastLogDate ? (row.lastLogDate | date:'dd MMM yyyy') : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- COMPLIANCE EXPIRY -->
        @if (activeTab() === 'compliance') {
          <div class="report-section">
            <div class="report-summary">
              <div class="summary-card accent-red">
                <span class="s-value">{{ expiredCount() }}</span>
                <span class="s-label">Expired</span>
              </div>
              <div class="summary-card accent-amber">
                <span class="s-value">{{ expiringCount() }}</span>
                <span class="s-label">Expiring in 30 days</span>
              </div>
              <div class="summary-card accent-green">
                <span class="s-value">{{ okCount() }}</span>
                <span class="s-label">OK</span>
              </div>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Expires</th>
                  <th class="num">Days Left</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of complianceRows(); track row.vehicleId + row.type) {
                  <tr [class.row-expired]="row.status === 'expired'" [class.row-soon]="row.status === 'soon'">
                    <td>
                      <div class="cell-primary">{{ row.reg }}</div>
                      <div class="cell-sub">{{ row.makeModel }}</div>
                    </td>
                    <td>{{ row.type }}</td>
                    <td>{{ row.expiresAt | date:'dd MMM yyyy' }}</td>
                    <td class="num">{{ row.daysLeft }}</td>
                    <td><span class="badge badge-{{ row.status }}">{{ row.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1200px; }
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: var(--text-muted); margin: 0; }

    .tabs { display: flex; gap: 4px; margin-bottom: 24px; background: #f8fafc; border-radius: 10px; padding: 4px; width: fit-content; }
    .tab { padding: 8px 16px; border: none; background: none; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
    .tab:hover { background: white; color: var(--text-primary); }
    .tab.active { background: white; color: var(--brand); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

    .loading { padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }

    .report-section { display: flex; flex-direction: column; gap: 20px; }

    .report-summary { display: flex; gap: 16px; flex-wrap: wrap; }
    .summary-card { background: white; border: 1.5px solid #f1f5f9; border-radius: 10px; padding: 16px 20px; min-width: 140px; display: flex; flex-direction: column; gap: 4px; }
    .summary-card.accent-red { border-left: 4px solid #ef4444; }
    .summary-card.accent-amber { border-left: 4px solid #f59e0b; }
    .summary-card.accent-green { border-left: 4px solid #10b981; }
    .s-value { font-size: 24px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .s-label { font-size: 12px; color: var(--text-muted); }

    .report-table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; border: 1.5px solid #f1f5f9; font-size: 13px; }
    .report-table th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
    .report-table td { padding: 10px 14px; border-bottom: 1px solid #f8fafc; color: var(--text-secondary); vertical-align: middle; }
    .report-table tr:last-child td { border-bottom: none; }
    .report-table tr:hover td { background: #fafbff; }
    .report-table tr.row-expired td { background: #fef2f2; }
    .report-table tr.row-soon td { background: #fffbeb; }

    .num { text-align: right; }
    .bold { font-weight: 700; color: var(--text-primary); }
    .muted { color: var(--text-muted); }

    .cell-primary { font-weight: 600; color: var(--text-primary); }
    .cell-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: lowercase; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-service { background: #fef3c7; color: #92400e; }
    .badge-retired, .badge-sold { background: #f1f5f9; color: #64748b; }
    .badge-ok { background: #d1fae5; color: #065f46; }
    .badge-soon { background: #fef3c7; color: #92400e; }
    .badge-expired { background: #fee2e2; color: #991b1b; }
  `]
})
export class ReportsComponent implements OnInit {
  loading = signal(true);
  activeTab = signal<Tab>('fuel');

  private vehicles = signal<Vehicle[]>([]);
  private fuelTx = signal<FuelTransaction[]>([]);
  private maintenanceOrders = signal<MaintenanceOrder[]>([]);
  private odometerLogs = signal<OdometerLog[]>([]);
  private insurance = signal<InsurancePolicy[]>([]);
  private registrations = signal<RegistrationRecord[]>([]);
  private inspections = signal<Inspection[]>([]);

  constructor(
    private vehicleApi: VehicleApiService,
    private fuelApi: FuelTransactionApiService,
    private maintenanceApi: MaintenanceOrderApiService,
    private odometerApi: OdometerLogApiService,
    private insuranceApi: InsurancePolicyApiService,
    private registrationApi: RegistrationApiService,
    private inspectionApi: InspectionApiService,
  ) {}

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

  // ─── Fuel report ───────────────────────────────────────────────────────────

  fuelMonths = computed<string[]>(() => {
    const months = new Set<string>();
    for (const t of this.fuelTx()) {
      months.add(t.postedAt.slice(0, 7));
    }
    return [...months].sort();
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
      const month = t.postedAt.slice(0, 7);
      row.months[month] = (row.months[month] ?? 0) + (t.totalCost ?? 0);
    }

    return [...rowMap.values()].sort((a, b) => b.totalCost - a.totalCost);
  });

  totalFuelCost = computed(() => this.fuelRows().reduce((s, r) => s + r.totalCost, 0));
  totalFuelLiters = computed(() => this.fuelRows().reduce((s, r) => s + r.totalLiters, 0));
  avgCostPerLiter = computed(() => this.totalFuelLiters() > 0 ? this.totalFuelCost() / this.totalFuelLiters() : 0);

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

  totalMaintCost = computed(() => this.maintenanceRows().reduce((s, r) => s + r.totalCost, 0));
  totalMaintOrders = computed(() => this.maintenanceRows().reduce((s, r) => s + r.orderCount, 0));
  totalMaintPartsCost = computed(() => this.maintenanceRows().reduce((s, r) => s + r.partsCost, 0));
  totalMaintLaborCost = computed(() => this.maintenanceRows().reduce((s, r) => s + r.laborCost, 0));

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

  activeVehicleCount = computed(() => this.vehicles().filter(v => v.status === 'active').length);
  totalKmThisMonth = computed(() => this.utilizationRows().reduce((s, r) => s + r.kmThisMonth, 0));
  avgKmPerVehicle = computed(() => {
    const active = this.utilizationRows().filter(r => r.status === 'active');
    return active.length > 0 ? this.totalKmThisMonth() / active.length : 0;
  });

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

  expiredCount = computed(() => this.complianceRows().filter(r => r.status === 'expired').length);
  expiringCount = computed(() => this.complianceRows().filter(r => r.status === 'soon').length);
  okCount = computed(() => this.complianceRows().filter(r => r.status === 'ok').length);
}
