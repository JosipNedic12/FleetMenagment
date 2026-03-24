using System.Text;
using FleetManagement.API.Middleware;
using FleetManagement.Application.Interfaces;
using FleetManagement.Infrastructure.Data;
using FleetManagement.Infrastructure.Repositories;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using FluentValidation;
using FluentValidation.AspNetCore;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// --- CORS ---
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// --- Database ---
builder.Services.AddDbContext<FleetDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null)));

// --- Repositories ---
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IDriverRepository, DriverRepository>();
builder.Services.AddScoped<IVehicleAssignmentRepository, VehicleAssignmentRepository>();

// --- JWT Service ---
builder.Services.AddScoped<IJwtService, JwtService>();

// --- Authentication ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });

builder.Services.AddAuthorization();

// --- FluentValidation ---
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// --- Controllers ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// --- Swagger with JWT support ---
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Fleet Management API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token. Example: eyJhbGci..."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddScoped<IOdometerLogRepository, OdometerLogRepository>();
builder.Services.AddScoped<IVendorRepository, VendorRepository>();
builder.Services.AddScoped<IMaintenanceOrderRepository, MaintenanceOrderRepository>();
builder.Services.AddScoped<IFuelCardRepository, FuelCardRepository>();
builder.Services.AddScoped<IFuelTransactionRepository, FuelTransactionRepository>();
builder.Services.AddScoped<IInsurancePolicyRepository, InsurancePolicyRepository>();
builder.Services.AddScoped<IRegistrationRecordRepository, RegistrationRecordRepository>();
builder.Services.AddScoped<IFineRepository, FineRepository>();
builder.Services.AddScoped<IAccidentRepository, AccidentRepository>();
builder.Services.AddScoped<IInspectionRepository, InspectionRepository>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// --- Application Services ---
builder.Services.AddScoped<IVehicleService, VehicleService>();
builder.Services.AddScoped<IAccidentService, AccidentService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDriverService, DriverService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IFineService, FineService>();
builder.Services.AddScoped<IFuelCardService, FuelCardService>();
builder.Services.AddScoped<IFuelTransactionService, FuelTransactionService>();
builder.Services.AddScoped<IInspectionService, InspectionService>();
builder.Services.AddScoped<IInsurancePolicyService, InsurancePolicyService>();
builder.Services.AddScoped<ILookupService, LookupService>();
builder.Services.AddScoped<IMaintenanceOrderService, MaintenanceOrderService>();
builder.Services.AddScoped<IOdometerLogService, OdometerLogService>();
builder.Services.AddScoped<IRegistrationRecordService, RegistrationRecordService>();
builder.Services.AddScoped<IVehicleAssignmentService, VehicleAssignmentService>();
builder.Services.AddScoped<IVendorService, VendorService>();

builder.Services.AddMemoryCache();
builder.Services.AddHostedService<NotificationGeneratorService>();

// --- Serilog ---
builder.Host.UseSerilog((ctx, lc) => lc
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore.Hosting", LogEventLevel.Information)
    .MinimumLevel.Override("FleetManagement", LogEventLevel.Debug)
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .Enrich.WithEnvironmentName()
    .WriteTo.Console(
        ctx.HostingEnvironment.IsDevelopment()
            ? (Serilog.Formatting.ITextFormatter)new Serilog.Formatting.Display.MessageTemplateTextFormatter(
                "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
            : new Serilog.Formatting.Compact.CompactJsonFormatter())
    .WriteTo.File(
        new Serilog.Formatting.Compact.CompactJsonFormatter(),
        path: "logs/fleet-api-.json",
        rollingInterval: RollingInterval.Day,
        fileSizeLimitBytes: 50 * 1024 * 1024,
        retainedFileCountLimit: 30,
        rollOnFileSizeLimit: true));

var app = builder.Build();

// Ensure uploads folder exists
Directory.CreateDirectory(app.Configuration["FileStorage:UploadPath"] ?? "uploads");

app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-run EF migrations on startup
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<FleetDbContext>();
    db.Database.Migrate();
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Failed to apply migrations on startup");
}

app.Run();