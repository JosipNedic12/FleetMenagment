namespace FleetManagement.Application.Common;

/// <summary>
/// Generic paged request with an entity-specific filter.
/// Controllers bind this from query string parameters.
/// </summary>
public class PagedRequest<TFilter> where TFilter : class, new()
{
    private int _page = 1;
    private int _pageSize = 10;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    /// <summary>
    /// Items per page. Any value between 1 and 500.
    /// Defaults to 10 if an invalid value is provided.
    /// </summary>
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value is >= 1 and <= 500 ? value : 10;
    }

    /// <summary>
    /// Column name to sort by (e.g., "registrationNumber", "createdAt").
    /// Each service validates against its own allowed columns.
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// "asc" or "desc". Defaults to "asc" if omitted or invalid.
    /// </summary>
    public string SortDirection { get; set; } = "asc";

    /// <summary>
    /// Global text search across entity-specific searchable columns.
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// Entity-specific filter properties (e.g., VehicleFilter, DriverFilter).
    /// Bound from query string automatically by ASP.NET model binding.
    /// </summary>
    public TFilter Filter { get; set; } = new();

    // Computed
    public int Skip => (Page - 1) * PageSize;

    public bool IsDescending =>
        SortDirection.Equals("desc", StringComparison.OrdinalIgnoreCase);
}
