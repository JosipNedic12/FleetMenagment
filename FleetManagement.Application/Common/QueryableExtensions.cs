using System.Linq.Expressions;

namespace FleetManagement.Application.Common;

/// <summary>
/// IQueryable extension methods for dynamic sorting and pagination.
/// Used by all services to avoid repeating Skip/Take/OrderBy logic.
/// </summary>
public static class QueryableExtensions
{
    /// <summary>
    /// Applies dynamic sorting by property name.
    /// Falls back to the provided defaultSort if sortBy is null or not found.
    /// </summary>
    public static IQueryable<T> ApplySort<T>(
        this IQueryable<T> query,
        string? sortBy,
        bool descending,
        Dictionary<string, Expression<Func<T, object>>> allowedSorts,
        Expression<Func<T, object>> defaultSort)
    {
        Expression<Func<T, object>> sortExpression = defaultSort;

        if (!string.IsNullOrWhiteSpace(sortBy) &&
            allowedSorts.TryGetValue(sortBy.ToLowerInvariant(), out var found))
        {
            sortExpression = found;
        }

        return descending
            ? query.OrderByDescending(sortExpression)
            : query.OrderBy(sortExpression);
    }

    /// <summary>
    /// Applies Skip + Take pagination from a PagedRequest.
    /// </summary>
    public static IQueryable<T> ApplyPaging<T>(
        this IQueryable<T> query, int skip, int pageSize)
    {
        return query.Skip(skip).Take(pageSize);
    }
}
