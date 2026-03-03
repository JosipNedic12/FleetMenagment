import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgChartsModule } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { VehicleApiService, MaintenanceOrderApiService, OdometerLogApiService, InsurancePolicyApiService, RegistrationApiService, InspectionApiService, FineApiService, AccidentApiService, FuelTransactionApiService } from '../../core/auth/feature-api.services';
import { OdometerLog } from '../../core/models/models';

Chart.register(...registerables);

interface StatCard {
  label: string;
  value: number;
  sub: string;
  route: string;
  icon: string;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgChartsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Fleet compliance overview</p>
        </div>
        <span class="last-updated">Updated just now</span>
      </div>

      @if (loading()) {
        <div class="loading-grid">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="stat-skeleton"></div>
          }
        </div>
        <div class="charts-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="chart-skeleton"></div>
          }
        </div>
      } @else {
        <div class="stats-grid">
          @for (card of cards(); track card.label) {
            <a [routerLink]="card.route" class="stat-card" [style.--accent]="card.accent">
              <div class="stat-icon">{{ card.icon }}</div>
              <div class="stat-body">
                <span class="stat-value">{{ card.value }}</span>
                <span class="stat-label">{{ card.label }}</span>
                <span class="stat-sub">{{ card.sub }}</span>
              </div>
            </a>
          }
        </div>

        <div class="section-title">Analytics</div>
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-card-title">⛽ Fuel Cost / Month</span>
              <span class="chart-card-sub">Last 6 months (EUR)</span>
            </div>
            <div class="chart-wrap">
              <canvas baseChart
                [data]="fuelChartData()"
                [options]="barOptions"
                type="bar">
              </canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-card-title">🔧 Maintenance Cost / Month</span>
              <span class="chart-card-sub">Last 6 months (EUR)</span>
            </div>
            <div class="chart-wrap">
              <canvas baseChart
                [data]="maintChartData()"
                [options]="barOptions"
                type="bar">
              </canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-card-title">🚗 Vehicle Status</span>
              <span class="chart-card-sub">Current fleet breakdown</span>
            </div>
            <div class="chart-wrap chart-wrap--doughnut">
              <canvas baseChart
                [data]="statusChartData()"
                [options]="doughnutOptions"
                type="doughnut">
              </canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-card-title">⚠ Accidents &amp; Fines</span>
              <span class="chart-card-sub">Monthly count – last 6 months</span>
            </div>
            <div class="chart-wrap">
              <canvas baseChart
                [data]="trendChartData()"
                [options]="lineOptions"
                type="line">
              </canvas>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1200px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: var(--text-muted); margin: 0; }
    .last-updated { font-size: 12px; color: var(--text-muted); margin-top: 6px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-decoration: none;
      border: 1.5px solid #f1f5f9;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-left: 4px solid var(--accent);
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .stat-icon { font-size: 24px; }
    .stat-value { display: block; font-size: 32px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-top: 4px; }
    .stat-sub { display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-skeleton { height: 120px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200%; border-radius: 12px; animation: shimmer 1.4s infinite; }
    .chart-skeleton { height: 280px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200%; border-radius: 12px; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }

    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 16px; }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .chart-card {
      background: white;
      border-radius: 12px;
      padding: 20px 24px;
      border: 1.5px solid #f1f5f9;
    }

    .chart-card-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .chart-card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .chart-card-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    .chart-wrap {
      position: relative;
      height: 220px;
    }

    .chart-wrap--doughnut {
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 768px) {
      .charts-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  cards = signal<StatCard[]>([]);

  fuelChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  maintChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  statusChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  trendChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${(ctx.parsed.y ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EUR`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }
    }
  };

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } }
    },
    cutout: '60%'
  };

  lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
    }
  };

  constructor(
    private vehicleApi: VehicleApiService,
    private maintenanceApi: MaintenanceOrderApiService,
    private odometerApi: OdometerLogApiService,
    private insuranceApi: InsurancePolicyApiService,
    private registrationApi: RegistrationApiService,
    private inspectionApi: InspectionApiService,
    private fineApi: FineApiService,
    private accidentApi: AccidentApiService,
    private fuelApi: FuelTransactionApiService,
  ) { }

  ngOnInit(): void {
    forkJoin({
      vehicles: this.vehicleApi.getAll(),
      maintenance: this.maintenanceApi.getAll(),
      odometer: this.odometerApi.getAll(),
      insurance: this.insuranceApi.getAll(),
      registration: this.registrationApi.getAll(),
      inspections: this.inspectionApi.getAll(),
      fines: this.fineApi.getAll(),
      accidents: this.accidentApi.getAll(),
      fuel: this.fuelApi.getAll(),
    }).subscribe({
      next: (data) => {
        const now = new Date();
        const thisMonth = (d: string) => { const dt = new Date(d); return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth(); };

        const activeVehicles = data.vehicles.filter(v => v.status === 'active').length;
        const openOrders = data.maintenance.filter(o => o.status === 'open' || o.status === 'in_progress').length;
        const kmThisMonth = calculateKmThisMonth(data.odometer);
        const unpaidFines = data.fines.filter(f => !f.isPaid).length;
        const expiredIns = data.insurance.filter(i => !i.isActive).length;
        const fuelCostThisMonth = data.fuel
          .filter(t => thisMonth(t.postedAt))
          .reduce((sum, t) => sum + (t.totalCost ?? 0), 0);

        this.cards.set([
          { label: 'Vehicles', value: data.vehicles.length, sub: `${activeVehicles} active`, route: '/vehicles', icon: '🚗', accent: '#10b981' },
          { label: 'Open Orders', value: openOrders, sub: 'Maintenance in progress', route: '/maintenance', icon: '🔧', accent: '#f97316' },
          { label: 'KM This Month', value: kmThisMonth, sub: 'From odometer logs', route: '/odometer', icon: '📍', accent: '#6366f1' },
          { label: 'Insurance Policies', value: data.insurance.length, sub: `${expiredIns} expired`, route: '/insurance', icon: '🛡', accent: '#3b82f6' },
          { label: 'Registrations', value: data.registration.length, sub: 'Active records', route: '/registration', icon: '📋', accent: '#8b5cf6' },
          { label: 'Inspections', value: data.inspections.length, sub: 'Total inspections', route: '/inspections', icon: '🔍', accent: '#06b6d4' },
          { label: 'Fines', value: data.fines.length, sub: `${unpaidFines} unpaid`, route: '/fines', icon: '⚠', accent: '#f59e0b' },
          { label: 'Accidents', value: data.accidents.length, sub: 'Reported incidents', route: '/accidents', icon: '🚨', accent: '#ef4444' },
          { label: 'Fuel Cost This Month', value: fuelCostThisMonth, sub: 'EUR spent on fuel', route: '/fuel', icon: '⛽', accent: '#14b8a6' },
        ]);

        // ── Charts ────────────────────────────────────────────────
        const labels = last6MonthLabels();

        this.fuelChartData.set({
          labels,
          datasets: [{
            label: 'Fuel Cost (EUR)',
            data: bucketByMonth(data.fuel, t => t.postedAt, t => t.totalCost ?? 0),
            backgroundColor: '#14b8a6',
            borderRadius: 6,
            borderSkipped: false,
          }]
        });

        this.maintChartData.set({
          labels,
          datasets: [{
            label: 'Maintenance Cost (EUR)',
            data: bucketByMonth(data.maintenance, o => o.reportedAt, o => o.totalCost ?? 0),
            backgroundColor: '#f97316',
            borderRadius: 6,
            borderSkipped: false,
          }]
        });

        const statusLabels = ['Active', 'In Service', 'Retired', 'Sold'];
        const statusValues = [
          data.vehicles.filter(v => v.status === 'active').length,
          data.vehicles.filter(v => v.status === 'service').length,
          data.vehicles.filter(v => v.status === 'retired').length,
          data.vehicles.filter(v => v.status === 'sold').length,
        ];
        this.statusChartData.set({
          labels: statusLabels,
          datasets: [{
            data: statusValues,
            backgroundColor: ['#10b981', '#f97316', '#94a3b8', '#ef4444'],
            hoverOffset: 6,
          }]
        });

        this.trendChartData.set({
          labels,
          datasets: [
            {
              label: 'Accidents',
              data: bucketByMonth(data.accidents, a => a.occurredAt, () => 1),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.12)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
            },
            {
              label: 'Fines',
              data: bucketByMonth(data.fines, f => f.occurredAt, () => 1),
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.10)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
            }
          ]
        });

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function calculateKmThisMonth(odometerLogs: OdometerLog[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const isThisMonth = (d: string) => {
    const dt = new Date(d);
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  };

  const byVehicle = new Map<number, OdometerLog[]>();
  for (const o of odometerLogs) {
    if (!byVehicle.has(o.vehicleId)) byVehicle.set(o.vehicleId, []);
    byVehicle.get(o.vehicleId)!.push(o);
  }

  let total = 0;
  for (const [, logs] of byVehicle) {
    const sorted = [...logs].sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
    const thisMonthLogs = sorted.filter(o => isThisMonth(o.logDate));
    if (thisMonthLogs.length === 0) continue;

    const maxThisMonth = Math.max(...thisMonthLogs.map(o => o.odometerKm));
    const beforeMonth = sorted.filter(o => new Date(o.logDate) < monthStart);
    const baseline = beforeMonth.length > 0
      ? beforeMonth[beforeMonth.length - 1].odometerKm
      : Math.min(...thisMonthLogs.map(o => o.odometerKm));

    total += Math.max(0, maxThisMonth - baseline);
  }
  return total;
}

function last6MonthLabels(): string[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const labels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  return labels;
}

function bucketByMonth<T>(items: T[], getDate: (x: T) => string, getValue: (x: T) => number): number[] {
  const now = new Date();
  const buckets = new Array(6).fill(0);
  for (const item of items) {
    const d = new Date(getDate(item));
    for (let i = 5; i >= 0; i--) {
      const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
      if (d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth()) {
        buckets[5 - i] += getValue(item);
        break;
      }
    }
  }
  return buckets;
}
