import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
interface NavItem { label: string; route: string; icon: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="var(--brand)"/>
          <path d="M6 18L10 10L14 15L18 8L22 18H6Z" fill="white"/>
        </svg>
        <span class="logo-text">FleetMgr</span>
      </div>

      <div class="sidebar-user">
        <div class="user-avatar">{{ initials() }}</div>
        <div class="user-info">
          <span class="user-name">{{ auth.fullName() }}</span>
          <span class="user-role">{{ auth.role() }}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Overview</div>
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">⊞</span><span>Dashboard</span>
        </a>
        <div class="nav-section-label">Fleet</div>
        @for (item of fleetItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">{{ item.icon }}</span><span>{{ item.label }}</span>
          </a>
        }
        <div class="nav-section-label">Compliance</div>
        @for (item of complianceItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">{{ item.icon }}</span><span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item logout-btn" (click)="auth.logout()">
          <span class="nav-icon">⇥</span><span>Logout</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar { width:240px; min-height:100vh; background:var(--sidebar-bg); display:flex; flex-direction:column; border-right:1px solid var(--sidebar-border); flex-shrink:0; }
    .sidebar-logo { display:flex; align-items:center; gap:10px; padding:20px 20px 16px; border-bottom:1px solid var(--sidebar-border); }
    .logo-text { font-size:17px; font-weight:700; color:var(--sidebar-text); letter-spacing:-0.3px; }
    .sidebar-user { display:flex; align-items:center; gap:10px; padding:14px 20px; border-bottom:1px solid var(--sidebar-border); }
    .user-avatar { width:34px; height:34px; border-radius:50%; background:var(--brand); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
    .user-name { display:block; font-size:13px; font-weight:600; color:var(--sidebar-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role { display:block; font-size:11px; color:var(--sidebar-muted); }
    .sidebar-nav { flex:1; padding:12px 12px 0; display:flex; flex-direction:column; gap:2px; }
    .nav-section-label { font-size:10px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:var(--sidebar-muted); padding:12px 8px 4px; }
    .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:7px; color:var(--sidebar-text-muted); font-size:14px; font-weight:500; text-decoration:none; transition:all 0.15s; cursor:pointer; border:none; background:none; width:100%; text-align:left; }
    .nav-item:hover { background:var(--sidebar-hover); color:var(--sidebar-text); }
    .nav-item.active { background:var(--brand-subtle); color:var(--brand); font-weight:600; }
    .nav-icon { font-size:15px; width:20px; text-align:center; flex-shrink:0; }
    .sidebar-footer { padding:12px; border-top:1px solid var(--sidebar-border); }
    .logout-btn { color:var(--sidebar-muted); }
    .logout-btn:hover { color:#ef4444; background:#fef2f2; }
  `]
})
export class SidebarComponent {
  auth = inject(AuthService);

  fleetItems: NavItem[] = [
    { label: 'Vehicles',     route: '/vehicles',    icon: '🚗' },
    { label: 'Drivers',      route: '/drivers',     icon: '👤' },
    { label: 'Assignments',  route: '/assignments', icon: '🔗' },
    { label: 'Maintenance',  route: '/maintenance', icon: '🔧' },
    { label: 'Fuel',         route: '/fuel',        icon: '⛽' },
    { label: 'Odometer',     route: '/odometer',    icon: '📍' },
  ];

  complianceItems: NavItem[] = [
    { label: 'Insurance',    route: '/insurance',    icon: '🛡' },
    { label: 'Registration', route: '/registration', icon: '📋' },
    { label: 'Inspections',  route: '/inspections',  icon: '🔍' },
    { label: 'Fines',        route: '/fines',        icon: '⚠' },
    { label: 'Accidents',    route: '/accidents',    icon: '🚨' },
  ];

  initials = computed(() =>
    this.auth.fullName().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  );
}