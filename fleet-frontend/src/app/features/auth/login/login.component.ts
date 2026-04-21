import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../core/auth/feature-api.services';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <!-- Animated background blobs -->
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      <div class="bg-blob blob-3"></div>

      <div class="login-card">
        <!-- Logo -->
        <div class="login-logo">
          <img src="maxfleet-logo -black.png" alt="MaxFleet" class="logo-img" />
        </div>

        <h1 class="login-title" i18n="@@login.title">Welcome back</h1>
        <p class="login-subtitle" i18n="@@login.subtitle">Sign in to your fleet management dashboard</p>

        <form (ngSubmit)="onLogin()" #f="ngForm">
          <!-- Username -->
          <div class="form-group">
            <label for="login-username" i18n="@@login.usernameLabel">Username</label>
            <div class="input-wrapper" [class.focused]="usernameFocused()" [class.error]="error()">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                id="login-username"
                type="text"
                name="username"
                [(ngModel)]="username"
                required
                placeholder="Enter your username" i18n-placeholder="@@login.usernamePlaceholder"
                class="form-input"
                autocomplete="username"
                (focus)="usernameFocused.set(true)"
                (blur)="usernameFocused.set(false)"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="form-group">
            <label for="login-password" i18n="@@login.passwordLabel">Password</label>
            <div class="input-wrapper" [class.focused]="passwordFocused()" [class.error]="error()">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'"
                name="password"
                [(ngModel)]="password"
                required
                placeholder="Enter your password" i18n-placeholder="@@login.passwordPlaceholder"
                class="form-input"
                autocomplete="current-password"
                (focus)="passwordFocused.set(true)"
                (blur)="passwordFocused.set(false)"
              />
              <button
                type="button"
                class="toggle-pw"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? showPasswordLabel : hidePasswordLabel"
                tabindex="-1"
              >
                @if (showPassword()) {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                }
              </button>
            </div>
          </div>

          <!-- Error message -->
          @if (error()) {
            <div class="error-msg" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ error() }}</span>
            </div>
          }

          <!-- Submit button -->
          <button
            type="submit"
            class="login-btn"
            [disabled]="loading() || !username || !password"
          >
            @if (loading()) {
              <span class="spinner"></span>
              <span i18n="@@login.signingIn">Signing in...</span>
            } @else {
              <span i18n="@@login.signIn">Sign in</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            }
          </button>
        </form>

        <!-- Footer -->
        <p class="login-footer">
          <ng-container i18n="@@login.footer">MaxFleet &middot; Fleet Management System</ng-container>
        </p>
      </div>
    </div>
  `,
  styles: [`
    /* ─── Page ─────────────────────────────────────────────────────── */
    .login-page {
      min-height: 100vh;
      min-height: 100dvh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    /* ─── Animated background blobs ───────────────────────────────── */
    .bg-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
      animation: blobFloat 20s ease-in-out infinite;
      pointer-events: none;
    }
    .blob-1 {
      width: 500px; height: 500px;
      background: #2563eb;
      top: -100px; left: -100px;
      animation-delay: 0s;
    }
    .blob-2 {
      width: 400px; height: 400px;
      background: #3b82f6;
      bottom: -80px; right: -80px;
      animation-delay: -7s;
      animation-duration: 25s;
    }
    .blob-3 {
      width: 300px; height: 300px;
      background: #60a5fa;
      top: 50%; left: 60%;
      animation-delay: -14s;
      animation-duration: 22s;
    }
    @keyframes blobFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%      { transform: translate(40px, -30px) scale(1.05); }
      66%      { transform: translate(-20px, 20px) scale(0.95); }
    }

    /* ─── Card ─────────────────────────────────────────────────────── */
    .login-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 44px 40px 36px;
      width: 100%;
      max-width: 420px;
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      position: relative;
      z-index: 1;
      animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @keyframes cardEnter {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* ─── Logo ─────────────────────────────────────────────────────── */
    .login-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
    }
    .logo-img {
      height: 80px;
      width: auto;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }

    /* ─── Typography ───────────────────────────────────────────────── */
    .login-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
      text-align: center;
      letter-spacing: -0.02em;
    }
    .login-subtitle {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 32px;
      text-align: center;
      line-height: 1.5;
    }

    /* ─── Form groups ──────────────────────────────────────────────── */
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 7px;
      letter-spacing: 0.01em;
    }

    /* ─── Input wrapper ────────────────────────────────────────────── */
    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 0;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      transition: border-color 0.2s ease, background 0.2s ease;
      overflow: hidden;
      isolation: isolate;
      box-shadow: none !important;
    }
    .input-wrapper.focused {
      border-color: #2563eb;
      background: white;
    }
    .input-wrapper.error:not(.focused) {
      border-color: #ef4444;
    }
    .input-icon {
      flex-shrink: 0;
      margin-left: 14px;
      color: #94a3b8;
      transition: color 0.2s ease;
    }
    .input-wrapper.focused .input-icon {
      color: #2563eb;
    }
    .form-input {
      flex: 1;
      padding: 12px 14px 12px 10px;
      border: none;
      font-size: 14px;
      color: #0f172a;
      background: transparent;
      outline: none;
      box-shadow: none;
      min-width: 0;
      line-height: 1.5;
    }
    .form-input::placeholder {
      color: #94a3b8;
    }

    /* ─── Password toggle ──────────────────────────────────────────── */
    .toggle-pw {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      border-radius: 8px;
      transition: color 0.15s ease, background 0.15s ease;
      margin-right: 4px;
    }
    .toggle-pw:hover {
      color: #374151;
      background: rgba(0, 0, 0, 0.04);
    }

    /* ─── Error message ────────────────────────────────────────────── */
    .error-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 11px 14px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 20px;
      animation: shakeIn 0.35s ease;
    }
    .error-msg svg {
      flex-shrink: 0;
    }
    @keyframes shakeIn {
      0%   { transform: translateX(0); opacity: 0; }
      20%  { transform: translateX(-6px); opacity: 1; }
      40%  { transform: translateX(5px); }
      60%  { transform: translateX(-3px); }
      80%  { transform: translateX(2px); }
      100% { transform: translateX(0); }
    }

    /* ─── Submit button ────────────────────────────────────────────── */
    .login-btn {
      width: 100%;
      padding: 13px 20px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      letter-spacing: 0.01em;
      position: relative;
      overflow: hidden;
    }
    .login-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .login-btn:hover:not(:disabled)::before {
      opacity: 1;
    }
    .login-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
    }
    .login-btn:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
    .login-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* ─── Spinner ──────────────────────────────────────────────────── */
    .spinner {
      width: 18px; height: 18px;
      border: 2.5px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Footer ───────────────────────────────────────────────────── */
    .login-footer {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      margin: 28px 0 0;
      letter-spacing: 0.02em;
    }

    /* ─── Responsive ───────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .login-card {
        padding: 32px 24px 28px;
        border-radius: 16px;
      }
      .logo-img {
        height: 60px;
      }
      .login-title {
        font-size: 22px;
      }
      .blob-1, .blob-2, .blob-3 {
        opacity: 0.1;
      }
    }

    /* ─── Reduced motion ───────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .bg-blob { animation: none; }
      .login-card { animation: none; }
      .error-msg { animation: none; }
      .login-btn { transition: none; }
      .login-btn::before { transition: none; }
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  usernameFocused = signal(false);
  passwordFocused = signal(false);
  showPasswordLabel = $localize`:@@login.showPasswordAriaLabel:Show password`;
  hidePasswordLabel = $localize`:@@login.hidePasswordAriaLabel:Hide password`;

  constructor(
    private authApi: AuthApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    this.loading.set(true);
    this.error.set('');

    this.authApi.login({ username: this.username, password: this.password })
      .subscribe({
        next: (res) => {
          this.authService.setSession(res);
          this.router.navigate([res.mustChangePassword ? '/change-password' : '/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err.status === 401
              ? $localize`:@@login.errorInvalidCredentials:Invalid username or password.`
              : $localize`:@@login.errorGeneric:Login failed. Please try again.`
          );
        }
      });
  }
}
