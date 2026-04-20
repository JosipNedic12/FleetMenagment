import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportXlsx<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const wsData = [
    columns.map(c => c.header),
    ...rows.map(row => columns.map(c => c.value(row))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
}

export function exportCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const header = columns.map(c => `"${c.header}"`).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const v = c.value(row);
      return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  const csv = [header, ...body].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportPdf<T>(
  filename: string,
  title: string,
  subtitle: string,
  rows: T[],
  columns: CsvColumn<T>[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;
  const usableWidth = pageWidth - margin * 2;

  // Title
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(title, margin, 36);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(subtitle, margin, 50);

  // Separator line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, 56, pageWidth - margin, 56);

  // Column widths — distribute evenly
  const colCount = columns.length;
  const colWidth = usableWidth / colCount;
  const rowHeight = 18;
  const headerHeight = 20;
  let y = 66;

  const drawRow = (cells: string[], isHeader: boolean, rowY: number, shade: boolean): void => {
    if (isHeader) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, rowY, usableWidth, headerHeight, 'F');
    } else if (shade) {
      doc.setFillColor(250, 251, 253);
      doc.rect(margin, rowY, usableWidth, rowHeight, 'F');
    }

    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, rowY + (isHeader ? headerHeight : rowHeight), pageWidth - margin, rowY + (isHeader ? headerHeight : rowHeight));

    doc.setFontSize(isHeader ? 7.5 : 8.5);
    doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
    doc.setTextColor(isHeader ? 100 : 50, isHeader ? 100 : 50, isHeader ? 100 : 50);

    const textY = rowY + (isHeader ? headerHeight : rowHeight) - 5;
    cells.forEach((cell, i) => {
      const x = margin + i * colWidth + 5;
      const maxW = colWidth - 8;
      const truncated = doc.getTextWidth(cell) > maxW
        ? doc.splitTextToSize(cell, maxW)[0] + '…'
        : cell;
      doc.text(truncated, x, textY);
    });
  };

  // Header row
  drawRow(columns.map(c => c.header.toUpperCase()), true, y, false);
  y += headerHeight;

  // Data rows
  rows.forEach((row, idx) => {
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin + 10;
      drawRow(columns.map(c => c.header.toUpperCase()), true, y, false);
      y += headerHeight;
    }
    drawRow(columns.map(c => String(c.value(row))), false, y, idx % 2 === 1);
    y += rowHeight;
  });

  doc.save(filename);
}
