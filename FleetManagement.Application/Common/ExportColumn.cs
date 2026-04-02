namespace FleetManagement.Application.Common;

/// <summary>
/// Defines a column for Excel/PDF export.
/// Each service provides its own column definitions.
/// </summary>
public class ExportColumn<T>
{
    public string Header { get; set; } = string.Empty;

    /// <summary>Width in Excel character units. PDF uses proportional sizing.</summary>
    public double Width { get; set; } = 20;

    /// <summary>Function to extract the cell value from the entity/DTO.</summary>
    public Func<T, object?> ValueSelector { get; set; } = _ => null;
}
