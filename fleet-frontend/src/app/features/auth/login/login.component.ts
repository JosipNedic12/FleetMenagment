import { Component, signal, inject } from '@angular/core';
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
      <div class="login-card">
        <!-- Logo -->
        <div class="login-logo">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="var(--brand)"/>
            <path d="M6 18L10 10L14 15L18 8L22 18H6Z" fill="white"/>
          </svg>
          <span>FleetMgr</span>
        </div>

        <h1 class="login-title">Welcome back</h1>
        <p class="login-subtitle">Sign in to your fleet dashboard</p>

        <form (ngSubmit)="onLogin()" #f="ngForm">
          <div class="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              [(ngModel)]="username"
              required
              placeholder="Enter username"
              class="form-input"
              [class.error]="error()"
            />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              placeholder="Enter password"
              class="form-input"
              [class.error]="error()"
            />
          </div>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }

          <button
            type="submit"
            class="login-btn"
            [disabled]="loading() || !username || !password"
          >
            @if (loading()) {
              <span class="spinner"></span> Signing in...
            } @else {
              Sign in
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: var(--page-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .login-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .login-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 6px;
    }
    .login-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0 0 28px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-primary);
      background: white;
      transition: border-color 0.15s;
      box-sizing: border-box;
      outline: none;
    }
    .form-input:focus { border-color: var(--brand); }
    .form-input.error { border-color: #ef4444; }
    .error-msg {
      background: #fef2f2;
      color: #dc2626;
      border-radius: 7px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .login-btn {
      width: 100%;
      padding: 12px;
      background: var(--brand);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .login-btn:hover:not(:disabled) { background: var(--brand-dark); }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

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
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err.status === 401 ? 'Invalid username or password.' : 'Login failed. Try again.'
          );
        }
      });
  }
}