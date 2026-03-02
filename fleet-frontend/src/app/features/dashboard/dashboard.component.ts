import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { VehicleApiService, MaintenanceOrderApiService, OdometerLogApiService, InsurancePolicyApiService, RegistrationApiService, InspectionApiService, FineApiService, AccidentApiService } from '../../core/auth/feature-api.services';

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
  imports: [CommonModule, RouterLink],
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

        <!-- Quick links -->
        <div class="section-title">Quick Actions</div>
        <div class="quick-links">
          @for (card of cards(); track card.label) {
            <a [routerLink]="card.route" class="quick-link">
              <span>{{ card.icon }}</span>
              <span>View {{ card.label }}</span>
              <span class="arrow">→</span>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1100px; }
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
    @keyframes shimmer { to { background-position: -200% 0; } }

    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); margin-bottom: 12px; }
    .quick-links { display: flex; flex-direction: column; gap: 8px; max-width: 500px; }
    .quick-link {
      display: flex; align-items: center; gap: 12px;
      background: white; border-radius: 8px; padding: 12px 16px;
      text-decoration: none; color: var(--text-secondary);
      font-size: 14px; font-weight: 500;
      border: 1.5px solid #f1f5f9;
      transition: all 0.15s;
    }
    .quick-link:hover { border-color: var(--brand); color: var(--brand); }
    .arrow { margin-left: auto; opacity: 0.4; }
  `]
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  cards   = signal<StatCard[]>([]);

  constructor(
    private vehicleApi: VehicleApiService,
    private maintenanceApi: MaintenanceOrderApiService,
    private odometerApi: OdometerLogApiService,
    private insuranceApi: InsurancePolicyApiService,
    private registrationApi: RegistrationApiService,
    private inspectionApi: InspectionApiService,
    private fineApi: FineApiService,
    private accidentApi: AccidentApiService
  ) {}

  ngOnInit(): void {
    forkJoin({
      vehicles:     this.vehicleApi.getAll(),
      maintenance:  this.maintenanceApi.getAll(),
      odometer:     this.odometerApi.getAll(),
      insurance:    this.insuranceApi.getAll(),
      registration: this.registrationApi.getAll(),
      inspections:  this.inspectionApi.getAll(),
      fines:        this.fineApi.getAll(),
      accidents:    this.accidentApi.getAll()
    }).subscribe({
      next: (data) => {
        const now = new Date();
        const thisMonth = (d: string) => { const dt = new Date(d); return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth(); };

        const activeVehicles = data.vehicles.filter(v => v.status === 'active').length;
        const openOrders     = data.maintenance.filter(o => o.status === 'open' || o.status === 'in_progress').length;
        const kmThisMonth    = data.odometer.filter(o => thisMonth(o.logDate)).reduce((sum, o) => sum + o.odometerKm, 0);
        const unpaidFines    = data.fines.filter(f => !f.isPaid).length;
        const expiredIns     = data.insurance.filter(i => !i.isActive).length;

        this.cards.set([
          { label: 'Vehicles',           value: data.vehicles.length,     sub: `${activeVehicles} active`,        route: '/vehicles',      icon: '🚗', accent: '#10b981' },
          { label: 'Open Orders',        value: openOrders,               sub: 'Maintenance in progress',         route: '/maintenance',   icon: '🔧', accent: '#f97316' },
          { label: 'KM This Month',      value: kmThisMonth,              sub: 'From odometer logs',              route: '/odometer',      icon: '📍', accent: '#6366f1' },
          { label: 'Insurance Policies', value: data.insurance.length,    sub: `${expiredIns} expired`,           route: '/insurance',     icon: '🛡', accent: '#3b82f6' },
          { label: 'Registrations',      value: data.registration.length, sub: 'Active records',                  route: '/registration',  icon: '📋', accent: '#8b5cf6' },
          { label: 'Inspections',        value: data.inspections.length,  sub: 'Total inspections',               route: '/inspections',   icon: '🔍', accent: '#06b6d4' },
          { label: 'Fines',              value: data.fines.length,        sub: `${unpaidFines} unpaid`,           route: '/fines',         icon: '⚠', accent: '#f59e0b' },
          { label: 'Accidents',          value: data.accidents.length,    sub: 'Reported incidents',              route: '/accidents',     icon: '🚨', accent: '#ef4444' },
        ]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}