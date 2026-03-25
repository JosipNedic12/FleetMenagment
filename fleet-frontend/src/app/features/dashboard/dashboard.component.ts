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
import { formatEu } from '../../shared/pipes/eu-number.pipe';
import { TranslateService } from '../../core/services/translate.service';

Chart.register(...registerables);

interface StatCard {
  label: string;
  value: string;
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
          <h1 class="page-title" i18n="@@dashboard.title">Dashboard</h1>
          <p class="page-subtitle" i18n="@@dashboard.subtitle">Fleet compliance overview</p>
        </div>
        <div class="header-right">
          <span class="last-updated">
            @if (secondsAgo() < 5) {
              <ng-container i18n="@@dashboard.updatedJustNow">Updated just now</ng-container>
            } @else {
              <ng-container i18n="@@dashboard.lastRefreshed">Last refreshed: {{ secondsAgo() }}s ago</ng-container>
            }
          </span>
          <button class="refresh-btn" (click)="refresh()" [disabled]="loading()">
            <lucide-icon [img]="refreshIcon" [size]="14" [strokeWidth]="2" [class.spinning]="loading()"></lucide-icon>
            <ng-container i18n="@@dashboard.refreshBtn">Refresh</ng-container>
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
        <div class="section-title" i18n="@@dashboard.sectionOperational">Operational Summary</div>
        <div class="widgets-grid">

