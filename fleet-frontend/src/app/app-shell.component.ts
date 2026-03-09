import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { GlobalSearchComponent } from './shared/components/global-search/global-search.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, GlobalSearchComponent],
  template: `
    <div class="app-shell">
      <app-sidebar #sidebar />
      <div class="content-area" [style.margin-left]="sidebar.collapsed() ? '64px' : '240px'">
        <header class="topbar">
          <app-global-search />
        </header>
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { min-height: 100vh; background: var(--page-bg); }
    .content-area { transition: margin-left 0.25s ease; min-height: 100vh; display: flex; flex-direction: column; }
    .topbar { height: 56px; background: #fff; border-bottom: 1px solid var(--border, #e2e8f0); display: flex; align-items: center; padding: 0 28px; position: sticky; top: 0; z-index: 200; }
    .main-content { flex: 1; overflow-y: auto; }
  `]
})
export class AppShellComponent {}