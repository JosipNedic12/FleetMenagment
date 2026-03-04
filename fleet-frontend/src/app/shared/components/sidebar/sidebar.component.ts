import { Component, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import {
  LayoutDashboard, ChartBar, Car, UserRound, Link, Wrench, Fuel, MapPin,
  Shield, Clipboard, Search, TriangleAlert, Siren, Users, LogOut,
  ChevronLeft, ChevronRight,
} from 'lucide-angular';

interface NavItem { label: string; route: string; icon: LucideIconData; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <button class="toggle-btn" (click)="toggle()" [attr.title]="collapsed() ? 'Show sidebar' : 'Hide sidebar'">
        <lucide-icon [img]="collapsed() ? chevronRight : chevronLeft" [size]="14" [strokeWidth]="2.5"></lucide-icon>
      </button>

      <a routerLink="/dashboard" class="sidebar-logo" title="MaxFleet – Go to Dashboard">
        <img src="maxfleet-logo.png" alt="MaxFleet" class="logo-img" [class.logo-img-collapsed]="collapsed()" />
        @if (!collapsed()) { <span class="logo-text">MaxFleet</span> }
      </a>

      <a routerLink="/profile" class="sidebar-user sidebar-user-link" routerLinkActive="user-active">
        <div class="user-avatar">{{ initials() }}</div>
        @if (!collapsed()) {
          <div class="user-info">
            <span class="user-name">{{ auth.fullName() }}</span>
            <span class="user-role">{{ auth.role() }}</span>
          </div>
          <lucide-icon [img]="chevronRight" [size]="14" class="user-arrow" [strokeWidth]="2"></lucide-icon>
        }
      </a>

      <nav class="sidebar-nav">
        @if (!collapsed()) { <div class="nav-section-label">Overview</div> }
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" [attr.title]="collapsed() ? 'Dashboard' : null">
          <lucide-icon [img]="icons.LayoutDashboard" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
          @if (!collapsed()) {<span>Dashboard</span>}
        </a>
        <a routerLink="/reports" routerLinkActive="active" class="nav-item" [attr.title]="collapsed() ? 'Reports' : null">
          <lucide-icon [img]="icons.ChartBar" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
          @if (!collapsed()) {<span>Reports</span>}
        </a>
        @if (!collapsed()) { <div class="nav-section-label">Fleet</div> }
        @for (item of fleetItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item" [attr.title]="collapsed() ? item.label : null">
            <lucide-icon [img]="item.icon" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
            @if (!collapsed()) {<span>{{ item.label }}</span>}
          </a>
        }
        @if (!collapsed()) { <div class="nav-section-label">Compliance</div> }
        @for (item of complianceItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item" [attr.title]="collapsed() ? item.label : null">
            <lucide-icon [img]="item.icon" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
            @if (!collapsed()) {<span>{{ item.label }}</span>}
          </a>
        }
        @if (auth.hasRole('Admin')) {
          @if (!collapsed()) { <div class="nav-section-label">Admin</div> }
          <a routerLink="/users" routerLinkActive="active" class="nav-item" [attr.title]="collapsed() ? 'User Management' : null">
            <lucide-icon [img]="icons.Users" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
            @if (!collapsed()) {<span>User Management</span>}
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item logout-btn" (click)="auth.logout()" [attr.title]="collapsed() ? 'Logout' : null">
          <lucide-icon [img]="icons.LogOut" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
          @if (!collapsed()) {<span>Logout</span>}
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar { position:fixed; top:0; left:0; width:240px; height:100vh; background:var(--sidebar-bg); display:flex; flex-direction:column; border-right:1px solid var(--sidebar-border); z-index:100; transition:width 0.25s ease; overflow:hidden; }
    .sidebar.collapsed { width:64px; }
    .toggle-btn { position:absolute; top:20px; right:-12px; width:24px; height:24px; border-radius:50%; background:var(--sidebar-bg); border:1px solid var(--sidebar-border); color:var(--sidebar-muted); font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:101; transition:all 0.15s; line-height:1; padding:0; }
    .toggle-btn:hover { background:var(--sidebar-hover); color:var(--sidebar-text); }
    .sidebar-logo { display:flex; align-items:center; gap:10px; padding:20px 20px 16px; border-bottom:1px solid var(--sidebar-border); white-space:nowrap; text-decoration:none; cursor:pointer; transition:opacity 0.15s; }
    .sidebar-logo:hover { opacity:0.85; }
    .collapsed .sidebar-logo { justify-content:center; padding:20px 0 16px; }
    .logo-img { width:60px; height:60px; object-fit:contain; flex-shrink:0; }
    .logo-img-collapsed { width:60px; height:60px; }
    .logo-text { font-size:17px; font-weight:700; color:var(--sidebar-text); letter-spacing:-0.3px; }
    .sidebar-user { display:flex; align-items:center; gap:10px; padding:14px 20px; border-bottom:1px solid var(--sidebar-border); white-space:nowrap; }
    .collapsed .sidebar-user { justify-content:center; padding:14px 0; }
    .sidebar-user-link { text-decoration:none; cursor:pointer; transition:background 0.15s; position:relative; }
    .sidebar-user-link:hover { background:var(--sidebar-hover); }
    .sidebar-user-link.user-active { background:rgba(37, 99, 235, 0.1); }
    .user-arrow { margin-left:auto; color:var(--sidebar-muted); transition:transform 0.15s, color 0.15s; display:flex; }
    .sidebar-user-link:hover .user-arrow { color:var(--sidebar-text); transform:translateX(2px); }
    .user-avatar { width:34px; height:34px; border-radius:50%; background:var(--brand); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
    .user-name { display:block; font-size:13px; font-weight:600; color:var(--sidebar-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-role { display:block; font-size:11px; color:var(--sidebar-muted); }
    .sidebar-nav { flex:1; padding:12px 12px 0; display:flex; flex-direction:column; gap:2px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:var(--sidebar-border) transparent; }
    .sidebar-nav::-webkit-scrollbar { width:4px; }
    .sidebar-nav::-webkit-scrollbar-track { background:transparent; }
    .sidebar-nav::-webkit-scrollbar-thumb { background:var(--sidebar-border); border-radius:4px; }
    .sidebar-nav::-webkit-scrollbar-thumb:hover { background:var(--sidebar-muted); }
    .collapsed .sidebar-nav { padding:12px 8px 0; align-items:center; }
    .nav-section-label { font-size:10px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:var(--sidebar-muted); padding:12px 8px 4px; white-space:nowrap; }
    .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:7px; color:var(--sidebar-text-muted); font-size:14px; font-weight:500; text-decoration:none; transition:all 0.15s; cursor:pointer; border:none; background:none; width:100%; text-align:left; white-space:nowrap; }
    .collapsed .nav-item { justify-content:center; padding:9px; width:auto; }
    .nav-item:hover { background:var(--sidebar-hover); color:var(--sidebar-text); }
    .nav-item.active { background:var(--brand-subtle); color:var(--brand); font-weight:600; }
    .nav-icon { flex-shrink:0; display:flex; color:inherit; }
    .sidebar-footer { padding:12px; border-top:1px solid var(--sidebar-border); }
    .collapsed .sidebar-footer { display:flex; justify-content:center; }
    .logout-btn { color:var(--sidebar-muted); }
    .logout-btn:hover { color:#ef4444; background:#fef2f2; }
    /* Lucide icon color inheritance */
    lucide-icon { color: inherit; }
  `]
})
export class SidebarComponent {
  auth = inject(AuthService);
  collapsed = signal(false);

  readonly icons = { LayoutDashboard, ChartBar, Users, LogOut };
  readonly chevronLeft = ChevronLeft;
  readonly chevronRight = ChevronRight;

  toggle() { this.collapsed.update(v => !v); }

  fleetItems: NavItem[] = [
    { label: 'Vehicles',     route: '/vehicles',    icon: Car },
    { label: 'Drivers',      route: '/drivers',     icon: UserRound },
    { label: 'Assignments',  route: '/assignments', icon: Link },
    { label: 'Maintenance',  route: '/maintenance', icon: Wrench },
    { label: 'Fuel',         route: '/fuel',        icon: Fuel },
    { label: 'Odometer',     route: '/odometer',    icon: MapPin },
  ];

  complianceItems: NavItem[] = [
    { label: 'Insurance',    route: '/insurance',    icon: Shield },
    { label: 'Registration', route: '/registration', icon: Clipboard },
    { label: 'Inspections',  route: '/inspections',  icon: Search },
    { label: 'Fines',        route: '/fines',        icon: TriangleAlert },
    { label: 'Accidents',    route: '/accidents',    icon: Siren },
  ];

  initials = computed(() =>
    this.auth.fullName().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  );
}
