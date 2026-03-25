import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Upload, File, FileText, Image, FileSpreadsheet, X } from 'lucide-angular';
import { DocumentApiService } from '../../../core/auth/feature-api.services';
import { Document } from '../../../core/models/models';

const CATEGORIES = ['policy', 'invoice', 'photo', 'certificate', 'report', 'receipt', 'claim', 'license', 'other'];
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="upload-wrapper">
      <div
        class="drop-zone"
        [class.drag-over]="isDragging()"
        (click)="fileInput.click()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave()"
        (drop)="onDrop($event)"
      >
        <lucide-icon [img]="icons.Upload" [size]="28" [strokeWidth]="1.5" class="drop-icon"></lucide-icon>
        @if (selectedFile()) {
          <div class="file-info">
            <lucide-icon [img]="getFileIcon(selectedFile()!.name)" [size]="14" [strokeWidth]="2"></lucide-icon>
            <span class="file-name">{{ selectedFile()!.name }}</span>
            <span class="file-size">({{ formatSize(selectedFile()!.size) }})</span>
            <button class="clear-btn" (click)="clearFile($event)">
              <lucide-icon [img]="icons.X" [size]="13" [strokeWidth]="2.5"></lucide-icon>
            </button>
          </div>
        } @else {
          <p class="drop-label" i18n="@@shared.fileUpload.dropLabel">Drag &amp; drop a file here, or browse</p>
          <p class="drop-hint" i18n="@@shared.fileUpload.dropHint">PDF, JPG, PNG, DOC, XLS — max 10 MB</p>
        }
      </div>

      @if (uploading()) {
        <div class="upload-progress-bar">
          <div class="fill"></div>
        </div>
      }

      <input
        #fileInput
        type="file"
        [accept]="accept"
        style="display:none"
        (change)="onFileSelected($event)"
      />

      @if (error()) {
        <div class="upload-error-row">
          <p class="upload-error">{{ error() }}</p>
          <button class="retry-btn" (click)="upload()" i18n="@@shared.fileUpload.retryBtn">Retry</button>
        </div>
      }

      <div class="upload-controls">
        <div class="upload-fields">
          <select class="ctrl-select" [(ngModel)]="selectedCategory">
            <option value="" i18n="@@shared.fileUpload.categoryPlaceholder">Category (optional)</option>
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
          <input class="ctrl-input" type="text" i18n-placeholder="@@shared.fileUpload.notesPlaceholder" placeholder="Notes (optional)" [(ngModel)]="notesValue" />
        </div>
        <button
          class="upload-btn"
          [disabled]="!selectedFile() || uploading()"
          (click)="upload()"
        >
          @if (uploading()) {
            <span class="spinner"></span> <ng-container i18n="@@shared.fileUpload.uploading">Uploading…</ng-container>
          } @else {
            <lucide-icon [img]="icons.Upload" [size]="14" [strokeWidth]="2"></lucide-icon>
            <ng-container i18n="@@shared.fileUpload.uploadBtn">Upload</ng-container>
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .upload-wrapper { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }

    .drop-zone {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 28px 20px;
      border: 2px dashed #cbd5e1; border-radius: 12px;
      background: var(--subtle-bg); cursor: pointer;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    }
    .drop-zone:hover { border-color: #94a3b8; }
    .drop-zone.drag-over { border-style: solid; border-color: var(--brand); background: rgba(37,99,235,0.04); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }

    .drop-icon { color: #94a3b8; transition: color 0.2s; }
    .drop-zone.drag-over .drop-icon { color: var(--brand); }

    .drop-label { margin: 0; font-size: 14px; color: var(--text-secondary); }
    .drop-link { color: var(--brand); font-weight: 600; }
    .drop-hint { margin: 0; font-size: 12px; color: var(--text-muted); }

    .file-info {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: var(--text-primary);
    }
    .file-name { font-weight: 500; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-size { color: var(--text-muted); }
    .clear-btn {
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      color: var(--text-muted); padding: 2px; line-height: 1;
    }
    .clear-btn:hover { color: #ef4444; }

    .upload-progress-bar {
      height: 4px; border-radius: 2px;
      background: var(--border); overflow: hidden;
    }
    .upload-progress-bar .fill {
      height: 100%; background: var(--brand); border-radius: 2px;
      animation: progressPulse 1.2s ease-in-out infinite;
    }
    @keyframes progressPulse {
      0%   { width: 15%; }
      50%  { width: 80%; }
      100% { width: 95%; }
    }

    .upload-error-row { display: flex; align-items: center; gap: 10px; }
    .upload-error { margin: 0; font-size: 13px; color: #dc2626; }

    .retry-btn {
      display: inline-flex; align-items: center;
      padding: 5px 12px; border-radius: 6px;
      border: 1.5px solid var(--brand); background: var(--card-bg); color: var(--brand);
      font-size: 12px; font-weight: 600; font-family: inherit;
      cursor: pointer; white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    .retry-btn:hover { background: var(--brand-subtle); }

    .upload-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .upload-fields { display: flex; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }

    .ctrl-select, .ctrl-input {
      flex: 1; min-width: 120px;
      padding: 7px 10px; font-size: 13px; font-family: inherit;
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      background: var(--input-bg); color: var(--text-primary);
      outline: none; transition: border-color 0.15s;
    }
    .ctrl-select:focus, .ctrl-input:focus { border-color: var(--brand); }

    .upload-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; border: none;
      background: var(--brand); color: white;
      font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer; white-space: nowrap;
      transition: opacity 0.15s;
    }
    .upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .upload-btn:not(:disabled):hover { opacity: 0.88; }

    .spinner {
      width: 13px; height: 13px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class FileUploadComponent {
  @Input() entityType = '';
  @Input() entityId = 0;
  @Output() uploaded = new EventEmitter<Document>();

  readonly icons = { Upload, File, FileText, Image, FileSpreadsheet, X };
  readonly categories = CATEGORIES;
  readonly accept = ACCEPT;

  isDragging = signal(false);
  selectedFile = signal<File | null>(null);
  uploading = signal(false);
  error = signal<string | null>(null);
  selectedCategory = '';
  notesValue = '';

  constructor(private docApi: DocumentApiService) {}

  getFileIcon(filename: string): any {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image;
    if (ext === 'pdf') return FileText;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    return File;
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.selectFile(file);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.selectFile(file);
    input.value = '';
  }

  clearFile(e: Event): void {
    e.stopPropagation();
    this.selectedFile.set(null);
    this.error.set(null);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.error.set(null);
    this.uploading.set(true);
    this.docApi.upload(
      this.entityType, this.entityId, file,
      this.selectedCategory || undefined,
      this.notesValue || undefined
    ).subscribe({
      next: doc => {
        this.uploading.set(false);
        this.selectedFile.set(null);
        this.selectedCategory = '';
        this.notesValue = '';
        this.uploaded.emit(doc);
      },
      error: () => {
        this.uploading.set(false);
        this.error.set($localize`:@@shared.fileUpload.uploadError:Upload failed. Please try again.`);
      }
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private selectFile(file: File): void {
    if (file.size > MAX_BYTES) {
      this.error.set($localize`:@@shared.fileUpload.fileTooLarge:File exceeds the 10 MB limit.`);
      return;
    }
    this.error.set(null);
    this.selectedFile.set(file);
  }
}
