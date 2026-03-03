import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge badge-{{ variant }}">{{ label }}</span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .badge-success  { background: #dcfce7; color: #15803d; }
    .badge-danger   { background: #fee2e2; color: #dc2626; }
    .badge-warning  { background: #fef9c3; color: #a16207; }
    .badge-info     { background: #dbeafe; color: #1d4ed8; }
    .badge-neutral  { background: #f1f5f9; color: #475569; }
  `]
})
export class BadgeComponent {
  @Input() label = '';
  @Input() variant: BadgeVariant = 'neutral';
} 