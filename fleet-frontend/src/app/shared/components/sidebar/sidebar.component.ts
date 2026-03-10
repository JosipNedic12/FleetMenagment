import { Component, signal, Input, Output, EventEmitter } from '@angular/core';
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
    <aside class="sidebar" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen">
      <!-- Toggle button -->
      <button class="toggle-btn" (click)="toggle()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
        <lucide-icon [img]="collapsed() ? chevronRight : chevronLeft" [size]="14" [strokeWidth]="2.5"></lucide-icon>
      </button>

      <!-- Logo -->
      <a routerLink="/dashboard" class="sidebar-logo" title="MaxFleet – Go to Dashboard">
        <img src="maxfleet-logo.png" alt="MaxFleet" class="logo-img" />
        @if (!collapsed()) { <span class="logo-text">MaxFleet</span> }
      </a>

      <!-- Nav -->
      <nav class="sidebar-nav" aria-label="Main navigation">

        <!-- Overview -->
        <div class="nav-group">
          @if (!collapsed()) { <div class="nav-section-label">Overview</div> }
          @else { <div class="nav-divider"></div> }
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" [attr.data-tooltip]="collapsed() ? 'Dashboard' : null">
            <lucide-icon [img]="icons.LayoutDashboard" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
            @if (!collapsed()) {<span>Dashboard</span>}
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item" [attr.data-tooltip]="collapsed() ? 'Reports' : null">
            <lucide-icon [img]="icons.ChartBar" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
            @if (!collapsed()) {<span>Reports</span>}
          </a>
        </div>

        <!-- Fleet -->
        <div class="nav-group">
          @if (!collapsed()) { <div class="nav-section-label">Fleet</div> }
          @else { <div class="nav-divider"></div> }
          @for (item of fleetItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-item" [attr.data-tooltip]="collapsed() ? item.label : null">
              <lucide-icon [img]="item.icon" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
              @if (!collapsed()) {<span>{{ item.label }}</span>}
            </a>
          }
        </div>

        <!-- Compliance -->
        <div class="nav-group">
          @if (!collapsed()) { <div class="nav-section-label">Compliance</div> }
          @else { <div class="nav-divider"></div> }
          @for (item of complianceItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-item" [attr.data-tooltip]="collapsed() ? item.label : null">
              <lucide-icon [img]="item.icon" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
              @if (!collapsed()) {<span>{{ item.label }}</span>}
            </a>
          }
        </div>

        <!-- Admin -->
        @if (auth.hasRole('Admin')) {
          <div class="nav-group">
            @if (!collapsed()) { <div class="nav-section-label">Admin</div> }
            @else { <div class="nav-divider"></div> }
            <a routerLink="/users" routerLinkActive="active" class="nav-item" [attr.data-tooltip]="collapsed() ? 'User Management' : null">
              <lucide-icon [img]="icons.Users" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
              @if (!collapsed()) {<span>User Management</span>}
            </a>
          </div>
        }

      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <button class="nav-item logout-btn" (click)="auth.logout()" [attr.data-tooltip]="collapsed() ? 'Logout' : null" aria-label="Logout">
          <lucide-icon [img]="icons.LogOut" [size]="17" class="nav-icon" [strokeWidth]="1.8"></lucide-icon>
          @if (!collapsed()) {<span>Logout</span>}
        </button>
      </div>
    </aside>
  `,
  styles: [`
    /* ── Layout ── */
    .sidebar {
      position: fixed; top: 0; left: 0;
      width: 240px; height: 100vh;
      background: var(--sidebar-bg);
      display: flex; flex-direction: column;
      border-right: 1px solid var(--sidebar-border);
      z-index: 300;
      transition: width 0.25s ease, transform 0.25s ease;
      overflow: hidden;
    }
    .sidebar.collapsed { width: 64px; }

    /* Mobile: hidden by default, slides in when open */
    @media (max-width: 767px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.mobile-open { transform: translateX(0); width: 240px; }
    }

    /* ── Toggle ── */
    .toggle-btn {
      position: absolute; top: 20px; right: -12px;
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--topbar-bg);
      border: 1px solid var(--sidebar-border);
      color: var(--sidebar-muted);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      z-index: 101;
      transition: all 0.15s;
      padding: 0;
    }
    .toggle-btn:hover { background: var(--sidebar-hover); color: var(--sidebar-text); }

    @media (max-width: 767px) {
      .toggle-btn { display: none; }
    }

    /* ── Logo ── */
    .sidebar-logo {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--sidebar-border);
      white-space: nowrap; text-decoration: none;
      cursor: pointer; transition: opacity 0.15s;
    }
    .sidebar-logo:hover { opacity: 0.85; }
    .collapsed .sidebar-logo { justify-content: center; padding: 20px 0 16px; }
    .logo-img { width: 60px; height: 60px; object-fit: contain; flex-shrink: 0; }
    .logo-text { font-size: 17px; font-weight: 700; color: var(--sidebar-text); letter-spacing: -0.3px; }

    /* ── Nav groups ── */
    .sidebar-nav {
      flex: 1; padding: 8px 12px 0;
      display: flex; flex-direction: column;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--sidebar-border) transparent;
    }
    .sidebar-nav::-webkit-scrollbar { width: 4px; }
    .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
    .sidebar-nav::-webkit-scrollbar-thumb { background: var(--sidebar-border); border-radius: 4px; }
    .collapsed .sidebar-nav { padding: 8px 8px 0; align-items: center; }

    .nav-group { display: flex; flex-direction: column; gap: 2px; }
    .collapsed .nav-group { align-items: center; }

    /* Section labels */
    .nav-section-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--sidebar-muted);
      padding: 14px 8px 4px;
      white-space: nowrap;
      border-top: 1px solid var(--sidebar-border);
      margin-top: 4px;
    }
    .nav-group:first-child .nav-section-label {
      border-top: none; margin-top: 0; padding-top: 8px;
    }

    /* Collapsed divider replaces section labels */
    .nav-divider {
      width: 24px; height: 1px;
      background: var(--sidebar-border);
      margin: 8px 0 4px;
    }

    /* ── Nav items ── */
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 7px;
      color: var(--sidebar-text-muted);
      font-size: 14px; font-weight: 500;
      text-decoration: none;
      transition: all 0.15s;
      cursor: pointer; border: none;
      background: none; width: 100%;
      text-align: left; white-space: nowrap;
      position: relative;
    }
    .collapsed .nav-item { justify-content: center; padding: 9px; width: auto; }

    .nav-item:hover { background: var(--sidebar-hover); color: var(--sidebar-text); }

    /* Active state with left accent bar */
    .nav-item.active {
      background: rgba(37,99,235,0.12);
      color: #93c5fd;
      font-weight: 600;
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0; top: 5px; bottom: 5px;
      width: 3px;
      background: var(--brand);
      border-radius: 0 2px 2px 0;
    }

    .nav-icon { flex-shrink: 0; display: flex; color: inherit; }
    lucide-icon { color: inherit; }

    /* ── Tooltip for collapsed mode ── */
    .collapsed .nav-item[data-tooltip] {
      overflow: visible;
    }
    .collapsed .nav-item[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: fixed;
      left: 72px;
      background: #1e293b;
      color: #f8fafc;
      font-size: 12px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      font-family: 'DM Sans', system-ui, sans-serif;
      transform: translateY(-50%);
      top: auto;
      margin-top: -1px;
    }

    /* ── Footer ── */
    .sidebar-footer { padding: 12px; border-top: 1px solid var(--sidebar-border); }
    .collapsed .sidebar-footer { display: flex; justify-content: center; }
    .logout-btn { color: var(--sidebar-muted); }
    .logout-btn:hover { color: #fca5a5; background: rgba(239,68,68,0.1); }
  `]
})
export class SidebarComponent {
  auth = inject(AuthService);
  collapsed = signal(false);

  @Input() mobileOpen = false;
  @Output() mobileClose = new EventEmitter<void>();

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

}
