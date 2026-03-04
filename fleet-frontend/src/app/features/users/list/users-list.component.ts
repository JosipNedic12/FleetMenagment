import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { EmployeeApiService, AuthApiService } from '../../../core/auth/feature-api.services';
import { Employee } from '../../../core/models/models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { LucideAngularModule, Eye } from 'lucide-angular';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, LucideAngularModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">User Management</h1>
          <p class="page-subtitle">{{ filtered().length }} employees · Admin only</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search name, email…" />
        </div>
      </div>

      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"      (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'active'"   (click)="filter.set('active')">Active</button>
        <button [class.active]="filter() === 'inactive'" (click)="filter.set('inactive')">Inactive</button>
      </div>

      <div class="table-card">
        @if (loading()) {
          <div class="table-loading">Loading…</div>
        } @else if (filtered().length === 0) {
          <div class="table-empty">No employees found.</div>
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Status</th>
                <th>Driver Profile</th>
                <th>App User</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.employeeId) {
                <tr>
                  <td><strong>{{ row.firstName }} {{ row.lastName }}</strong></td>
                  <td class="mono">{{ row.email }}</td>
                  <td>{{ row.department ?? '—' }}</td>
                  <td>
                    <app-badge
                      [label]="row.isActive ? 'Active' : 'Inactive'"
                      [variant]="row.isActive ? 'success' : 'danger'"
                    ></app-badge>
                  </td>
                  <td>
                    <app-badge
                      [label]="row.hasDriverProfile ? 'Yes' : 'No'"
                      [variant]="row.hasDriverProfile ? 'info' : 'neutral'"
                    ></app-badge>
                  </td>
                  <td>
                    <app-badge
                      [label]="row.hasAppUser ? 'Yes' : 'No'"
                      [variant]="row.hasAppUser ? 'success' : 'neutral'"
                    ></app-badge>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="action-btn" title="View details" (click)="openDetail(row)"><lucide-icon [img]="icons.Eye" [size]="15" [strokeWidth]="2"></lucide-icon></button>
                      @if (!row.hasAppUser) {
                        <button class="action-btn" title="Add app user" (click)="openAddUser(row)">＋</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- ── Add App User Modal ────────────────────────────── -->
      @if (addUserTarget) {
        <div class="modal-overlay" (click)="closeAddUser()">
          <div class="modal-box detail-modal" (click)="$event.stopPropagation()">
            <div class="detail-header">
              <div class="detail-avatar">{{ getInitials(addUserTarget) }}</div>
              <div>
                <h2 class="detail-name">Add App User</h2>
                <span class="detail-email">{{ addUserTarget.firstName }} {{ addUserTarget.lastName }}</span>
              </div>
              <button class="close-btn" (click)="closeAddUser()">&times;</button>
            </div>
            <div class="detail-body">
              <form (ngSubmit)="submitAddUser()">
                <div class="form-group">
                  <label>Username</label>
                  <input class="form-input" type="text" [(ngModel)]="newUser.username" name="username" required placeholder="e.g. jdoe" />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input class="form-input" type="email" [(ngModel)]="newUser.email" name="email" required placeholder="employee@company.com" />
                </div>
                <div class="form-group">
                  <label>Temporary Password</label>
                  <input class="form-input" type="text" [(ngModel)]="newUser.temporaryPassword" name="password" required placeholder="Temp password (will be hashed)" />
                </div>
                <div class="form-group">
                  <label>Role</label>
                  <select class="form-input" [(ngModel)]="newUser.role" name="role" required>
                    <option value="ReadOnly">ReadOnly</option>
                    <option value="FleetManager">FleetManager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                @if (addUserError()) {
                  <div class="error-msg">{{ addUserError() }}</div>
                }
                @if (addUserSuccess()) {
                  <div class="success-msg">User created. Share the credentials with the employee.</div>
                }
                <button
                  type="submit"
                  class="submit-btn"
                  [disabled]="addUserLoading() || !newUser.username || !newUser.email || !newUser.temporaryPassword"
                >
                  @if (addUserLoading()) { <span class="spinner"></span> Creating… } @else { Create App User }
                </button>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- ── Detail Modal ──────────────────────────────────── -->
      @if (detailEmployee) {
        <div class="modal-overlay" (click)="detailEmployee = null">
          <div class="modal-box detail-modal" (click)="$event.stopPropagation()">
            <div class="detail-header">
              <div class="detail-avatar">
                {{ getInitials(detailEmployee) }}
              </div>
              <div>
                <h2 class="detail-name">{{ detailEmployee.firstName }} {{ detailEmployee.lastName }}</h2>
                <span class="detail-email">{{ detailEmployee.email }}</span>
              </div>
              <button class="close-btn" (click)="detailEmployee = null">&times;</button>
            </div>
            <div class="detail-body">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Department</span>
                  <span class="detail-value">{{ detailEmployee.department ?? 'Not assigned' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Phone</span>
                  <span class="detail-value mono">{{ detailEmployee.phone ?? '—' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <app-badge
                    [label]="detailEmployee.isActive ? 'Active' : 'Inactive'"
                    [variant]="detailEmployee.isActive ? 'success' : 'danger'"
                  ></app-badge>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Driver Profile</span>
                  <app-badge
                    [label]="detailEmployee.hasDriverProfile ? 'Has Profile' : 'No Profile'"
                    [variant]="detailEmployee.hasDriverProfile ? 'info' : 'neutral'"
                  ></app-badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .row-actions { display: flex; gap: 6px; }
    .action-btn {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s;
    }
    .action-btn:hover { background: #f8fafc; border-color: var(--brand); }

    /* ── Detail Modal ──────────────────────────────────────── */
    .detail-modal {
      background: white;
      border-radius: 14px;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      animation: slideUp 0.2s ease;
      overflow: hidden;
    }
    @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .detail-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 24px 20px;
      border-bottom: 1px solid var(--border);
      position: relative;
    }
    .detail-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--brand), var(--brand-dark));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .detail-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 2px;
    }
    .detail-email {
      font-size: 13px;
      color: var(--text-muted);
      font-family: 'DM Mono', monospace;
    }
    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 24px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }
    .close-btn:hover { color: var(--text-primary); }
    .detail-body { padding: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label {
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
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-input:focus { border-color: var(--brand); }
    .error-msg {
      background: #fef2f2;
      color: #dc2626;
      border-radius: 7px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .success-msg {
      background: #f0fdf4;
      color: #16a34a;
      border-radius: 7px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .submit-btn {
      width: 100%;
      padding: 11px;
      background: var(--brand);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .submit-btn:hover:not(:disabled) { background: var(--brand-dark); }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .detail-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
    }
    .detail-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }
  `]
})
export class UsersListComponent implements OnInit {
  readonly icons = { Eye };
  auth = inject(AuthService);
  private employeeApi = inject(EmployeeApiService);
  private authApi = inject(AuthApiService);

  employees = signal<Employee[]>([]);
  loading = signal(true);
  search = signal('');
  filter = signal<'all' | 'active' | 'inactive'>('all');
  detailEmployee: Employee | null = null;

  addUserTarget: Employee | null = null;
  newUser = { username: '', email: '', temporaryPassword: '', role: 'ReadOnly' };
  addUserLoading = signal(false);
  addUserError = signal('');
  addUserSuccess = signal(false);

  filtered = computed(() => {
    let list = this.employees();
    const q = this.search().toLowerCase().trim();
    if (q) {
      list = list.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q)
      );
    }
    const f = this.filter();
    if (f === 'active') list = list.filter(e => e.isActive);
    if (f === 'inactive') list = list.filter(e => !e.isActive);
    return list;
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.employeeApi.getAll().subscribe({
      next: (data) => { this.employees.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  openDetail(employee: Employee): void { this.detailEmployee = employee; }

  openAddUser(employee: Employee): void {
    this.addUserTarget = employee;
    this.newUser = { username: '', email: employee.email, temporaryPassword: '', role: 'ReadOnly' };
    this.addUserError.set('');
    this.addUserSuccess.set(false);
  }

  closeAddUser(): void { this.addUserTarget = null; }

  submitAddUser(): void {
    if (!this.addUserTarget) return;
    this.addUserLoading.set(true);
    this.addUserError.set('');
    this.authApi.createAppUser({
      employeeId: this.addUserTarget.employeeId,
      username: this.newUser.username,
      email: this.newUser.email,
      temporaryPassword: this.newUser.temporaryPassword,
      role: this.newUser.role
    }).subscribe({
      next: () => {
        this.addUserLoading.set(false);
        this.addUserSuccess.set(true);
        // Mark employee as having an app user locally
        this.employees.update(list =>
          list.map(e => e.employeeId === this.addUserTarget!.employeeId ? { ...e, hasAppUser: true } : e)
        );
      },
      error: (err) => {
        this.addUserLoading.set(false);
        this.addUserError.set(err.status === 409 ? 'A user already exists for this employee.' : 'Failed to create user. Try again.');
      }
    });
  }

  getInitials(e: Employee): string {
    return `${e.firstName[0] ?? ''}${e.lastName[0] ?? ''}`.toUpperCase();
  }
}