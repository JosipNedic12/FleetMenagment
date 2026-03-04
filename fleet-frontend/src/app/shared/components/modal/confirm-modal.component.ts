import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (visible) {
      <div class="modal-overlay" (click)="onCancel()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-icon"><lucide-icon [img]="trash2" [size]="32" [strokeWidth]="1.5" color="#ef4444"></lucide-icon></div>
          <h3 class="modal-title">{{ title }}</h3>
          <p class="modal-message">{{ message }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
            <button class="btn btn-danger" (click)="onConfirm()">Delete</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-icon { display: flex; justify-content: center; margin-bottom: 12px; }
    .modal-message { font-size: 14px; color: #6b7280; margin: 0 0 24px; }
  `]
})
export class ConfirmModalComponent {
  readonly trash2 = Trash2;
  @Input() visible = false;
  @Input() title = 'Delete record';
  @Input() message = 'This action cannot be undone.';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void  { this.cancelled.emit(); }
}