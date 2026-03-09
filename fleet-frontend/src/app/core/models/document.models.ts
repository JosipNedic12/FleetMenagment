export interface Document {
  documentId: number;
  entityType: string;
  entityId: number;
  category?: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedBy: number;
  uploadedAt: string;
  notes?: string;
}
