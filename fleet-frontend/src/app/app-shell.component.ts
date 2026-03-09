import { Component, signal, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { GlobalSearchComponent } from './shared/components/global-search/global-search.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LucideAngularModule, Bell, ChevronDown } from 'lucide-angular';
import { AuthService } from './core/auth/auth.service';
import { inject } from '@angular/core';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/reports':     'Reports',
  '/vehicles':    'Vehicles',
  '/drivers':     'Drivers',
  '/assignments': 'Assignments',
  '/maintenance': 'Maintenance',
  '/fuel':        'Fuel',
  '/odometer':    'Odometer',
  '/insurance':   'Insurance',
  '/registration':'Registration',
  '/inspections': 'Inspections',
  '/fines':       'Fines',
  '/accidents':   'Accidents',
  '/users':       'User Management',
  '/profile':     'My Profile',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, GlobalSearchComponent, LucideAngularModule, ToastComponent],
  template: `
    <div class="app-shell">
      <!-- Mobile backdrop -->
      @if (mobileOpen()) {
        <div class="mobile-backdrop" (click)="mobileOpen.set(false)"></div>
      }

      <app-sidebar
        #sidebar
        [mobileOpen]="mobileOpen()"
        (mobileClose)="mobileOpen.set(false)"
      />

      <div class="content-area" [class.sidebar-collapsed]="sidebar.collapsed()" [class.sidebar-expanded]="!sidebar.collapsed()">
        <header class="topbar">
          <!-- Left: hamburger (mobile) + breadcrumb -->
          <div class="topbar-left">
            <button class="topbar-hamburger" (click)="mobileOpen.set(true)" aria-label="Open menu">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
            <nav class="topbar-breadcrumb" aria-label="Breadcrumb">
              <span class="breadcrumb-home">MaxFleet</span>
              @if (pageLabel()) {
                <span class="breadcrumb-sep">/</span>
                <span class="breadcrumb-current">{{ pageLabel() }}</span>
              }
            </nav>
          </div>

          <!-- Center: global search -->
          <div class="topbar-center">
            <app-global-search />
          </div>

          <!-- Right: bell + avatar -->
          <div class="topbar-right">
            <button class="topbar-icon-btn" aria-label="Notifications" title="Notifications">
              <lucide-icon [img]="bellIcon" [size]="18" [strokeWidth]="1.8"></lucide-icon>
            </button>
            <div class="topbar-user">
              <div class="topbar-avatar" [title]="auth.fullName()">{{ initials() }}</div>
              <span class="topbar-username">{{ auth.fullName() }}</span>
              <lucide-icon [img]="chevronDownIcon" [size]="14" [strokeWidth]="2" class="topbar-chevron"></lucide-icon>
            </div>
          </div>
        </header>

        <main class="main-content">
          <router-outlet />
        </main>
      </div>
      <app-toast />
    </div>
  `,
  styles: [`
    .app-shell { min-height: 100vh; background: var(--page-bg); }

    /* Content area shifts with sidebar */
    .content-area {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      transition: margin-left 0.25s ease;
    }
    .content-area.sidebar-expanded  { margin-left: 240px; }
    .content-area.sidebar-collapsed { margin-left: 64px; }

    /* Top bar */
    .topbar {
      height: 56px;
      background: #fff;
      border-bottom: 1px solid var(--border, #e2e8f0);
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 20px;
      position: sticky;
      top: 0;
      z-index: 200;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .topbar-center {
      flex: 0 0 auto;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      justify-content: flex-end;
    }

    /* Hamburger (mobile only) */
    .topbar-hamburger {
      display: none;
      flex-direction: column;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .topbar-hamburger:hover { background: #f1f5f9; }
    .hamburger-line {
      width: 18px;
      height: 2px;
      background: var(--text-secondary);
      border-radius: 1px;
      display: block;
    }

    /* Breadcrumb */
    .topbar-breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .breadcrumb-home { color: var(--text-muted); font-weight: 500; }
    .breadcrumb-sep  { color: #d1d5db; }
    .breadcrumb-current { color: var(--text-primary); font-weight: 600; }

    /* Bell button */
    .topbar-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: white;
      cursor: pointer;
      color: var(--text-muted);
      transition: var(--transition-fast);
      flex-shrink: 0;
    }
    .topbar-icon-btn:hover { background: #f8fafc; color: var(--text-primary); }

    /* User pill */
    .topbar-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 4px;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: white;
      cursor: pointer;
      transition: var(--transition-fast);
    }
    .topbar-user:hover { background: #f8fafc; }

    .topbar-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--brand);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .topbar-username {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .topbar-chevron {
      color: var(--text-muted);
      display: flex;
    }

    /* Main content */
    .main-content { flex: 1; overflow-y: auto; transition: margin-left 0.3s ease; }

    /* Mobile backdrop */
    .mobile-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 299;
    }

    /* ── Mobile ── */
    @media (max-width: 767px) {
      .content-area.sidebar-expanded,
      .content-area.sidebar-collapsed {
        margin-left: 0 !important;
      }
      .topbar-hamburger { display: flex; }
      .topbar-username  { display: none; }
      .topbar-chevron   { display: none; }
      .topbar-center    { flex: 1; }
      .topbar-left      { flex: 0 0 auto; }
      .topbar-right     { flex: 0 0 auto; }
    }
  `]
})
export class AppShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  readonly bellIcon = Bell;
  readonly chevronDownIcon = ChevronDown;

  mobileOpen = signal(false);

  private navEnd$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map((e: NavigationEnd) => e.urlAfterRedirects)
  );

  constructor() {
    this.navEnd$.subscribe(() => {
      const main = document.querySelector('.main-content') as HTMLElement | null;
      if (main) main.scrollTop = 0;
    });
  }

  private currentUrl = toSignal(this.navEnd$, { initialValue: this.router.url });

  pageLabel = computed(() => {
    const url = this.currentUrl() ?? '';
    const segment = '/' + url.split('/')[1];
    return ROUTE_LABELS[segment] ?? '';
  });

  initials = computed(() =>
    this.auth.fullName().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  );
}
