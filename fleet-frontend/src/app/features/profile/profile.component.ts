import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AuthApiService } from '../../core/auth/feature-api.services';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { LucideAngularModule, Lock, Check, X, Eye, EyeOff, ClipboardList } from 'lucide-angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, LucideAngularModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Profile</h1>
          <p class="page-subtitle">Manage your account and security settings</p>
        </div>
      </div>

      <div class="profile-grid">
        <!-- ── User Info Card ──────────────────────────────────── -->
        <div class="profile-card user-card">
          <div class="card-hero">
            <div class="avatar-large">{{ initials() }}</div>
            <div class="hero-info">
              <h2 class="user-fullname">{{ auth.fullName() }}</h2>
              <span class="user-username">{{'@'}}{{ user()?.username }}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Role</span>
                <span class="info-value">
                  <app-badge [label]="auth.role() ?? ''" [variant]="roleBadge()"></app-badge>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Session Expires</span>
                <span class="info-value">{{ expiresFormatted() }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Permissions</span>
                <span class="info-value permissions">
                  <span class="perm" [class.active]="true">Read</span>
                  <span class="perm" [class.active]="auth.canWrite()">Write</span>
                  <span class="perm" [class.active]="auth.canDelete()">Delete</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Change Password Card ────────────────────────────── -->
        <div class="profile-card password-card">
          <div class="card-header">
            <div class="card-icon"><lucide-icon [img]="icons.Lock" [size]="16" [strokeWidth]="2"></lucide-icon></div>
            <h3 class="card-title">Change Password</h3>
          </div>
          <div class="card-body">
            @if (pwSuccess()) {
              <div class="alert alert-success">
                <span class="alert-icon"><lucide-icon [img]="icons.Check" [size]="11" [strokeWidth]="3"></lucide-icon></span>
                Password updated successfully.
              </div>
            }
            @if (pwError()) {
              <div class="alert alert-error">
                <span class="alert-icon"><lucide-icon [img]="icons.X" [size]="11" [strokeWidth]="3"></lucide-icon></span>
                {{ pwError() }}
              </div>
            }
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <div class="input-wrapper">
                <input
                  [type]="showCurrentPw ? 'text' : 'password'"
                  class="form-input"
                  [(ngModel)]="pwForm.currentPassword"
                  placeholder="Enter current password"
                  autocomplete="current-password"
                />
                <button class="toggle-pw" (click)="showCurrentPw = !showCurrentPw" type="button">
                  <lucide-icon [img]="showCurrentPw ? icons.EyeOff : icons.Eye" [size]="16" [strokeWidth]="2"></lucide-icon>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <div class="input-wrapper">
                <input
                  [type]="showNewPw ? 'text' : 'password'"
                  class="form-input"
                  [(ngModel)]="pwForm.newPassword"
                  placeholder="Enter new password"
                  autocomplete="new-password"
                />
                <button class="toggle-pw" (click)="showNewPw = !showNewPw" type="button">
                  <lucide-icon [img]="showNewPw ? icons.EyeOff : icons.Eye" [size]="16" [strokeWidth]="2"></lucide-icon>
                </button>
              </div>
              @if (pwForm.newPassword.length > 0) {
                <div class="strength-bar">
                  <div class="strength-fill" [style.width.%]="passwordStrength()" [class]="strengthClass()"></div>
                </div>
                <span class="strength-label" [class]="strengthClass()">{{ strengthLabel() }}</span>
              }
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <input
                type="password"
                class="form-input"
                [(ngModel)]="pwForm.confirmPassword"
                placeholder="Re-enter new password"
                autocomplete="new-password"
              />
              @if (pwForm.confirmPassword.length > 0 && pwForm.newPassword !== pwForm.confirmPassword) {
                <span class="field-error">Passwords do not match</span>
              }
            </div>
            <button
              class="btn btn-primary"
              [disabled]="pwSaving() || !canSubmitPw()"
              (click)="changePassword()"
            >
              {{ pwSaving() ? 'Updating…' : 'Update Password' }}
            </button>
          </div>
        </div>

        <!-- ── Activity / Session Card ─────────────────────────── -->
        <div class="profile-card activity-card">
          <div class="card-header">
            <div class="card-icon"><lucide-icon [img]="icons.ClipboardList" [size]="16" [strokeWidth]="2"></lucide-icon></div>
            <h3 class="card-title">Recent Activity</h3>
          </div>
          <div class="card-body">
            <div class="timeline">
              <div class="timeline-item">
                <div class="timeline-dot dot-success"></div>
                <div class="timeline-content">
                  <span class="timeline-action">Logged in</span>
                  <span class="timeline-time">Current session</span>
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-dot dot-info"></div>
                <div class="timeline-content">
                  <span class="timeline-action">Session expires</span>
                  <span class="timeline-time">{{ expiresFormatted() }}</span>
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-dot dot-neutral"></div>
                <div class="timeline-content">
                  <span class="timeline-action">Token issued</span>
                  <span class="timeline-time">{{ tokenIssuedFormatted() }}</span>
                </div>
              </div>
            </div>

            <div class="session-info">
              <div class="session-row">
                <span class="session-key">Session Status</span>
                <app-badge
                  [label]="auth.isTokenExpired() ? 'Expired' : 'Active'"
                  [variant]="auth.isTokenExpired() ? 'danger' : 'success'"
                ></app-badge>
              </div>
              <div class="session-row">
                <span class="session-key">Time Remaining</span>
                <span class="session-val mono">{{ timeRemaining() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Grid Layout ─────────────────────────────────────── */
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .user-card { grid-column: 1 / -1; }

    /* ── Cards ────────────────────────────────────────────── */
    .profile-card {
      background: white;
      border-radius: 12px;
      border: 1.5px solid var(--border);
      overflow: hidden;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
    }
    .card-icon { font-size: 18px; }
    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .card-body { padding: 24px; }

    /* ── User Hero ────────────────────────────────────────── */
    .card-hero {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 28px 28px 0;
    }
    .avatar-large {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--brand), var(--brand-dark));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1px;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
    }
    .hero-info { display: flex; flex-direction: column; gap: 4px; }
    .user-fullname {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .user-username {
      font-size: 14px;
      color: var(--text-muted);
      font-family: 'DM Mono', monospace;
    }

    /* ── Info Grid ────────────────────────────────────────── */
    .info-grid {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .info-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
    }
    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }
    .permissions { display: flex; gap: 6px; }
    .perm {
      padding: 3px 10px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      background: #f1f5f9;
      color: #94a3b8;
    }
    .perm.active {
      background: #dcfce7;
      color: #15803d;
    }

    /* ── Password Form ────────────────────────────────────── */
    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      color: var(--text-primary);
      background: white;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-input:focus { border-color: var(--brand); }
    .toggle-pw {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: var(--text-muted);
      padding: 4px;
    }
    .strength-bar {
      height: 3px;
      background: #f1f5f9;
      border-radius: 3px;
      margin-top: 8px;
      overflow: hidden;
    }
    .strength-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease, background 0.3s ease;
    }
    .strength-fill.weak { background: #ef4444; }
    .strength-fill.fair { background: #f59e0b; }
    .strength-fill.strong { background: #22c55e; }
    .strength-label {
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
      display: inline-block;
    }
    .strength-label.weak { color: #ef4444; }
    .strength-label.fair { color: #f59e0b; }
    .strength-label.strong { color: #22c55e; }
    .field-error {
      font-size: 12px;
      color: #ef4444;
      margin-top: 4px;
      display: block;
    }

    /* ── Alerts ────────────────────────────────────────────── */
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 16px;
    }
    .alert-success { background: #dcfce7; color: #15803d; }
    .alert-error   { background: #fee2e2; color: #dc2626; }
    .alert-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .alert-success .alert-icon { background: #15803d; color: white; }
    .alert-error .alert-icon   { background: #dc2626; color: white; }

    /* ── Button ────────────────────────────────────────────── */
    .btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--brand); color: white; }
    .btn-primary:hover:not(:disabled) { background: var(--brand-dark); }

    /* ── Timeline ──────────────────────────────────────────── */
    .timeline { display: flex; flex-direction: column; gap: 0; margin-bottom: 20px; }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      position: relative;
    }
    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 6px;
      top: 26px;
      bottom: -4px;
      width: 2px;
      background: var(--border);
    }
    .timeline-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .dot-success { background: #22c55e; }
    .dot-info    { background: var(--brand); }
    .dot-neutral { background: #94a3b8; }
    .timeline-content { display: flex; flex-direction: column; gap: 2px; }
    .timeline-action {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .timeline-time {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── Session Info ──────────────────────────────────────── */
    .session-info {
      background: #f8fafc;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .session-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .session-key {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .session-val {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .mono { font-family: 'DM Mono', monospace; }

    /* ── Responsive ────────────────────────────────────────── */
    @media (max-width: 768px) {
      .profile-grid { grid-template-columns: 1fr; }
      .card-hero { flex-direction: column; text-align: center; }
      .info-grid { justify-content: center; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  readonly icons = { Lock, Check, X, Eye, EyeOff, ClipboardList };
  auth = inject(AuthService);
  private authApi = inject(AuthApiService);

  user = this.auth.user;

  pwForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  showCurrentPw = false;
  showNewPw = false;
  pwSaving = signal(false);
  pwSuccess = signal(false);
  pwError = signal('');

  initials = computed(() =>
    this.auth.fullName()
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  );

  roleBadge = computed(() => {
    const role = this.auth.role();
    if (role === 'Admin') return 'danger' as const;
    if (role === 'FleetManager') return 'info' as const;
    return 'neutral' as const;
  });

  expiresFormatted = computed(() => {
    const u = this.user();
    if (!u) return '—';
    return new Date(u.expiresAt).toLocaleString();
  });

  tokenIssuedFormatted = computed(() => {
    const u = this.user();
    if (!u) return '—';
    // Token is issued 8 hours before expiry
    const expires = new Date(u.expiresAt);
    const issued = new Date(expires.getTime() - 8 * 60 * 60 * 1000);
    return issued.toLocaleString();
  });

  timeRemaining = computed(() => {
    const u = this.user();
    if (!u) return '—';
    const diff = new Date(u.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  });

  passwordStrength = computed(() => {
    const pw = this.pwForm.newPassword;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score += 25;
    if (pw.length >= 10) score += 25;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pw)) score += 25;
    return score;
  });

  strengthClass = computed(() => {
    const s = this.passwordStrength();
    if (s <= 25) return 'weak';
    if (s <= 50) return 'fair';
    return 'strong';
  });

  strengthLabel = computed(() => {
    const s = this.passwordStrength();
    if (s <= 25) return 'Weak';
    if (s <= 50) return 'Fair';
    return 'Strong';
  });

  canSubmitPw = computed(() =>
    this.pwForm.currentPassword.length > 0 &&
    this.pwForm.newPassword.length >= 6 &&
    this.pwForm.newPassword === this.pwForm.confirmPassword
  );

  ngOnInit(): void {}

  changePassword(): void {
    this.pwError.set('');
    this.pwSuccess.set(false);
    this.pwSaving.set(true);

    this.authApi.changePassword({
      currentPassword: this.pwForm.currentPassword,
      newPassword: this.pwForm.newPassword
    }).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.pwSuccess.set(true);
        this.pwForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        setTimeout(() => this.pwSuccess.set(false), 4000);
      },
      error: (e) => {
        this.pwSaving.set(false);
        this.pwError.set(e.error?.message ?? e.error ?? 'Failed to change password.');
      }
    });
  }
}