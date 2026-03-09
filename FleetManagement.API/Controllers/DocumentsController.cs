using FleetManagement.Application.DTOs;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private static readonly string[] AllowedEntityTypes =
        ["Vehicle", "Driver", "MaintenanceOrder", "Accident", "Inspection", "Insurance", "Registration", "Fine", "FuelTransaction"];

    private readonly FleetDbContext _db;
    private readonly IConfiguration _config;

    public DocumentsController(FleetDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // POST /api/documents
    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        [FromForm] string entityType,
        [FromForm] int entityId,
        IFormFile file,
        [FromForm] string? category = null,
        [FromForm] string? notes = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest("File is required.");

        if (!AllowedEntityTypes.Contains(entityType))
            return BadRequest($"entityType must be one of: {string.Join(", ", AllowedEntityTypes)}");

        var maxBytes = (_config.GetValue<int?>("FileStorage:MaxFileSizeMB") ?? 10) * 1024 * 1024;
        if (file.Length > maxBytes)
            return BadRequest($"File exceeds maximum size of {maxBytes / 1024 / 1024} MB.");

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)
                         ?? User.FindFirst(JwtRegisteredClaimNames.Sub)
                         ?? User.FindFirst("sub");
        if (userIdClaim == null) return Unauthorized();
        var uploadedBy = int.Parse(userIdClaim.Value);

        var uploadRoot = _config["FileStorage:UploadPath"] ?? "uploads";
        var dir = Path.Combine(uploadRoot, entityType, entityId.ToString());
        Directory.CreateDirectory(dir);

        var safeFileName = Path.GetFileName(file.FileName);
        var storedName = $"{Guid.NewGuid():N}_{safeFileName}";
        var filePath = Path.Combine(dir, storedName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var doc = new Document
        {
            EntityType = entityType,
            EntityId = entityId,
            Category = category,
            FileName = safeFileName,
            ContentType = file.ContentType,
            FilePath = filePath,
            FileSize = file.Length,
            UploadedBy = uploadedBy,
            UploadedAt = DateTime.UtcNow,
            Notes = notes
        };

        _db.Documents.Add(doc);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = doc.DocumentId }, ToDto(doc));
    }

    // GET /api/documents?entityType=Vehicle&entityId=5
    [HttpGet]
    public async Task<IActionResult> GetByEntity([FromQuery] string entityType, [FromQuery] int entityId)
    {
        var docs = await _db.Documents
            .Where(d => d.EntityType == entityType && d.EntityId == entityId)
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync();

        return Ok(docs.Select(ToDto));
    }

    // GET /api/documents/{id}/download
    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var doc = await _db.Documents.FindAsync(id);
        if (doc == null) return NotFound();
        if (!System.IO.File.Exists(doc.FilePath)) return NotFound("File not found on disk.");

        return PhysicalFile(Path.GetFullPath(doc.FilePath), doc.ContentType, doc.FileName);
    }

    // GET /api/documents/{id} — used by CreatedAtAction
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var doc = await _db.Documents.FindAsync(id);
        return doc == null ? NotFound() : Ok(ToDto(doc));
    }

    // DELETE /api/documents/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Delete(int id)
    {
        var doc = await _db.Documents.FindAsync(id);
        if (doc == null) return NotFound();

        if (System.IO.File.Exists(doc.FilePath))
            System.IO.File.Delete(doc.FilePath);

        _db.Documents.Remove(doc);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static DocumentDto ToDto(Document d) => new()
    {
        DocumentId = d.DocumentId,
        EntityType = d.EntityType,
        EntityId = d.EntityId,
        Category = d.Category,
        FileName = d.FileName,
        ContentType = d.ContentType,
        FileSize = d.FileSize,
        UploadedBy = d.UploadedBy,
        UploadedAt = d.UploadedAt,
        Notes = d.Notes
    };
}
