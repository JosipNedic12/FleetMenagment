import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Trash2, TriangleAlert, X } from 'lucide-angular';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (visible) {
      <div class="modal-overlay" (click)="onCancel()">
        <div class="modal-box confirm-modal-box" (click)="$event.stopPropagation()">

          <button class="modal-close-btn" (click)="onCancel()" aria-label="Close">
            <lucide-icon [img]="xIcon" [size]="16" [strokeWidth]="2.5"></lucide-icon>
          </button>

          <div class="modal-icon">
            @if (type === 'destructive') {
              <lucide-icon [img]="trash2Icon" [size]="32" [strokeWidth]="1.5" color="#ef4444"></lucide-icon>
            } @else {
              <lucide-icon [img]="alertTriangleIcon" [size]="32" [strokeWidth]="1.5" color="#d97706"></lucide-icon>
            }
          </div>

          <h3 class="modal-title">{{ title }}</h3>
          <p class="modal-message">{{ message }}</p>

          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
            <button
              class="btn"
              [class.btn-danger]="type === 'destructive'"
              [class.btn-primary]="type !== 'destructive'"
              (click)="onConfirm()"
            >{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-modal-box {
      max-width: 400px;
      text-align: center;
      position: relative;
    }
    .modal-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 12px;
    }
    .modal-message {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px;
    }
    .modal-close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .modal-close-btn:hover {
      color: var(--text-secondary);
      background: var(--hover-bg);
    }
  `]
})
export class ConfirmModalComponent {
  readonly trash2Icon = Trash2;
  readonly alertTriangleIcon = TriangleAlert;
  readonly xIcon = X;

  @Input() visible = false;
  @Input() title = 'Delete record';
  @Input() message = 'This action cannot be undone.';
  @Input() type: 'destructive' | 'warning' = 'destructive';
  @Input() confirmLabel = 'Confirm';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.visible) this.onCancel();
  }

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void  { this.cancelled.emit(); }
}
