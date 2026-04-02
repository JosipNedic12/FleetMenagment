import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Download, FileText } from 'lucide-angular';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="export-dropdown" [class.open]="open">
      <button class="btn btn-outline" (click)="open = !open">
        <lucide-icon [img]="icons.Download" [size]="14" [strokeWidth]="2"></lucide-icon>
        Export
      </button>
      @if (open) {
        <div class="dropdown-menu" (click)="open = false">
          <button class="dropdown-item" (click)="exportAs.emit('xlsx')">
            <lucide-icon [img]="icons.Download" [size]="14" [strokeWidth]="2"></lucide-icon>
            Excel (.xlsx)
          </button>
          <button class="dropdown-item" (click)="exportAs.emit('pdf')">
            <lucide-icon [img]="icons.FileText" [size]="14" [strokeWidth]="2"></lucide-icon>
            PDF
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .export-dropdown { position: relative; display: inline-block; }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: var(--bg-primary, #fff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 50;
      min-width: 160px;
      overflow: hidden;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 14px;
      border: none;
      background: none;
      font-size: 13px;
      cursor: pointer;
      color: var(--text-primary, #374151);
    }
    .dropdown-item:hover { background: var(--bg-secondary, #f3f4f6); }
    .btn-outline {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 8px;
      background: var(--bg-primary, #fff);
      font-size: 13px;
      cursor: pointer;
      color: var(--text-primary, #374151);
    }
    .btn-outline:hover { background: var(--bg-secondary, #f3f4f6); }
  `]
})
export class ExportButtonComponent {
  @Output() exportAs = new EventEmitter<'xlsx' | 'pdf'>();
  open = false;
  readonly icons = { Download, FileText };
}
