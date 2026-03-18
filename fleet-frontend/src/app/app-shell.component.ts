import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { GlobalSearchComponent } from './shared/components/global-search/global-search.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LucideAngularModule, Bell, ChevronDown, User, Lock, LogOut, Settings } from 'lucide-angular';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/services/theme.service';
import { inject } from '@angular/core';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationApiService } from './core/auth/feature-api.services';
import { Notification } from './core/models/notification.models';
import { DatePipe } from '@angular/common';

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
  '/settings':    'Settings',
};

const TYPE_COLOR: Record<string, string> = {
  info:    '#3b82f6',
  warning: '#f59e0b',
  danger:  '#ef4444',
  success: '#10b981',
};

const ENTITY_ROUTES: Record<string, string> = {
  vehicle:     '/vehicles',
  maintenance: '/maintenance',
  fuel:        '/fuel',
  assignment:  '/assignments',
  insurance:    '/insurance',
  registration: '/registration',
  inspection:   '/inspections',
  fine:        '/fines',
  accident:    '/accidents',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, GlobalSearchComponent, LucideAngularModule, ToastComponent, DatePipe],
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

            <!-- Bell with notifications dropdown -->
            <div class="topbar-notif-wrap">
              @if (notifOpen()) {
                <div class="notif-backdrop" (click)="notifOpen.set(false)"></div>
              }
              <button class="topbar-icon-btn notif-btn" (click)="toggleNotifications()" aria-label="Notifications" title="Notifications">
                <lucide-icon [img]="bellIcon" [size]="18" [strokeWidth]="1.8"></lucide-icon>
                @if (unreadCount() > 0) {
                  <span class="notif-badge">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
                }
              </button>
              @if (notifOpen()) {
                <div class="notif-dropdown">
                  <div class="notif-header">
                    <span class="notif-title">Notifications</span>
                    @if (unreadCount() > 0) {
                      <button class="notif-mark-all" (click)="markAllAsRead()">Mark all as read</button>
                    }
                  </div>
                  <div class="notif-list">
                    @if (notifications().length === 0) {
                      <div class="notif-empty">
                        <lucide-icon [img]="bellIcon" [size]="28" [strokeWidth]="1.4"></lucide-icon>
                        <span>No notifications</span>
                      </div>
                    } @else {
                      @for (n of notifications(); track n.notificationId) {
                        <div class="notif-item"
                          [class.notif-item--unread]="!n.isRead"
                          [style.--notif-color]="typeColor(n.type)"
                          (click)="onNotifClick(n)">
                          <div class="notif-item-accent"></div>
                          <div class="notif-item-body">
                            <div class="notif-item-title">{{ n.title }}</div>
                            <div class="notif-item-msg">{{ n.message }}</div>
                            <div class="notif-item-time">{{ relativeTime(n.createdAt) }}</div>
                          </div>
                          @if (!n.isRead) {
                            <div class="notif-item-dot"></div>
                          }
                        </div>
                      }
                    }
                  </div>
                </div>
              }
            </div>

            <!-- User pill with dropdown -->
            <div class="topbar-user-wrap">
              @if (userMenuOpen()) {
                <div class="user-menu-backdrop" (click)="userMenuOpen.set(false)"></div>
              }
              <div class="topbar-user" (click)="userMenuOpen.set(!userMenuOpen())" [class.menu-open]="userMenuOpen()">
                <div class="topbar-avatar" [title]="auth.fullName()">{{ initials() }}</div>
                <span class="topbar-username">{{ auth.fullName() }}</span>
                <lucide-icon [img]="chevronDownIcon" [size]="14" [strokeWidth]="2" class="topbar-chevron" [class.rotated]="userMenuOpen()"></lucide-icon>
              </div>
              @if (userMenuOpen()) {
                <div class="user-dropdown">
                  <button class="dropdown-item" (click)="navigateTo('/profile')">
                    <lucide-icon [img]="userIcon" [size]="15" [strokeWidth]="1.8"></lucide-icon>
                    My Profile
                  </button>
                  <button class="dropdown-item" (click)="navigateTo('/settings')">
                    <lucide-icon [img]="settingsIcon" [size]="15" [strokeWidth]="1.8"></lucide-icon>
                    Settings
                  </button>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item dropdown-item--danger" (click)="doLogout()">
                    <lucide-icon [img]="logOutIcon" [size]="15" [strokeWidth]="1.8"></lucide-icon>
                    Logout
                  </button>
                </div>
              }
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
      background: var(--topbar-bg);
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
    .topbar-hamburger:hover { background: var(--hover-bg); }
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
      background: var(--topbar-bg);
      cursor: pointer;
      color: var(--text-muted);
      transition: var(--transition-fast);
      flex-shrink: 0;
    }
    .topbar-icon-btn:hover { background: var(--hover-bg); color: var(--text-primary); }

    /* User pill */
    .topbar-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 4px;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: var(--topbar-bg);
      cursor: pointer;
      transition: var(--transition-fast);
    }
    .topbar-user:hover,
    .topbar-user.menu-open { background: var(--hover-bg); }

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
      transition: transform 0.2s ease;
    }
    .topbar-chevron.rotated { transform: rotate(180deg); }

    /* Main content */
    .main-content { flex: 1; overflow-y: auto; transition: margin-left 0.3s ease; }

    /* ── Notifications ── */
    .topbar-notif-wrap {
      position: relative;
    }

    .notif-btn {
      position: relative;
    }

    .notif-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      border: 2px solid white;
    }

    .notif-backdrop {
      position: fixed;
      inset: 0;
      z-index: 498;
    }

    .notif-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 360px;
      max-height: 440px;
      background: var(--card-bg);
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 499;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: dropdownIn 0.15s ease both;
    }

    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border, #e2e8f0);
      flex-shrink: 0;
    }

    .notif-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .notif-mark-all {
      font-size: 12px;
      font-weight: 500;
      color: #6366f1;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
      transition: opacity 0.15s;
    }
    .notif-mark-all:hover { opacity: 0.75; }

    .notif-list {
      overflow-y: auto;
      flex: 1;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }
    .notif-list::-webkit-scrollbar { width: 4px; }
    .notif-list::-webkit-scrollbar-track { background: transparent; }
    .notif-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 48px 24px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .notif-item {
      display: flex;
      align-items: stretch;
      gap: 0;
      cursor: pointer;
      transition: background 0.12s;
      border-bottom: 1px solid var(--border);
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: var(--hover-bg); }
    .notif-item--unread { background: var(--subtle-bg); }
    .notif-item--unread:hover { background: var(--hover-bg); }

    .notif-item-accent {
      width: 4px;
      background: var(--notif-color, #3b82f6);
      flex-shrink: 0;
      border-radius: 0;
    }

    .notif-item-body {
      flex: 1;
      padding: 12px 10px 12px 12px;
      min-width: 0;
    }

    .notif-item-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 3px;
    }

    .notif-item-msg {
      font-size: 12px;
      color: var(--text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
    }

    .notif-item-time {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 5px;
      opacity: 0.75;
    }

    .notif-item-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366f1;
      flex-shrink: 0;
      align-self: center;
      margin-right: 12px;
    }

    /* ── User dropdown ── */
    .topbar-user-wrap {
      position: relative;
    }

    .user-menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 499;
    }

    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      background: var(--card-bg);
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 500;
      padding: 4px;
      animation: dropdownIn 0.15s ease both;
    }

    @keyframes dropdownIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      background: none;
      border: none;
      border-radius: 7px;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      transition: background 0.12s;
    }
    .dropdown-item:hover { background: var(--hover-bg); }
    .dropdown-item--danger { color: #ef4444; }
    .dropdown-item--danger:hover { background: var(--row-danger-bg); }

    .dropdown-divider {
      height: 1px;
      background: var(--border, #e2e8f0);
      margin: 4px 0;
    }

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
      .notif-dropdown   { width: calc(100vw - 32px); right: -16px; }
    }
  `]
})
export class AppShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  // Injected to trigger initTheme() on startup via constructor
  readonly themeService = inject(ThemeService);
  private router = inject(Router);
  private notifApi = inject(NotificationApiService);

  readonly bellIcon = Bell;
  readonly chevronDownIcon = ChevronDown;
  readonly userIcon = User;
  readonly lockIcon = Lock;
  readonly logOutIcon = LogOut;
  readonly settingsIcon = Settings;

  mobileOpen   = signal(false);
  userMenuOpen = signal(false);
  notifOpen    = signal(false);
  notifications = signal<Notification[]>([]);
  unreadCount   = signal(0);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

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

  ngOnInit(): void {
    this.fetchUnreadCount();
    this.pollInterval = setInterval(() => this.fetchUnreadCount(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private fetchUnreadCount(): void {
    this.notifApi.getUnreadCount().subscribe({
      next: r => this.unreadCount.set(r.count),
      error: () => {}
    });
  }

  toggleNotifications(): void {
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening && this.notifications().length === 0) {
      this.notifApi.getAll().subscribe({
        next: list => this.notifications.set(list),
        error: () => {}
      });
    }
  }

  markAllAsRead(): void {
    this.notifApi.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      },
      error: () => {}
    });
  }

  onNotifClick(n: Notification): void {
    if (!n.isRead) {
      this.notifApi.markAsRead(n.notificationId).subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(x => x.notificationId === n.notificationId ? { ...x, isRead: true } : x)
          );
          this.unreadCount.update(c => Math.max(0, c - 1));
        },
        error: () => {}
      });
    }
    if (n.relatedEntityType && ENTITY_ROUTES[n.relatedEntityType]) {
      const route = n.relatedEntityId
        ? `${ENTITY_ROUTES[n.relatedEntityType]}/${n.relatedEntityId}`
        : ENTITY_ROUTES[n.relatedEntityType];
      this.router.navigate([route]);
    }
    this.notifOpen.set(false);
  }

  typeColor(type: string): string {
    return TYPE_COLOR[type] ?? '#3b82f6';
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  navigateTo(path: string): void {
    this.userMenuOpen.set(false);
    this.router.navigate([path]);
  }

  doLogout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout();
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
