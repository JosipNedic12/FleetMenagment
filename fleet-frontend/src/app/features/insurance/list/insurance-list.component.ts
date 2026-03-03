import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsurancePolicyApiService, VehicleApiService } from '../../../core/auth/feature-api.services';
import { InsurancePolicy, CreateInsurancePolicyDto, Vehicle } from '../../../core/models/models';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-insurance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, ConfirmModalComponent, HasRoleDirective],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Insurance Policies</h1>
          <p class="page-subtitle">{{ filtered().length }} records</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search vehicle, insurer, policy#…" />
          <button *hasRole="['Admin','FleetManager']" class="btn btn-primary" (click)="showForm = true">
            + New Policy
          </button>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs">
        <button [class.active]="filter() === 'all'"    (click)="filter.set('all')">All</button>
        <button [class.active]="filter() === 'active'" (click)="filter.set('active')">Active</button>
        <button [class.active]="filter() === 'expired'"(click)="filter.set('expired')">Expired</button>
      </div>

      <!-- Table -->
      <div class="table-card">
        @if (loading()) {
          <div class="table-loading">Loading…</div>
        } @else if (filtered().length === 0) {
          <div class="table-empty">No records found.</div>
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Policy #</th>
                <th>Insurer</th>
                <th>Valid From</th>
                <th>Valid To</th>
                <th>Premium</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.policyId) {
                <tr>
                  <td><strong>{{ row.registrationNumber }}</strong></td>
                  <td class="mono">{{ row.policyNumber }}</td>
                  <td>{{ row.insurer }}</td>
                  <td>{{ row.validFrom | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.validTo | date:'dd.MM.yyyy' }}</td>
                  <td>{{ row.premium | currency:'EUR':'symbol':'1.2-2' }}</td>
                  <td>
                    <app-badge
                      [label]="row.isActive ? 'Active' : 'Expired'"
                      [variant]="row.isActive ? 'success' : 'danger'"
                    />
                  </td>
                  <td class="actions">
                    <button *hasRole="['Admin','FleetManager']" class="btn-icon" title="Edit" (click)="startEdit(row)">✏️</button>
                    <button *hasRole="'Admin'" class="btn-icon danger" title="Delete" (click)="confirmDelete(row)">🗑</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- Create / Edit Form Modal -->
    @if (showForm) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h2 class="modal-title">{{ editId ? 'Edit Policy' : 'New Insurance Policy' }}</h2>

          <div class="form-grid">
            <div class="form-group">
              <label>Vehicle *</label>
              <select [(ngModel)]="form.vehicleId" [disabled]="!!editId">
                <option [ngValue]="0">Select vehicle…</option>
                @for (v of vehicles(); track v.vehicleId) {
                  <option [ngValue]="v.vehicleId">{{ v.registrationNumber }} — {{ v.make }} {{ v.model }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Policy Number *</label>
              <input [(ngModel)]="form.policyNumber" placeholder="POL-2025-001" />
            </div>
            <div class="form-group">
              <label>Insurer *</label>
              <input [(ngModel)]="form.insurer" placeholder="Croatia osiguranje" />
            </div>
            <div class="form-group">
              <label>Premium (EUR) *</label>
              <input type="number" [(ngModel)]="form.premium" min="0" />
            </div>
            <div class="form-group">
              <label>Valid From *</label>
              <input type="date" [(ngModel)]="form.validFrom" />
            </div>
            <div class="form-group">
              <label>Valid To *</label>
              <input type="date" [(ngModel)]="form.validTo" />
            </div>
            <div class="form-group span-2">
              <label>Coverage Notes</label>
              <textarea [(ngModel)]="form.coverageNotes" rows="2" placeholder="AO + kasko…"></textarea>
            </div>
          </div>

          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }

          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : editId ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirmation -->
    <app-confirm-modal
      [visible]="!!deleteTarget"
      title="Delete Insurance Policy"
      [message]="'Delete policy ' + (deleteTarget?.policyNumber ?? '') + '? This cannot be undone.'"
      (confirmed)="doDelete()"
      (cancelled)="deleteTarget = null"
    />
  `,
  styles: []
})
export class InsuranceListComponent implements OnInit {
  private api = inject(InsurancePolicyApiService);
  private vehicleApi = inject(VehicleApiService);
  auth = inject(AuthService);

  policies = signal<InsurancePolicy[]>([]);
  vehicles = signal<Vehicle[]>([]);
  loading  = signal(true);
  saving   = signal(false);
  formError = signal('');

  search   = signal('');
  showForm = false;
  editId: number | null = null;
  deleteTarget: InsurancePolicy | null = null;

  filter = signal<'all' | 'active' | 'expired'>('all');

  form: CreateInsurancePolicyDto = this.emptyForm();

  filtered = computed(() => {
    let list = this.policies();
    if (this.filter() === 'active')  list = list.filter(p => p.isActive);
    if (this.filter() === 'expired') list = list.filter(p => !p.isActive);
    const q = this.search().toLowerCase();
    if (q) list = list.filter(p =>
      p.registrationNumber.toLowerCase().includes(q) ||
      p.insurer.toLowerCase().includes(q) ||
      p.policyNumber.toLowerCase().includes(q)
    );
    return list;
  });

  ngOnInit(): void {
    this.load();
    this.vehicleApi.getAll().subscribe(v => this.vehicles.set(v));
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: data => { this.policies.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  startEdit(row: InsurancePolicy): void {
    this.editId = row.policyId;
    this.form = {
      vehicleId:     row.vehicleId,
      policyNumber:  row.policyNumber,
      insurer:       row.insurer,
      validFrom:     row.validFrom.slice(0, 10),
      validTo:       row.validTo.slice(0, 10),
      premium:       row.premium,
      coverageNotes: row.coverageNotes
    };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.vehicleId || !this.form.policyNumber || !this.form.insurer || !this.form.validFrom || !this.form.validTo) {
      this.formError.set('Please fill all required fields.'); return;
    }
    this.saving.set(true);
    this.formError.set('');

    const obs = this.editId
      ? this.api.update(this.editId, this.form)
      : this.api.create(this.form);

    obs.subscribe({
      next: () => { this.load(); this.closeForm(); this.saving.set(false); },
      error: (e) => { this.saving.set(false); this.formError.set(e.error?.message ?? 'Save failed.'); }
    });
  }

  confirmDelete(row: InsurancePolicy): void { this.deleteTarget = row; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.api.deleteById(this.deleteTarget.policyId).subscribe({
      next: () => { this.load(); this.deleteTarget = null; },
      error: ()  => { this.deleteTarget = null; }
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.editId = null;
    this.form = this.emptyForm();
    this.formError.set('');
  }

  private emptyForm(): CreateInsurancePolicyDto {
    return { vehicleId: 0, policyNumber: '', insurer: '', validFrom: '', validTo: '', premium: 0 };
  }
}