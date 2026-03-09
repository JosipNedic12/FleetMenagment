namespace FleetManagement.Domain.Entities;

public class Document
{
    public int DocumentId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string? Category { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? Notes { get; set; }
}
