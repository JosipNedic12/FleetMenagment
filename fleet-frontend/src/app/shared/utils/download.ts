/** Trigger a file download from a Blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Extract filename from Content-Disposition header, fallback to provided default */
export function extractFilename(contentDisposition: string | null, fallback = 'export'): string {
  if (contentDisposition) {
    const match = /filename\*?=(?:UTF-8''|)"?([^";\r\n]+)"?/i.exec(contentDisposition);
    if (match?.[1]) return decodeURIComponent(match[1].trim());
  }
  return fallback;
}