          <!-- Compliance Reminders -->
          <div class="chart-card widget-card" style="animation-delay:0ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#ef44441a; color:#ef4444">
                  <lucide-icon [img]="alertCircleIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title" i18n="@@dashboard.complianceRemindersTitle">Compliance Reminders</span>
              </div>
              <div class="widget-badges">
                @if (expiredCount() > 0) {
                  <span class="badge badge--red" i18n="@@dashboard.badgeExpired">{{ expiredCount() }} expired</span>
                }
                @if (dueSoonCount() > 0) {
                  <span class="badge badge--amber" i18n="@@dashboard.badgeDueSoon">{{ dueSoonCount() }} due soon</span>
                }
              </div>
            </div>
            @if (complianceReminders().length === 0) {
              <p class="widget-empty" i18n="@@dashboard.complianceEmpty">All compliance items are up to date.</p>
            } @else {
              <table class="compliance-table">
                <thead>
                  <tr>
                    <th i18n="@@dashboard.colVehicle">Vehicle</th>
                    <th i18n="@@dashboard.colType">Type</th>
                    <th i18n="@@dashboard.colExpires">Expires</th>
                    <th i18n="@@dashboard.colDays">Days</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of complianceReminders(); track item.vehicleId + item.type) {
                    <tr [class]="'compliance-row--' + item.status">
                      <td class="reg-cell">{{ item.registrationNumber }}</td>
                      <td>
                        <span class="type-chip type-chip--{{ item.type | lowercase }}">{{ item.type }}</span>
                      </td>
                      <td>{{ item.expiresAt | date:'dd.MM.yyyy' }}</td>
                      <td>
                        <span [class]="item.daysLeft < 0 ? 'days-badge days-badge--expired' : 'days-badge days-badge--soon'"
                          i18n="@@dashboard.daysCell">{{ item.daysLeft < 0 ? (item.daysLeft * -1) + 'd ago' : item.daysLeft + 'd' }}</span>
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
                <span class="chart-card-title" i18n="@@dashboard.vehicleAssignmentsTitle">Vehicle Assignments</span>
              </div>
              <span class="chart-card-sub" i18n="@@dashboard.assignmentTotal">{{ dashboard()?.assignmentSummary?.totalVehicles ?? 0 }} total</span>
            </div>
            <div class="assignment-numbers">
              <div class="assign-block">
                <span class="assign-value" style="color:#10b981">{{ dashboard()?.assignmentSummary?.assigned ?? 0 }}</span>
                <span class="assign-label" i18n="@@dashboard.assignedLabel">Assigned</span>
              </div>
              <div class="assign-divider"></div>
              <div class="assign-block">
                <span class="assign-value" style="color:#94a3b8">{{ dashboard()?.assignmentSummary?.unassigned ?? 0 }}</span>
                <span class="assign-label" i18n="@@dashboard.unassignedLabel">Unassigned</span>
              </div>
            </div>
            <div class="assign-bar-wrap">
              <div class="assign-bar">
                <div class="assign-bar-fill"
                  [style.width]="assignedPct() + '%'"
                  style="background:#10b981">
                </div>
              </div>
              <span class="assign-pct" i18n="@@dashboard.assignedPct">{{ assignedPct() }}% assigned</span>
            </div>
          </div>

          <!-- Work Orders -->
          <div class="chart-card widget-card" style="animation-delay:200ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#f974161a; color:#f97416">
                  <lucide-icon [img]="wrenchIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title" i18n="@@dashboard.workOrdersTitle">Work Orders</span>
              </div>
              <a routerLink="/maintenance" class="chart-card-sub widget-link" i18n="@@dashboard.workOrdersViewAll">View all</a>
            </div>
            <div class="work-order-stats">
              <div class="wo-stat">
                <lucide-icon [img]="clockIcon" [size]="16" [strokeWidth]="2" style="color:#f97416"></lucide-icon>
                <span class="wo-count">{{ dashboard()?.workOrderSummary?.open ?? 0 }}</span>
                <span class="wo-label" i18n="@@dashboard.woOpen">Open</span>
              </div>
              <div class="wo-stat">
                <lucide-icon [img]="wrenchIcon" [size]="16" [strokeWidth]="2" style="color:#6366f1"></lucide-icon>
                <span class="wo-count">{{ dashboard()?.workOrderSummary?.inProgress ?? 0 }}</span>
                <span class="wo-label" i18n="@@dashboard.woInProgress">In Progress</span>
              </div>
              <div class="wo-stat">
                <lucide-icon [img]="checkCircleIcon" [size]="16" [strokeWidth]="2" style="color:#10b981"></lucide-icon>
                <span class="wo-count">{{ dashboard()?.workOrderSummary?.completed ?? 0 }}</span>
                <span class="wo-label" i18n="@@dashboard.woCompleted">Completed</span>
              </div>
              <div class="wo-stat wo-stat--overdue">
                <lucide-icon [img]="alertCircleIcon" [size]="16" [strokeWidth]="2" style="color:#ef4444"></lucide-icon>
                <span class="wo-count" style="color:#ef4444">{{ dashboard()?.workOrderSummary?.overdue ?? 0 }}</span>
                <span class="wo-label" i18n="@@dashboard.woOverdue">Overdue</span>
              </div>
            </div>
            <!-- Segmented progress bar -->
            @if (woTotal() > 0) {
              <div class="wo-bar-wrap">
                <div class="wo-bar">
                  <div class="wo-seg wo-seg--open"
                    [style.flex]="dashboard()?.workOrderSummary?.open ?? 0"
                    i18n-title="@@dashboard.woSegOpenTitle"
                    title="Open: {{ dashboard()?.workOrderSummary?.open ?? 0 }}">
                  </div>
                  <div class="wo-seg wo-seg--progress"
                    [style.flex]="dashboard()?.workOrderSummary?.inProgress ?? 0"
                    i18n-title="@@dashboard.woSegProgressTitle"
                    title="In Progress: {{ dashboard()?.workOrderSummary?.inProgress ?? 0 }}">
                  </div>
                  <div class="wo-seg wo-seg--done"
                    [style.flex]="dashboard()?.workOrderSummary?.completed ?? 0"
                    i18n-title="@@dashboard.woSegDoneTitle"
                    title="Completed: {{ dashboard()?.workOrderSummary?.completed ?? 0 }}">
                  </div>
                  <div class="wo-seg wo-seg--overdue"
                    [style.flex]="dashboard()?.workOrderSummary?.overdue ?? 0"
                    i18n-title="@@dashboard.woSegOverdueTitle"
                    title="Overdue: {{ dashboard()?.workOrderSummary?.overdue ?? 0 }}">
                  </div>
                </div>
                <span class="wo-bar-label" i18n="@@dashboard.woTotal">{{ woTotal() }} total</span>
              </div>
            }
          </div>

        </div>

        <!-- ── Charts ─────────────────────────────────────────────── -->
        <div class="section-title" i18n="@@dashboard.sectionAnalytics">Analytics</div>
        <div class="charts-grid">
          <div class="chart-card" style="animation-delay:0ms">
            <div class="chart-card-header">
              <div class="chart-card-title-group">
                <div class="chart-icon" style="background:#14b8a61a; color:#14b8a6">
                  <lucide-icon [img]="fuelIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
                </div>
                <span class="chart-card-title" i18n="@@dashboard.fuelCostTitle">Fuel Cost / Month</span>
              </div>
              <span class="chart-card-sub" i18n="@@dashboard.fuelCostSub">Last 6 months (EUR)</span>
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
                <span class="chart-card-title" i18n="@@dashboard.maintCostTitle">Maintenance Cost / Month</span>
              </div>
              <span class="chart-card-sub" i18n="@@dashboard.maintCostSub">Last 6 months (EUR)</span>
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
                <span class="chart-card-title" i18n="@@dashboard.vehicleStatusTitle">Vehicle Status</span>
              </div>
              <span class="chart-card-sub" i18n="@@dashboard.vehicleStatusSub">Current fleet breakdown</span>
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
                <span class="chart-card-title" i18n="@@dashboard.accidentsFinesTitle">Accidents &amp; Fines</span>
              </div>
              <span class="chart-card-sub" i18n="@@dashboard.accidentsFinesSub">Monthly count – last 6 months</span>
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
      padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 8px;
      background: var(--card-bg); color: var(--text-secondary); font-size: 12px;
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
      background: var(--card-bg);
      border-radius: 12px;
      padding: 20px;
      text-decoration: none;
      border: 1.5px solid var(--border);
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
    .stat-skeleton { height: 120px; background: linear-gradient(90deg, var(--subtle-bg) 25%, var(--border) 50%, var(--subtle-bg) 75%); background-size: 200%; border-radius: 12px; animation: shimmer 1.4s infinite; }
    .chart-skeleton { height: 280px; background: linear-gradient(90deg, var(--subtle-bg) 25%, var(--border) 50%, var(--subtle-bg) 75%); background-size: 200%; border-radius: 12px; animation: shimmer 1.4s infinite; }
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
    .badge--red { background: rgba(239,68,68,0.12); color: #ef4444; }
    .badge--amber { background: rgba(245,158,11,0.12); color: #f59e0b; }

    /* Compliance table */
    .compliance-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .compliance-table th { text-align: left; font-weight: 600; color: var(--text-muted); padding: 4px 6px; border-bottom: 1px solid var(--border); }
    .compliance-table td { padding: 6px 6px; border-bottom: 1px solid var(--border); color: var(--text-primary); }
    .compliance-row--expired td { background: var(--row-danger-bg); }
    .compliance-row--expired td:first-child { border-left: 3px solid #ef4444; }
    .compliance-row--due_soon td { background: var(--row-warn-bg); }
    .compliance-row--due_soon td:first-child { border-left: 3px solid #f59e0b; }
    .reg-cell { font-weight: 600; }

    .type-chip { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: capitalize; letter-spacing: 0.4px; }
    .type-chip--insurance { background: rgba(59,130,246,0.12); color: #3b82f6; }
    .type-chip--registration { background: rgba(139,92,246,0.12); color: #8b5cf6; }
    .type-chip--inspection { background: rgba(16,185,129,0.12); color: #10b981; }

    .days-badge { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 4px; }
    .days-badge--expired { background: rgba(239,68,68,0.12); color: #ef4444; }
    .days-badge--soon { background: rgba(245,158,11,0.12); color: #f59e0b; }

    /* Assignment widget */
    .assignment-numbers { display: flex; align-items: center; justify-content: center; gap: 0; margin: 16px 0 12px; }
    .assign-block { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .assign-value { font-size: 40px; font-weight: 800; line-height: 1; }
    .assign-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .assign-divider { width: 1px; height: 48px; background: var(--border); }
    .assign-bar-wrap { display: flex; align-items: center; gap: 10px; }
    .assign-bar { flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
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
      background: var(--subtle-bg);
    }
    .wo-stat--overdue { background: var(--row-danger-bg); }
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
      background: var(--card-bg);
      border-radius: 12px;
      padding: 20px 24px;
      border: 1.5px solid var(--border);
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

  barOptions!: ChartOptions<'bar'>;

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
      y: { grid: { color: () => getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e2e8f0' }, ticks: { font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
    }
  };

  constructor(private dashboardApi: DashboardApiService, private ts: TranslateService) {
    this.barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 100,
      animation: { duration: 800, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${(ctx.parsed.y ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${this.ts.currencySuffix}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: { grid: { color: () => getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e2e8f0' }, ticks: { font: { size: 11 }, callback: (v) => (v as number).toLocaleString('de-DE') } }
      }
    };
  }

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
          { label: this.ts.vehicles,         value: formatEu(data.activeVehicles),        sub: this.ts.activeCount(data.activeVehicles), route: '/vehicles',    icon: Car,           accent: '#10b981' },
          { label: this.ts.openOrders,       value: formatEu(data.openMaintenanceOrders), sub: this.ts.subMaintenanceInProgress,          route: '/maintenance', icon: Wrench,        accent: '#f97316' },
          { label: this.ts.kmThisMonth,      value: formatEu(data.kmThisMonth),           sub: this.ts.subFromOdometerLogs,               route: '/odometer',    icon: MapPin,        accent: '#6366f1' },
          { label: this.ts.expiredInsurance, value: formatEu(data.expiredInsurance),       sub: this.ts.subPoliciesExpired,                route: '/insurance',   icon: Shield,        accent: '#3b82f6' },
          { label: this.ts.inspectionsDue,   value: formatEu(data.inspectionsDue),         sub: this.ts.subWithin30Days,                   route: '/inspections', icon: Search,        accent: '#06b6d4' },
          { label: this.ts.fines,            value: formatEu(data.unpaidFines),            sub: this.ts.subUnpaidFines,                    route: '/fines',       icon: TriangleAlert, accent: '#f59e0b' },
          { label: this.ts.accidents,        value: formatEu(data.accidentCount),          sub: this.ts.subReportedIncidents,              route: '/accidents',   icon: Siren,         accent: '#ef4444' },
          { label: this.ts.fuelCostThisMonth,value: formatEu(data.fuelCostThisMonth),      sub: this.ts.subEurSpentOnFuel,                 route: '/fuel',        icon: Fuel,          accent: '#14b8a6' },
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
        const labels = last6MonthLabels(this.ts.months);

        this.fuelChartData.set({
          labels,
          datasets: [{
            label: this.ts.fuelCostEur,
            data: data.fuelCostByMonth,
            backgroundColor: '#14b8a6',
            borderRadius: 6,
            borderSkipped: false,
          }]
        });

        this.maintChartData.set({
          labels,
          datasets: [{
            label: this.ts.maintenanceCostEur,
            data: data.maintenanceCostByMonth,
            backgroundColor: '#f97316',
            borderRadius: 6,
            borderSkipped: false,
          }]
        });

        const sb = data.vehicleStatusBreakdown;
        this.statusChartData.set({
          labels: this.ts.vehicleStatusLabels,
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
              label: this.ts.chartAccidents,
              data: data.accidentsByMonth,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.12)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: this.ts.chartFines,
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
function last6MonthLabels(months: string[]): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  return labels;
}
