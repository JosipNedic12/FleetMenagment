import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pagination-bar">
      <div class="pagination-info">
        {{ startItem() }}–{{ endItem() }} of {{ totalCount }} items
      </div>

      <div class="pagination-controls">
        <button class="page-btn" [disabled]="page <= 1" (click)="onPageChange(1)" title="First">«</button>
        <button class="page-btn" [disabled]="page <= 1" (click)="onPageChange(page - 1)" title="Previous">‹</button>

        @for (p of visiblePages(); track p) {
          <button class="page-btn" [class.active]="p === page" (click)="onPageChange(p)">{{ p }}</button>
        }

        <button class="page-btn" [disabled]="page >= totalPages" (click)="onPageChange(page + 1)" title="Next">›</button>
        <button class="page-btn" [disabled]="page >= totalPages" (click)="onPageChange(totalPages)" title="Last">»</button>
      </div>

      <div class="page-size-select">
        <label>Show</label>
        <select [ngModel]="pageSize" (ngModelChange)="onPageSizeChange($event)">
          <option [value]="10">10</option>
          <option [value]="25">25</option>
          <option [value]="50">50</option>
          <option [value]="100">100</option>
        </select>
        <label>per page</label>
      </div>
    </div>
  `,
  styles: [`
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color, #e5e7eb);
      font-size: 13px;
      color: var(--text-secondary, #6b7280);
      flex-wrap: wrap;
      gap: 8px;
    }
    .pagination-controls {
      display: flex;
      gap: 2px;
    }
    .page-btn {
      min-width: 32px;
      height: 32px;
      border: 1px solid var(--border-color, #e5e7eb);
      background: var(--bg-primary, #fff);
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-primary, #374151);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page-btn:hover:not(:disabled) {
      background: var(--bg-secondary, #f3f4f6);
    }
    .page-btn.active {
      background: var(--accent-color, #3b82f6);
      color: #fff;
      border-color: var(--accent-color, #3b82f6);
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-size-select {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .page-size-select select {
      padding: 4px 8px;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 6px;
      font-size: 13px;
      background: var(--bg-primary, #fff);
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

  startItem = computed(() => this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1);
  endItem = computed(() => Math.min(this.page * this.pageSize, this.totalCount));

  visiblePages = computed(() => {
    const total = this.totalPages;
    const current = this.page;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, current - 1);
      let end = Math.min(total - 1, current + 1);

      if (current <= 3) { start = 2; end = 5; }
      if (current >= total - 2) { start = total - 4; end = total - 1; }

      for (let i = start; i <= end; i++) pages.push(i);
      pages.push(total);
    }

    return [...new Set(pages)].sort((a, b) => a - b);
  });

  onPageChange(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.page) {
      this.pageChange.emit(p);
    }
  }

  onPageSizeChange(size: string | number): void {
    this.pageSizeChange.emit(Number(size));
  }
}
