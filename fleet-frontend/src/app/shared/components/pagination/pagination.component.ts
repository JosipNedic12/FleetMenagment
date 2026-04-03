import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="pagination-bar">
      <!-- Left: item range info -->
      <span class="pagination-info">
        Showing <strong>{{ startItem() }}</strong>–<strong>{{ endItem() }}</strong> of <strong>{{ totalCount }}</strong>
      </span>

      <!-- Center: page navigation -->
      <div class="pagination-nav">
        <button class="nav-btn" [disabled]="page <= 1" (click)="onPageChange(1)" title="First page">
          <lucide-icon [img]="icons.ChevronsLeft" [size]="15" [strokeWidth]="2"></lucide-icon>
        </button>
        <button class="nav-btn" [disabled]="page <= 1" (click)="onPageChange(page - 1)" title="Previous page">
          <lucide-icon [img]="icons.ChevronLeft" [size]="15" [strokeWidth]="2"></lucide-icon>
        </button>

        @for (p of visiblePages(); track p) {
          @if (p === -1) {
            <span class="page-ellipsis">…</span>
          } @else {
            <button class="nav-btn" [class.active]="p === page" (click)="onPageChange(p)">{{ p }}</button>
          }
        }

        <button class="nav-btn" [disabled]="page >= totalPages" (click)="onPageChange(page + 1)" title="Next page">
          <lucide-icon [img]="icons.ChevronRight" [size]="15" [strokeWidth]="2"></lucide-icon>
        </button>
        <button class="nav-btn" [disabled]="page >= totalPages" (click)="onPageChange(totalPages)" title="Last page">
          <lucide-icon [img]="icons.ChevronsRight" [size]="15" [strokeWidth]="2"></lucide-icon>
        </button>
      </div>

      <!-- Right: page size input (typeable) -->
      <div class="page-size-control">
        <label class="page-size-label">Rows</label>
        <input
          type="number"
          class="page-size-input"
          [ngModel]="pageSizeInput()"
          (ngModelChange)="pageSizeInput.set($event)"
          (blur)="applyPageSize()"
          (keydown.enter)="applyPageSize()"
          min="1"
          max="500"
        />
      </div>
    </div>
  `,
  styles: [`
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 13px;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 12px;
    }

    .pagination-info strong {
      color: var(--text-primary);
      font-weight: 600;
    }

    .pagination-nav {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .nav-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      border: 1.5px solid var(--border);
      background: var(--card-bg);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-fast);
    }
    .nav-btn:hover:not(:disabled):not(.active) {
      background: var(--hover-bg);
      border-color: var(--brand);
      color: var(--brand);
    }
    .nav-btn.active {
      background: var(--brand);
      color: #fff;
      border-color: var(--brand);
    }
    .nav-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .page-ellipsis {
      min-width: 28px;
      text-align: center;
      color: var(--text-muted);
      user-select: none;
    }

    .page-size-control {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .page-size-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .page-size-input {
      width: 64px;
      height: 32px;
      padding: 0 10px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      color: var(--text-primary);
      text-align: center;
      transition: var(--transition-fast);
      -moz-appearance: textfield;
    }
    .page-size-input::-webkit-inner-spin-button,
    .page-size-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .page-size-input:focus {
      outline: none;
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-subtle);
    }
  `]
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() totalCount = 0;
  @Input() totalPages = 0;
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  readonly icons = { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight };

  pageSizeInput = signal(10);

  ngOnChanges(): void {
    this.pageSizeInput.set(this.pageSize);
  }

  startItem = computed(() => this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1);
  endItem = computed(() => Math.min(this.page * this.pageSize, this.totalCount));

  visiblePages = computed(() => {
    const total = this.totalPages;
    const current = this.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);
    if (current <= 3) { start = 2; end = 4; }
    if (current >= total - 2) { start = total - 3; end = total - 1; }
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  });

  onPageChange(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.page) {
      this.pageChange.emit(p);
    }
  }

  applyPageSize(): void {
    const raw = this.pageSizeInput();
    let val = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
    if (!val || isNaN(val) || val < 1) val = 10;
    if (val > 500) val = 500;
    this.pageSizeInput.set(val);
    if (val !== this.pageSize) {
      this.pageSizeChange.emit(val);
    }
  }
}
