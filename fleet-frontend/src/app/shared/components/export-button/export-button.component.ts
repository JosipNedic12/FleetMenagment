import { Component, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Download, FileSpreadsheet, FileText } from 'lucide-angular';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="export-wrapper">
      <button class="btn btn-secondary" (click)="open = !open">
        <lucide-icon [img]="icons.Download" [size]="15" [strokeWidth]="2"></lucide-icon>
        Export
      </button>
      @if (open) {
        <div class="export-menu">
          <button class="export-option" (click)="select('xlsx')">
            <lucide-icon [img]="icons.FileSpreadsheet" [size]="15" [strokeWidth]="2" class="icon-excel"></lucide-icon>
            <div class="export-option-text">
              <span class="export-option-label">Excel</span>
              <span class="export-option-hint">.xlsx spreadsheet</span>
            </div>
          </button>
          <button class="export-option" (click)="select('pdf')">
            <lucide-icon [img]="icons.FileText" [size]="15" [strokeWidth]="2" class="icon-pdf"></lucide-icon>
            <div class="export-option-text">
              <span class="export-option-label">PDF</span>
              <span class="export-option-hint">Printable report</span>
            </div>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .export-wrapper { position: relative; display: inline-block; }

    .export-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 200px;
      background: var(--card-bg);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      z-index: 100;
      overflow: hidden;
      animation: fadeSlideDown 0.15s ease;
    }

    @keyframes fadeSlideDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .export-option {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: none;
      cursor: pointer;
      font-family: 'DM Sans', system-ui, sans-serif;
      transition: var(--transition-fast);
    }
    .export-option:hover {
      background: var(--hover-bg);
    }
    .export-option + .export-option {
      border-top: 1px solid var(--border);
    }

    .icon-excel { color: #16a34a; }
    .icon-pdf   { color: #dc2626; }

    .export-option-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .export-option-label {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .export-option-hint {
      font-size: 11.5px;
      color: var(--text-muted);
    }
  `]
})
export class ExportButtonComponent {
  @Output() exportAs = new EventEmitter<'xlsx' | 'pdf'>();
  open = false;
  readonly icons = { Download, FileSpreadsheet, FileText };

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    if (this.open && !this.el.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  select(format: 'xlsx' | 'pdf'): void {
    this.exportAs.emit(format);
    this.open = false;
  }
}
