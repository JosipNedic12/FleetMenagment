import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { LucideAngularModule, CheckCircle, XCircle, TriangleAlert, Info, X } from 'lucide-angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}">
          <lucide-icon
            [img]="iconMap[toast.type]"
            [size]="16"
            [strokeWidth]="2"
            class="toast-icon"
          ></lucide-icon>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">
            <lucide-icon [img]="xIcon" [size]="13" [strokeWidth]="2.5"></lucide-icon>
          </button>
          <div class="toast-progress"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      align-items: center;
      pointer-events: none;
    }

    .toast {
      pointer-events: all;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px 15px;
      border-radius: 10px;
      background: white;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
      min-width: 280px;
      max-width: 440px;
      position: relative;
      overflow: hidden;
      border: 1.5px solid transparent;
      animation: toastIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    .toast-success { border-color: #dcfce7; }
    .toast-success .toast-icon { color: #16a34a; }
    .toast-success .toast-progress { background: #16a34a; }
    .toast-success::before { background: #16a34a; }

    .toast-error { border-color: #fee2e2; }
    .toast-error .toast-icon { color: #dc2626; }
    .toast-error .toast-progress { background: #dc2626; }
    .toast-error::before { background: #dc2626; }

    .toast-warning { border-color: #fef9c3; }
    .toast-warning .toast-icon { color: #d97706; }
    .toast-warning .toast-progress { background: #d97706; }
    .toast-warning::before { background: #d97706; }

    .toast-info { border-color: #dbeafe; }
    .toast-info .toast-icon { color: #2563eb; }
    .toast-info .toast-progress { background: #2563eb; }
    .toast-info::before { background: #2563eb; }

    .toast::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }

    .toast-message {
      flex: 1;
      font-size: 13.5px;
      font-weight: 500;
      color: #1e293b;
      line-height: 1.4;
      padding-left: 4px;
    }

    .toast-close {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 2px;
      border-radius: 4px;
      flex-shrink: 0;
      transition: color 0.15s, background 0.15s;
    }
    .toast-close:hover { color: #475569; background: #f1f5f9; }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      animation: toastProgress 4s linear forwards;
      border-radius: 0 0 10px 10px;
    }

    @keyframes toastIn {
      from { opacity: 0; transform: translateY(32px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes toastProgress {
      from { width: 100%; }
      to   { width: 0%; }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  readonly xIcon = X;
  readonly iconMap: Record<string, any> = {
    success: CheckCircle,
    error:   XCircle,
    warning: TriangleAlert,
    info:    Info,
  };
}
