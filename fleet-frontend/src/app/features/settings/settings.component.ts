import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService, ThemeDefinition } from '../../core/services/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService, AppLocale } from '../../core/services/language.service';
import { LucideAngularModule, Palette, User, KeyRound, Check, Globe } from 'lucide-angular';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LucideAngularModule, DatePipe],
  template: `
    <div class="page page-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Manage your preferences and account.</p>
        </div>
      </div>

      <!-- APPEARANCE -->
      <section class="settings-section">
        <div class="section-header">
          <lucide-icon [img]="paletteIcon" [size]="16" [strokeWidth]="1.8"></lucide-icon>
          <h2 class="section-title">Appearance</h2>
        </div>
        <div class="section-body">
          <p class="section-label">Theme</p>
          <div class="theme-grid">
            @for (t of themeService.themes; track t.key) {
              <button
                class="theme-card"
                [class.theme-card--active]="themeService.activeTheme() === t.key"
                (click)="themeService.setTheme(t.key)"
                [attr.aria-label]="'Apply ' + t.label + ' theme'"
                [attr.aria-pressed]="themeService.activeTheme() === t.key">
                <div class="theme-preview">
                  @for (color of t.preview; track $index) {
                    <span class="preview-dot" [style.background]="color"></span>
                  }
                </div>
                <span class="theme-name">{{ t.label }}</span>
                @if (themeService.activeTheme() === t.key) {
                  <div class="theme-check">
                    <lucide-icon [img]="checkIcon" [size]="11" [strokeWidth]="3"></lucide-icon>
                  </div>
                }
              </button>
            }
          </div>
        </div>
      </section>

      <!-- LANGUAGE -->
      <section class="settings-section">
        <div class="section-header">
          <lucide-icon [img]="globeIcon" [size]="16" [strokeWidth]="1.8"></lucide-icon>
          <h2 class="section-title">Language</h2>
        </div>
        <div class="section-body">
          <p class="section-label">Interface Language</p>
          <div class="theme-grid" style="grid-template-columns: repeat(2, 1fr); max-width: 300px;">
            @for (lang of langs; track lang.code) {
              <button
                class="theme-card"
                [class.theme-card--active]="langService.currentLocale() === lang.code"
                (click)="langService.switchTo(lang.code)"
                [attr.aria-pressed]="langService.currentLocale() === lang.code">
                <div class="theme-preview" style="font-size:26px; line-height:1">{{ lang.flag }}</div>
                <span class="theme-name">{{ lang.label }}</span>
                @if (langService.currentLocale() === lang.code) {
                  <div class="theme-check">
                    <lucide-icon [img]="checkIcon" [size]="11" [strokeWidth]="3"></lucide-icon>
                  </div>
                }
              </button>
            }
          </div>
        </div>
      </section>

      <!-- ACCOUNT -->
      <section class="settings-section">
        <div class="section-header">
          <lucide-icon [img]="userIcon" [size]="16" [strokeWidth]="1.8"></lucide-icon>
          <h2 class="section-title">Account</h2>
        </div>
        <div class="section-body">
          <div class="account-row">
            <div class="account-info">
              <div class="account-name">{{ auth.fullName() }}</div>
              <div class="account-meta">
                <span class="role-badge role-{{ auth.role()?.toLowerCase() }}">{{ auth.role() }}</span>
                @if (sessionExpiry()) {
                  <span class="session-expiry">Session expires {{ sessionExpiry() | date:'dd.MM.yyyy' }}</span>
                }
              </div>
            </div>
            <button class="btn btn-secondary" (click)="router.navigate(['/profile'])">
              <lucide-icon [img]="keyIcon" [size]="14" [strokeWidth]="2"></lucide-icon>
              Change Password
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings-section {
      background: var(--card-bg);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin: 0;
    }

    .section-body {
      padding: 20px;
    }

    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 14px;
    }

    /* Theme grid */
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .theme-card {
      position: relative;
      background: var(--card-bg);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 16px 14px 14px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit;
    }

    .theme-card:hover {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-subtle);
    }

    .theme-card--active {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-subtle);
    }

    .theme-preview {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .preview-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1.5px solid rgba(0,0,0,0.08);
      flex-shrink: 0;
    }

    .theme-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .theme-check {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--brand);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Account row */
    .account-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .account-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .account-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .role-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 9px;
      border-radius: 20px;
      text-transform: capitalize;
      letter-spacing: 0.4px;
    }
    .role-admin        { background: #ede9fe; color: #6d28d9; }
    .role-fleetmanager { background: #dbeafe; color: #1d4ed8; }
    .role-readonly     { background: var(--subtle-bg); color: var(--text-secondary); }

    .session-expiry {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Responsive */
    @media (max-width: 767px) {
      .theme-grid {
        grid-template-columns: 1fr 1fr;
      }
      .account-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class SettingsComponent {
  readonly themeService = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly langService = inject(LanguageService);

  readonly paletteIcon = Palette;
  readonly userIcon = User;
  readonly keyIcon = KeyRound;
  readonly checkIcon = Check;
  readonly globeIcon = Globe;

  readonly langs: { code: AppLocale; label: string; flag: string }[] = [
    { code: 'en', label: 'English',  flag: '🇬🇧' },
    { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  ];

  readonly sessionExpiry = computed(() => {
    const u = this.auth.user();
    return u?.expiresAt ? new Date(u.expiresAt) : null;
  });
}
