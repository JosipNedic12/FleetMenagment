import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, File, FileText, Image, Download, Trash2 } from 'lucide-angular';
import { BadgeComponent } from '../badge/badge.component';
import { ConfirmModalComponent } from '../modal/confirm-modal.component';
import { DocumentApiService } from '../../../core/auth/feature-api.services';
import { Document } from '../../../core/models/models';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, BadgeComponent, ConfirmModalComponent],
  template: `
    <app-confirm-modal
      [visible]="showConfirm()"
      [title]="deleteDocTitle"
      [message]="deleteDocMessage"
      (confirmed)="confirmDelete()"
      (cancelled)="showConfirm.set(false)"
    />

    @if (loading()) {
      <div class="table-loading" i18n="@@shared.documentList.loading">Loading documents…</div>
    } @else if (documents().length === 0) {
      <div class="table-empty" i18n="@@shared.documentList.empty">No documents attached.</div>
    } @else {
      <table class="table">
        <thead>
          <tr>
            <th i18n="@@shared.documentList.colFileName">File Name</th>
            <th i18n="@@shared.documentList.colCategory">Category</th>
            <th i18n="@@shared.documentList.colSize">Size</th>
            <th i18n="@@shared.documentList.colUploaded">Uploaded</th>
            <th class="col-actions" i18n="@@shared.documentList.colActions">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (doc of documents(); track doc.documentId) {
            <tr>
              <td>
                <div class="file-cell">
                  <lucide-icon [img]="fileIcon(doc.contentType)" [size]="14" [strokeWidth]="2" class="file-icon"></lucide-icon>
                  <span class="file-name" [title]="doc.fileName">{{ doc.fileName }}</span>
                </div>
              </td>
              <td>
                @if (doc.category) {
                  <app-badge [label]="doc.category" variant="info" />
                } @else {
                  <span class="muted">—</span>
                }
              </td>
              <td class="muted">{{ formatSize(doc.fileSize) }}</td>
              <td class="muted">{{ doc.uploadedAt | date:'dd.MM.yyyy' }}</td>
              <td class="col-actions">
                <div class="action-btns">
                  <button class="action-btn" [title]="downloadTitle" (click)="download(doc.documentId)">
                    <lucide-icon [img]="icons.Download" [size]="14" [strokeWidth]="2"></lucide-icon>
                  </button>
                  <button class="action-btn danger" [title]="deleteTitle" (click)="promptDelete(doc.documentId)">
                    <lucide-icon [img]="icons.Trash2" [size]="14" [strokeWidth]="2"></lucide-icon>
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .file-cell { display: flex; align-items: center; gap: 7px; }
    .file-icon { color: var(--text-muted); flex-shrink: 0; }
    .file-name {
      font-size: 13px; color: var(--text-primary);
      max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .muted { color: var(--text-muted); font-size: 13px; }

    .col-actions {
      position: sticky;
      right: -1px;
      background: var(--card-bg);
      white-space: nowrap;
      z-index: 1;
    }
    tr:hover .col-actions { background: var(--hover-bg); }
    thead .col-actions {
      background: var(--page-bg);
      z-index: 2;
    }
    tbody .col-actions::before {
      content: '';
      position: absolute;
      left: -16px; top: 0; bottom: 0; width: 16px;
      background: linear-gradient(to right, transparent, var(--card-bg));
      pointer-events: none;
    }
    tr:hover .col-actions::before { background: linear-gradient(to right, transparent, var(--hover-bg)); }

    .action-btns { display: flex; gap: 6px; }
    .action-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 6px;
      border: 1.5px solid var(--border); background: var(--card-bg);
      color: var(--text-secondary); cursor: pointer;
      transition: all 0.15s;
    }
    .action-btn:hover { border-color: #cbd5e1; color: var(--text-primary); }
    .action-btn.danger:hover { border-color: #fca5a5; color: #dc2626; background: #fff5f5; }
  `]
})
export class DocumentListComponent implements OnInit {
  @Input() entityType = '';
  @Input() entityId = 0;

  readonly icons = { File, FileText, Image, Download, Trash2 };

  readonly deleteDocTitle   = $localize`:@@shared.documentList.confirmDeleteTitle:Delete document`;
  readonly deleteDocMessage = $localize`:@@shared.documentList.confirmDeleteMessage:This will permanently remove the file. This action cannot be undone.`;
  readonly downloadTitle    = $localize`:@@shared.documentList.downloadTitle:Download`;
  readonly deleteTitle      = $localize`:@@shared.documentList.deleteTitle:Delete`;

  documents = signal<Document[]>([]);
  loading = signal(true);
  showConfirm = signal(false);
  private deleteTargetId = 0;

  constructor(private docApi: DocumentApiService) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading.set(true);
    this.docApi.getByEntity(this.entityType, this.entityId).subscribe({
      next: docs => { this.documents.set(docs); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  download(id: number): void {
    this.docApi.download(id);
  }

  promptDelete(id: number): void {
    this.deleteTargetId = id;
    this.showConfirm.set(true);
  }

  confirmDelete(): void {
    this.showConfirm.set(false);
    this.docApi.deleteDoc(this.deleteTargetId).subscribe({
      next: () => this.loadDocuments()
    });
  }

  fileIcon(contentType: string): any {
    if (contentType.startsWith('image/')) return Image;
    if (contentType === 'application/pdf') return FileText;
    return File;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
