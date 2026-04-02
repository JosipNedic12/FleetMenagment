using ClosedXML.Excel;
using FleetManagement.Application.Common;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace FleetManagement.Infrastructure.Services;

public class ExportService
{
    // Call this once at app startup (Program.cs)
    public static void ConfigureLicensing()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // ── Excel Export ──
    public byte[] ExportToExcel<T>(
        IEnumerable<T> data,
        List<ExportColumn<T>> columns,
        string sheetName = "Export")
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add(sheetName);

        // Header row
        for (int i = 0; i < columns.Count; i++)
        {
            var cell = worksheet.Cell(1, i + 1);
            cell.Value = columns[i].Header;
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F0F0F0");
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        }

        // Data rows
        var dataList = data.ToList();
        for (int row = 0; row < dataList.Count; row++)
        {
            for (int col = 0; col < columns.Count; col++)
            {
                var value = columns[col].ValueSelector(dataList[row]);
                var cell = worksheet.Cell(row + 2, col + 1);

                switch (value)
                {
                    case null:
                        cell.Value = "";
                        break;
                    case DateTime dt:
                        cell.Value = dt;
                        cell.Style.DateFormat.Format = "dd.MM.yyyy";
                        break;
                    case DateOnly d:
                        cell.Value = d.ToDateTime(TimeOnly.MinValue);
                        cell.Style.DateFormat.Format = "dd.MM.yyyy";
                        break;
                    case decimal m:
                        cell.Value = (double)m;
                        cell.Style.NumberFormat.Format = "#,##0.00";
                        break;
                    case int n:
                        cell.Value = n;
                        break;
                    case short s:
                        cell.Value = s;
                        break;
                    default:
                        cell.Value = value.ToString();
                        break;
                }
            }
        }

        // Set column widths
        for (int i = 0; i < columns.Count; i++)
        {
            worksheet.Column(i + 1).Width = columns[i].Width;
        }

        // Freeze header row
        worksheet.SheetView.FreezeRows(1);

        // Auto-filter
        if (dataList.Count > 0)
        {
            worksheet.RangeUsed()?.SetAutoFilter();
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    // ── PDF Export ──
    public byte[] ExportToPdf<T>(
        IEnumerable<T> data,
        List<ExportColumn<T>> columns,
        string title,
        string? subtitle = null)
    {
        var dataList = data.ToList();

        var document = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(9));

                // Header
                page.Header().Column(col =>
                {
                    col.Item().Text(title).FontSize(16).Bold();
                    if (!string.IsNullOrWhiteSpace(subtitle))
                    {
                        col.Item().Text(subtitle).FontSize(9).FontColor(Colors.Grey.Medium);
                    }
                    col.Item().PaddingTop(5).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
                    col.Item().PaddingBottom(8);
                });

                // Content — Table
                page.Content().Table(table =>
                {
                    // Define columns with proportional widths
                    table.ColumnsDefinition(cd =>
                    {
                        foreach (var column in columns)
                        {
                            cd.RelativeColumn((float)column.Width);
                        }
                    });

                    // Table header
                    foreach (var column in columns)
                    {
                        table.Cell()
                            .Background(Colors.Grey.Lighten3)
                            .Padding(4)
                            .Text(column.Header)
                            .Bold()
                            .FontSize(8);
                    }

                    // Table rows
                    for (int row = 0; row < dataList.Count; row++)
                    {
                        var bgColor = row % 2 == 0 ? Colors.White : Colors.Grey.Lighten4;

                        foreach (var column in columns)
                        {
                            var value = column.ValueSelector(dataList[row]);
                            var displayValue = value switch
                            {
                                null => "",
                                DateTime dt => dt.ToString("dd.MM.yyyy"),
                                DateOnly d => d.ToString("dd.MM.yyyy"),
                                decimal m => m.ToString("N2"),
                                _ => value.ToString() ?? ""
                            };

                            table.Cell()
                                .Background(bgColor)
                                .Padding(4)
                                .Text(displayValue)
                                .FontSize(8);
                        }
                    }
                });

                // Footer
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                    text.Span($"  |  Generated: {DateTime.Now:dd.MM.yyyy HH:mm}");
                });
            });
        });

        return document.GeneratePdf();
    }
}
