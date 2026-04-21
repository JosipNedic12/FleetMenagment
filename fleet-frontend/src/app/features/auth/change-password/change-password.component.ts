import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../core/auth/feature-api.services';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cp-page">
      <!-- Animated background blobs -->
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      <div class="bg-blob blob-3"></div>

      <div class="card">
        <!-- Logo -->
        <div class="logo">
          <img src="maxfleet-logo -black.png" alt="MaxFleet" class="logo-img" />
        </div>

        <div class="header-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1 class="title">Set your password</h1>
        <p class="subtitle">You must change your temporary password before continuing.</p>

        <form (ngSubmit)="onSubmit()">
          <!-- Current password -->
          <div class="form-group">
            <label for="cp-current">Current (temporary) password</label>
            <div class="input-wrapper" [class.focused]="currentFocused()" [class.error]="error()">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
              <input
                id="cp-current"
                [type]="showCurrent() ? 'text' : 'password'"
                name="current"
                [(ngModel)]="currentPassword"
                required
                placeholder="Enter temporary password"
                class="form-input"
                autocomplete="current-password"
                (focus)="currentFocused.set(true)"
                (blur)="currentFocused.set(false)"
              />
              <button
                type="button"
                class="toggle-pw"
                (click)="showCurrent.set(!showCurrent())"
                [attr.aria-label]="showCurrent() ? 'Hide password' : 'Show password'"
                tabindex="-1"
              >
                @if (showCurrent()) {
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

          <!-- New password -->
          <div class="form-group">
            <label for="cp-new">New password</label>
            <div class="input-wrapper" [class.focused]="newFocused()">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="cp-new"
                [type]="showNew() ? 'text' : 'password'"
                name="newPw"
                [(ngModel)]="newPassword"
                required
                minlength="8"
                placeholder="Min. 8 characters"
                class="form-input"
                autocomplete="new-password"
                (focus)="newFocused.set(true)"
                (blur)="newFocused.set(false)"
              />
              <button
                type="button"
                class="toggle-pw"
                (click)="showNew.set(!showNew())"
                [attr.aria-label]="showNew() ? 'Hide password' : 'Show password'"
                tabindex="-1"
              >
                @if (showNew()) {
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
            <!-- Password strength indicator -->
            @if (newPassword) {
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  [style.width]="strengthPercent + '%'"
                  [class.weak]="strengthPercent <= 33"
                  [class.medium]="strengthPercent > 33 && strengthPercent <= 66"
                  [class.strong]="strengthPercent > 66"
                ></div>
              </div>
              <span class="strength-label" [class.weak]="strengthPercent <= 33" [class.medium]="strengthPercent > 33 && strengthPercent <= 66" [class.strong]="strengthPercent > 66">
                {{ strengthLabel }}
              </span>
            }
          </div>

          <!-- Confirm password -->
          <div class="form-group">
            <label for="cp-confirm">Confirm new password</label>
            <div class="input-wrapper" [class.focused]="confirmFocused()" [class.error]="mismatch()">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <input
                id="cp-confirm"
                [type]="showConfirm() ? 'text' : 'password'"
                name="confirm"
                [(ngModel)]="confirmPassword"
                required
                placeholder="Repeat new password"
                class="form-input"
                autocomplete="new-password"
                (focus)="confirmFocused.set(true)"
                (blur)="confirmFocused.set(false)"
              />
              <button
                type="button"
                class="toggle-pw"
                (click)="showConfirm.set(!showConfirm())"
                [attr.aria-label]="showConfirm() ? 'Hide password' : 'Show password'"
                tabindex="-1"
              >
                @if (showConfirm()) {
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
            @if (mismatch()) {
              <span class="field-error">Passwords do not match.</span>
            }
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
            class="btn"
            [disabled]="loading() || !currentPassword || !newPassword || !confirmPassword"
          >
            @if (loading()) {
              <span class="spinner"></span>
              <span>Saving...</span>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Set new password</span>
            }
          </button>
        </form>

        <!-- Footer -->
        <p class="footer">
          MaxFleet &middot; Fleet Management System
        </p>
      </div>
    </div>
  `,
  styles: [`
    /* ─── Page ─────────────────────────────────────────────────────── */
    .cp-page {
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
    .card {
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
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .logo-img {
      height: 68px;
      width: auto;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }

    /* ─── Header icon ──────────────────────────────────────────────── */
    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      color: #2563eb;
      margin: 0 auto 16px;
    }

    /* ─── Typography ───────────────────────────────────────────────── */
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
      text-align: center;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 28px;
      text-align: center;
      line-height: 1.5;
    }

    /* ─── Form groups ──────────────────────────────────────────────── */
    .form-group {
      margin-bottom: 18px;
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

    /* ─── Password strength ────────────────────────────────────────── */
    .strength-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 4px;
      margin-top: 8px;
      overflow: hidden;
    }
    .strength-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease, background 0.3s ease;
    }
    .strength-fill.weak { background: #ef4444; }
    .strength-fill.medium { background: #f59e0b; }
    .strength-fill.strong { background: #22c55e; }
    .strength-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .strength-label.weak { color: #ef4444; }
    .strength-label.medium { color: #f59e0b; }
    .strength-label.strong { color: #22c55e; }

    /* ─── Field error ──────────────────────────────────────────────── */
    .field-error {
      font-size: 12px;
      color: #dc2626;
      margin-top: 6px;
      display: block;
      font-weight: 500;
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
      margin-bottom: 18px;
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
    .btn {
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
    .btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .btn:hover:not(:disabled)::before {
      opacity: 1;
    }
    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
    }
    .btn:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
    .btn:disabled {
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
    .footer {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      margin: 24px 0 0;
      letter-spacing: 0.02em;
    }

    /* ─── Responsive ───────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .card {
        padding: 32px 24px 28px;
        border-radius: 16px;
      }
      .logo-img {
        height: 50px;
      }
      .title {
        font-size: 20px;
      }
      .blob-1, .blob-2, .blob-3 {
        opacity: 0.1;
      }
    }

    /* ─── Reduced motion ───────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .bg-blob { animation: none; }
      .card { animation: none; }
      .error-msg { animation: none; }
      .btn { transition: none; }
      .btn::before { transition: none; }
      .strength-fill { transition: none; }
    }
  `]
})
export class ChangePasswordComponent {
  private authApi = inject(AuthApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal('');
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  currentFocused = signal(false);
  newFocused = signal(false);
  confirmFocused = signal(false);

  mismatch = () => !!this.confirmPassword && this.newPassword !== this.confirmPassword;

  get strengthPercent(): number {
    const pw = this.newPassword;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (pw.length >= 12) score += 10;
    if (/[A-Z]/.test(pw)) score += 20;
    if (/[a-z]/.test(pw)) score += 15;
    if (/[0-9]/.test(pw)) score += 15;
    if (/[^A-Za-z0-9]/.test(pw)) score += 15;
    return Math.min(100, score);
  }

  get strengthLabel(): string {
    const p = this.strengthPercent;
    if (p <= 33) return 'Weak';
    if (p <= 66) return 'Medium';
    return 'Strong';
  }

  onSubmit(): void {
    if (this.mismatch()) return;

    this.loading.set(true);
    this.error.set('');

    this.authApi.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword })
      .subscribe({
        next: () => {
          const user = this.authService.user();
          if (user) this.authService.setSession({ ...user, mustChangePassword: false });
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err.status === 400 ? 'Current password is incorrect.' : 'Failed to change password. Try again.'
          );
        }
      });
  }
}
