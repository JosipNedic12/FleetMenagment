import { Component, OnInit, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import {
  Car, Wrench, MapPin, Shield, Clipboard, Search, TriangleAlert, Siren, Fuel,
  AlertCircle, Clock, CheckCircle, Users, RefreshCw,
} from 'lucide-angular';
import {
  DashboardApiService, DashboardData, ComplianceReminder,
} from '../../core/auth/feature-api.services';

Chart.register(...registerables);

interface StatCard {
  label: string;
  value: number;
  sub: string;
  route: string;
  icon: LucideIconData;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgChartsModule, LucideAngularModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Fleet compliance overview</p>
        </div>
        <div class="header-right">
          <span class="last-updated">
            @if (secondsAgo() < 5) {
              Updated just now
            } @else {
              Last refreshed: {{ secondsAgo() }}s ago
            }
          </span>
          <button class="refresh-btn" (click)="refresh()" [disabled]="loading()">
            <lucide-icon [img]="refreshIcon" [size]="14" [strokeWidth]="2" [class.spinning]="loading()"></lucide-icon>
            Refresh
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-grid">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="stat-skeleton"></div>
          }
        </div>
        <div class="widgets-grid">
          @for (i of [1,2,3]; track i) {
            <div class="chart-skeleton"></div>
          }
        </div>
        <div class="charts-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="chart-skeleton"></div>
          }
        </div>
      } @else {
        <!-- ── Stat Cards ─────────────────────────────────────────── -->
        <div class="stats-grid">
          @for (card of cards(); track card.label; let i = $index) {
            <a [routerLink]="card.route" class="stat-card" [style.--accent]="card.accent" [style.animation-delay]="(i * 60) + 'ms'">
              <div class="stat-icon" [style.background]="card.accent + '18'" [style.color]="card.accent">
                <lucide-icon [img]="card.icon" [size]="20" [strokeWidth]="1.8"></lucide-icon>
              </div>
              <div class="stat-body">
                <span class="stat-value">{{ card.value }}</span>
                <span class="stat-label">{{ card.label }}</span>
                <span class="stat-sub">{{ card.sub }}</span>
              </div>
            </a>
          }
        </div>

        <!-- ── Widget Cards ──────────────────────────────────────── -->
        <div class="section-title">Operational Summary</div>
        <div class="widgets-grid">

          <!-- Compliance Reminders -->
          <div class="chart-card widget-card" style="animation-delay:0ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#ef44441a; color:#ef4444">
                  <lucide-icon [img]="alertCircleIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title">Compliance Reminders</span>
              </div>
              <div class="widget-badges">
                @if (expiredCount() > 0) {
                  <span class="badge badge--red">{{ expiredCount() }} expired</span>
                }
                @if (dueSoonCount() > 0) {
                  <span class="badge badge--amber">{{ dueSoonCount() }} due soon</span>
                }
              </div>
            </div>
            @if (complianceReminders().length === 0) {
              <p class="widget-empty">All compliance items are up to date.</p>
            } @else {
              <table class="compliance-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Expires</th>
                    <th>Days</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of complianceReminders(); track item.vehicleId + item.type) {
                    <tr [class]="'compliance-row--' + item.status">
                      <td class="reg-cell">{{ item.registrationNumber }}</td>
                      <td>
                        <span class="type-chip type-chip--{{ item.type | lowercase }}">{{ item.type }}</span>
                      </td>
                      <td>{{ item.expiresAt | date:'dd MMM yyyy' }}</td>
                      <td>
                        <span [class]="item.daysLeft < 0 ? 'days-badge days-badge--expired' : 'days-badge days-badge--soon'">
                          {{ item.daysLeft < 0 ? (item.daysLeft * -1) + 'd ago' : item.daysLeft + 'd' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <!-- Vehicle Assignments -->
          <div class="chart-card widget-card" style="animation-delay:100ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#6366f11a; color:#6366f1">
                  <lucide-icon [img]="usersIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title">Vehicle Assignments</span>
              </div>
              <span class="chart-card-sub">{{ dashboard()?.assignmentSummary?.totalVehicles ?? 0 }} total</span>
            </div>
            <div class="assignment-numbers">
              <div class="assign-block">
                <span class="assign-value" style="color:#10b981">{{ dashboard()?.assignmentSummary?.assigned ?? 0 }}</span>
                <span class="assign-label">Assigned</span>
              </div>
              <div class="assign-divider"></div>
              <div class="assign-block">
                <span class="assign-value" style="color:#94a3b8">{{ dashboard()?.assignmentSummary?.unassigned ?? 0 }}</span>
                <span class="assign-label">Unassigned</span>
              </div>
            </div>
            <div class="assign-bar-wrap">
              <div class="assign-bar">
                <div class="assign-bar-fill"
                  [style.width]="assignedPct() + '%'"
                  style="background:#10b981">
                </div>
              </div>
              <span class="assign-pct">{{ assignedPct() }}% assigned</span>
            </div>
          </div>

          <!-- Work Orders -->
          <div class="chart-card widget-card" style="animation-delay:200ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#f974161a; color:#f97416">
                  <lucide-icon [img]="wrenchIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title">Work Orders</span>
              </div>
              <a routerLink="/maintenance" class="chart-card-sub widget-link">View all</a>
            </div>
            <div class="work-order-stats">
              <div class="wo-stat">
                <lucide-icon [img]="clockIcon" [size]="16" [strokeWidth]="2" style="color:#f97416"></lucide-icon>
                <span class="wo-count">{{ dashboard()?.workOrderSummary?.open ?? 0 }}</span>
                <span class="wo-label">Open</span>
              </div>
              <div class="wo-stat">
                <lucide-icon [img]="wrenchIcon" [size]="16" [strokeWidth]="2" style="color:#6366f1"></lucide-icon>
                <span class="wo-count">{{ dashboard()?.workOrderSummary?.inProgress ?? 0 }}</span>
                <span class="wo-label">In Progress</span>
              </div>
              <div class="wo-stat">
                <lucide-icon [img]="checkCircleIcon" [size]="16" [strokeWidth]="2" style="color:#10b981"></lucide-icon>
                <span class="wo-count">{{ dashboard()?.workOrderSummary?.completed ?? 0 }}</span>
                <span class="wo-label">Completed</span>
              </div>
              <div class="wo-stat wo-stat--overdue">
                <lucide-icon [img]="alertCircleIcon" [size]="16" [strokeWidth]="2" style="color:#ef4444"></lucide-icon>
                <span class="wo-count" style="color:#ef4444">{{ dashboard()?.workOrderSummary?.overdue ?? 0 }}</span>
                <span class="wo-label">Overdue</span>
              </div>
            </div>
            <!-- Segmented progress bar -->
            @if (woTotal() > 0) {
              <div class="wo-bar-wrap">
                <div class="wo-bar">
                  <div class="wo-seg wo-seg--open"
                    [style.flex]="dashboard()?.workOrderSummary?.open ?? 0"
                    title="Open: {{ dashboard()?.workOrderSummary?.open ?? 0 }}">
                  </div>
                  <div class="wo-seg wo-seg--progress"
                    [style.flex]="dashboard()?.workOrderSummary?.inProgress ?? 0"
                    title="In Progress: {{ dashboard()?.workOrderSummary?.inProgress ?? 0 }}">
                  </div>
                  <div class="wo-seg wo-seg--done"
                    [style.flex]="dashboard()?.workOrderSummary?.completed ?? 0"
                    title="Completed: {{ dashboard()?.workOrderSummary?.completed ?? 0 }}">
                  </div>
                  <div class="wo-seg wo-seg--overdue"
                    [style.flex]="dashboard()?.workOrderSummary?.overdue ?? 0"
                    title="Overdue: {{ dashboard()?.workOrderSummary?.overdue ?? 0 }}">
                  </div>
                </div>
                <span class="wo-bar-label">{{ woTotal() }} total</span>
              </div>
            }
          </div>

        </div>

        <!-- ── Charts ─────────────────────────────────────────────── -->
        <div class="section-title">Analytics</div>
        <div class="charts-grid">
          <div class="chart-card" style="animation-delay:0ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#14b8a61a; color:#14b8a6">
                  <lucide-icon [img]="fuelIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title">Fuel Cost / Month</span>
              </div>
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

          <div class="chart-card" style="animation-delay:100ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#f974161a; color:#f97416">
                  <lucide-icon [img]="wrenchIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title">Maintenance Cost / Month</span>
              </div>
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

          <div class="chart-card" style="animation-delay:200ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#10b9811a; color:#10b981">
                  <lucide-icon [img]="carIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title">Vehicle Status</span>
              </div>
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

          <div class="chart-card" style="animation-delay:300ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#ef44441a; color:#ef4444">
                  <lucide-icon [img]="alertIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title">Accidents &amp; Fines</span>
              </div>
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

    .header-right { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
    .last-updated { font-size: 12px; color: var(--text-muted); }
    .refresh-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
      background: white; color: var(--text-secondary); font-size: 12px;
      font-weight: 500; cursor: pointer; font-family: inherit;
      transition: all 0.15s;
    }
    .refresh-btn:hover:not(:disabled) { border-color: #cbd5e1; color: var(--text-primary); }
    .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinning { animation: spin 0.8s linear infinite; display: block; }

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
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-left: 4px solid var(--accent);
      animation: fadeSlideUp 0.45s ease both;
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.10); }
    .stat-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stat-value { display: block; font-size: 32px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-top: 4px; }
    .stat-sub { display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-skeleton { height: 120px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200%; border-radius: 12px; animation: shimmer 1.4s infinite; }
    .chart-skeleton { height: 280px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200%; border-radius: 12px; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }

    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 16px; }

    /* ── Widgets ── */
    .widgets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }

    .widget-card { display: flex; flex-direction: column; animation: fadeSlideUp 0.45s ease both; }
    .widget-empty { font-size: 13px; color: var(--text-muted); margin: 12px 0 0; }
    .widget-link { font-size: 12px; color: #6366f1; text-decoration: none; font-weight: 500; }
    .widget-link:hover { text-decoration: underline; }

    .widget-badges { display: flex; gap: 6px; align-items: center; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .badge--red { background: #fef2f2; color: #ef4444; }
    .badge--amber { background: #fffbeb; color: #f59e0b; }

    /* Compliance table */
    .compliance-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .compliance-table th { text-align: left; font-weight: 600; color: var(--text-muted); padding: 4px 6px; border-bottom: 1px solid #f1f5f9; }
    .compliance-table td { padding: 6px 6px; border-bottom: 1px solid #f8fafc; color: var(--text-primary); }
    .compliance-row--expired td { background: #fef2f2; }
    .compliance-row--expired td:first-child { border-left: 3px solid #ef4444; }
    .compliance-row--due_soon td { background: #fffbeb; }
    .compliance-row--due_soon td:first-child { border-left: 3px solid #f59e0b; }
    .reg-cell { font-weight: 600; }

    .type-chip { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
    .type-chip--insurance { background: #eff6ff; color: #3b82f6; }
    .type-chip--registration { background: #f5f3ff; color: #8b5cf6; }
    .type-chip--inspection { background: #ecfdf5; color: #10b981; }

    .days-badge { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 4px; }
    .days-badge--expired { background: #fef2f2; color: #ef4444; }
    .days-badge--soon { background: #fffbeb; color: #f59e0b; }

    /* Assignment widget */
    .assignment-numbers { display: flex; align-items: center; justify-content: center; gap: 0; margin: 16px 0 12px; }
    .assign-block { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .assign-value { font-size: 40px; font-weight: 800; line-height: 1; }
    .assign-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .assign-divider { width: 1px; height: 48px; background: #f1f5f9; }
    .assign-bar-wrap { display: flex; align-items: center; gap: 10px; }
    .assign-bar { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .assign-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
    .assign-pct { font-size: 11px; color: var(--text-muted); white-space: nowrap; }

    /* Work orders widget */
    .work-order-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 8px;
    }
    .wo-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 8px;
      border-radius: 8px;
      background: #f8fafc;
    }
    .wo-stat--overdue { background: #fef2f2; }
    .wo-count { font-size: 28px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .wo-label { font-size: 11px; color: var(--text-muted); text-align: center; }

    .wo-bar-wrap { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    .wo-bar { flex: 1; height: 8px; border-radius: 4px; overflow: hidden; display: flex; }
    .wo-seg { height: 100%; min-width: 4px; transition: flex 0.6s ease; }
    .wo-seg--open { background: #f97416; }
    .wo-seg--progress { background: #6366f1; }
    .wo-seg--done { background: #10b981; }
    .wo-seg--overdue { background: #ef4444; }
    .wo-bar-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; }

    /* ── Charts ── */
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
      animation: fadeSlideUp 0.45s ease both;
      overflow: hidden;
    }

    .chart-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .chart-card-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chart-icon {
      width: 28px; height: 28px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
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
      width: 100%;
      height: 220px;
      overflow: hidden;
    }

    .chart-wrap--doughnut {
      position: relative;
      width: 100%;
      height: 220px;
      overflow: hidden;
    }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 900px) {
      .widgets-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 600px) {
      .page { padding: 16px; }
      .stats-grid { grid-template-columns: 1fr; }
      .charts-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = signal(true);
  cards = signal<StatCard[]>([]);
  dashboard = signal<DashboardData | null>(null);
  complianceReminders = signal<ComplianceReminder[]>([]);

  fuelChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  maintChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  statusChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  trendChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });

  readonly fuelIcon = Fuel;
  readonly wrenchIcon = Wrench;
  readonly carIcon = Car;
  readonly alertIcon = TriangleAlert;
  readonly alertCircleIcon = AlertCircle;
  readonly clockIcon = Clock;
  readonly checkCircleIcon = CheckCircle;
  readonly usersIcon = Users;
  readonly refreshIcon = RefreshCw;

  expiredCount = signal(0);
  dueSoonCount = signal(0);
  assignedPct = signal(0);
  secondsAgo = signal(0);
  woTotal = signal(0);

  private refreshedAt: Date | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private resizeObserver?: ResizeObserver;

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 100,
    animation: { duration: 800, easing: 'easeInOutQuart' },
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
    resizeDelay: 100,
    animation: { duration: 900, animateRotate: true, animateScale: true },
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } }
    },
    cutout: '60%'
  };

  lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 100,
    animation: { duration: 1000, easing: 'easeInOutCubic' },
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
    }
  };

  constructor(private dashboardApi: DashboardApiService) {}

  ngOnInit(): void {
    this.loadData();
    this.tickInterval = setInterval(() => {
      if (this.refreshedAt) {
        this.secondsAgo.set(Math.floor((Date.now() - this.refreshedAt.getTime()) / 1000));
      }
    }, 1000);
  }

  ngAfterViewInit(): void {
    const container = document.querySelector('.page');
    if (container) {
      this.resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          Object.values(Chart.instances).forEach(chart => chart.resize());
        }, 300);
      });
      this.resizeObserver.observe(container);
    }
  }

  ngOnDestroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.resizeObserver?.disconnect();
  }

  refresh(): void {
    this.loading.set(true);
    this.loadData();
  }

  private loadData(): void {
    this.dashboardApi.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.refreshedAt = new Date();
        this.secondsAgo.set(0);

        // ── Stat cards ─────────────────────────────────────────────
        this.cards.set([
          { label: 'Vehicles', value: data.activeVehicles, sub: `${data.activeVehicles} active`, route: '/vehicles', icon: Car, accent: '#10b981' },
          { label: 'Open Orders', value: data.openMaintenanceOrders, sub: 'Maintenance in progress', route: '/maintenance', icon: Wrench, accent: '#f97316' },
          { label: 'KM This Month', value: data.kmThisMonth, sub: 'From odometer logs', route: '/odometer', icon: MapPin, accent: '#6366f1' },
          { label: 'Expired Insurance', value: data.expiredInsurance, sub: 'Policies expired', route: '/insurance', icon: Shield, accent: '#3b82f6' },
          { label: 'Inspections Due', value: data.inspectionsDue, sub: 'Within 30 days', route: '/inspections', icon: Search, accent: '#06b6d4' },
          { label: 'Fines', value: data.unpaidFines, sub: 'Unpaid fines', route: '/fines', icon: TriangleAlert, accent: '#f59e0b' },
          { label: 'Accidents', value: data.accidentCount, sub: 'Reported incidents', route: '/accidents', icon: Siren, accent: '#ef4444' },
          { label: 'Fuel Cost This Month', value: Math.round(data.fuelCostThisMonth), sub: 'EUR spent on fuel', route: '/fuel', icon: Fuel, accent: '#14b8a6' },
        ]);

        // ── Compliance widget ──────────────────────────────────────
        this.complianceReminders.set(data.complianceReminders);
        this.expiredCount.set(data.complianceReminders.filter(r => r.status === 'expired').length);
        this.dueSoonCount.set(data.complianceReminders.filter(r => r.status === 'due_soon').length);

        // ── Assignment widget ──────────────────────────────────────
        const total = data.assignmentSummary.totalVehicles;
        this.assignedPct.set(total > 0 ? Math.round((data.assignmentSummary.assigned / total) * 100) : 0);

        // ── Work orders total ──────────────────────────────────────
        const wo = data.workOrderSummary;
        this.woTotal.set((wo?.open ?? 0) + (wo?.inProgress ?? 0) + (wo?.completed ?? 0) + (wo?.overdue ?? 0));

        // ── Charts ─────────────────────────────────────────────────
        const labels = last6MonthLabels();

        this.fuelChartData.set({
          labels,
          datasets: [{
            label: 'Fuel Cost (EUR)',
            data: data.fuelCostByMonth,
            backgroundColor: '#14b8a6',
            borderRadius: 6,
            borderSkipped: false,
          }]
        });

        this.maintChartData.set({
          labels,
          datasets: [{
            label: 'Maintenance Cost (EUR)',
            data: data.maintenanceCostByMonth,
            backgroundColor: '#f97316',
            borderRadius: 6,
            borderSkipped: false,
          }]
        });

        const sb = data.vehicleStatusBreakdown;
        this.statusChartData.set({
          labels: ['Active', 'In Service', 'Retired', 'Sold'],
          datasets: [{
            data: [sb.active, sb.inService, sb.retired, sb.sold],
            backgroundColor: ['#10b981', '#f97316', '#94a3b8', '#ef4444'],
            hoverOffset: 8,
          }]
        });

        this.trendChartData.set({
          labels,
          datasets: [
            {
              label: 'Accidents',
              data: data.accidentsByMonth,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.12)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Fines',
              data: data.finesByMonth,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.10)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
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
