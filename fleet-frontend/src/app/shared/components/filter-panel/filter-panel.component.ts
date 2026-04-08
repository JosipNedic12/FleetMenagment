import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, SlidersHorizontal, X, RotateCcw } from 'lucide-angular';

export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Toggle button -->
    <button class="filter-toggle-btn" [class.has-filters]="activeFilterCount() > 0" (click)="panelOpen.set(!panelOpen())">
      <lucide-icon [img]="icons.SlidersHorizontal" [size]="15" [strokeWidth]="2"></lucide-icon>
      <ng-container i18n="@@filterPanel.toggleBtn">Filteri</ng-container>
      @if (activeFilterCount() > 0) {
        <span class="filter-count">{{ activeFilterCount() }}</span>
      }
    </button>

    <!-- Collapsible panel -->
    @if (panelOpen()) {
      <div class="filter-panel">
        <div class="filter-panel-header">
          <span class="filter-panel-title">
            <lucide-icon [img]="icons.SlidersHorizontal" [size]="14" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@filterPanel.filterBy">Filtriraj po</ng-container>
          </span>
          <button class="btn-icon-sm" (click)="panelOpen.set(false)" i18n-title="@@filterPanel.close" title="Zatvori">
            <lucide-icon [img]="icons.X" [size]="14" [strokeWidth]="2"></lucide-icon>
          </button>
        </div>

        <div class="filter-grid">
          @for (field of fields; track field.key) {
            <div class="filter-field">
              <label class="filter-label">{{ field.label }}</label>

              @if (field.type === 'select') {
                <select
                  class="filter-input"
                  [ngModel]="draft()[field.key] ?? ''"
                  (ngModelChange)="setDraft(field.key, $event)">
                  <option value="" i18n="@@filterPanel.optionAll">Sve</option>
                  @for (opt of field.options; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              }

              @if (field.type === 'text') {
                <input
                  type="text"
                  class="filter-input"
                  [placeholder]="field.placeholder ?? ''"
                  [ngModel]="draft()[field.key] ?? ''"
                  (ngModelChange)="setDraft(field.key, $event)"
                />
              }

              @if (field.type === 'date') {
                <input
                  type="date"
                  class="filter-input"
                  [ngModel]="draft()[field.key] ?? ''"
                  (ngModelChange)="setDraft(field.key, $event)"
                />
              }

              @if (field.type === 'number') {
                <input
                  type="number"
                  class="filter-input"
                  [placeholder]="field.placeholder ?? ''"
                  [ngModel]="draft()[field.key] ?? ''"
                  (ngModelChange)="setDraft(field.key, $event)"
                />
              }
            </div>
          }
        </div>

        <div class="filter-actions">
          <button class="btn btn-secondary btn-sm" (click)="onClear()">
            <lucide-icon [img]="icons.RotateCcw" [size]="13" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@filterPanel.clearAll">Očisti sve</ng-container>
          </button>
          <button class="btn btn-primary btn-sm" (click)="onApply()" i18n="@@filterPanel.applyFilters">
            Primijeni filtere
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .filter-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      background: var(--card-bg);
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition-fast);
    }
    .filter-toggle-btn:hover {
      border-color: var(--brand);
      color: var(--brand);
    }
    .filter-toggle-btn.has-filters {
      border-color: var(--brand);
      background: var(--brand-subtle);
      color: var(--brand);
    }
    .filter-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: var(--brand);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
    }

    .filter-panel {
      background: var(--card-bg);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      margin-top: 12px;
      overflow: hidden;
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .filter-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--subtle-bg);
    }
    .filter-panel-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .btn-icon-sm {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-muted);
      transition: var(--transition-fast);
    }
    .btn-icon-sm:hover {
      background: var(--hover-bg);
      color: var(--text-primary);
    }

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 14px;
      padding: 16px;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .filter-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .filter-input {
      height: 36px;
      padding: 0 12px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 13.5px;
      color: var(--text-primary);
      transition: var(--transition-fast);
      width: 100%;
    }
    .filter-input:focus {
      outline: none;
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-subtle);
    }
    select.filter-input {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      padding-right: 30px;
    }

    .filter-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      background: var(--subtle-bg);
    }
    .btn-sm {
      padding: 7px 14px;
      font-size: 13px;
    }
  `]
})
export class FilterPanelComponent {
  @Input() fields: FilterField[] = [];

  @Input() set appliedFilters(val: Record<string, any>) {
    this.draft.set({ ...val });
  }

  @Output() filtersApplied = new EventEmitter<Record<string, any>>();
  @Output() filtersCleared = new EventEmitter<void>();

  readonly icons = { SlidersHorizontal, X, RotateCcw };

  panelOpen = signal(false);
  draft = signal<Record<string, any>>({});

  activeFilterCount = computed(() => {
    return Object.values(this.draft()).filter(v => v !== '' && v !== null && v !== undefined).length;
  });

  setDraft(key: string, value: any): void {
    this.draft.update(d => ({ ...d, [key]: value }));
  }

  onApply(): void {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(this.draft())) {
      if (v !== '' && v !== null && v !== undefined) clean[k] = v;
    }
    this.filtersApplied.emit(clean);
    this.panelOpen.set(false);
  }

  onClear(): void {
    this.draft.set({});
    this.filtersCleared.emit();
    this.panelOpen.set(false);
  }
}
