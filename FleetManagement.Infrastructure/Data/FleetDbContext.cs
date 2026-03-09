using FleetManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Data;

public class FleetDbContext : DbContext
{
    public FleetDbContext(DbContextOptions<FleetDbContext> options) : base(options) { }

    // Core tables
    public DbSet<Vehicle> Vehicles { get; set; }
    public DbSet<VehicleAssignment> VehicleAssignments { get; set; }

    // Dictionaries
    public DbSet<DcVehicleMake> VehicleMakes { get; set; }
    public DbSet<DcVehicleModel> VehicleModels { get; set; }
    public DbSet<DcVehicleCategory> VehicleCategories { get; set; }
    public DbSet<DcFuelType> FuelTypes { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Driver> Drivers { get; set; }
    public DbSet<DriverLicenseCategory> DriverLicenseCategories { get; set; }
    public DbSet<DcLicenseCategory> LicenseCategories { get; set; }
    public DbSet<AppUser> AppUsers { get; set; }
    public DbSet<OdometerLog> OdometerLogs { get; set; }
    public DbSet<Vendor> Vendors { get; set; }
    public DbSet<MaintenanceOrder> MaintenanceOrders { get; set; }
    public DbSet<MaintenanceItem> MaintenanceItems { get; set; }
    public DbSet<DcMaintenanceType> MaintenanceTypes { get; set; }
    public DbSet<FuelCard> FuelCards { get; set; }
    public DbSet<FuelTransaction> FuelTransactions { get; set; }
    public DbSet<InsurancePolicy> InsurancePolicies => Set<InsurancePolicy>();
    public DbSet<RegistrationRecord> RegistrationRecords => Set<RegistrationRecord>();
    public DbSet<Fine> Fines => Set<Fine>();
    public DbSet<Accident> Accidents => Set<Accident>();
    public DbSet<Inspection> Inspections => Set<Inspection>();
    public DbSet<Document> Documents { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("fleet");

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("vehicle");
            entity.HasKey(e => e.VehicleId);
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.RegistrationNumber).HasColumnName("registration_number");
            entity.Property(e => e.Vin).HasColumnName("vin");
            entity.Property(e => e.MakeId).HasColumnName("make_id");
            entity.Property(e => e.ModelId).HasColumnName("model_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.FuelTypeId).HasColumnName("fuel_type_id");
            entity.Property(e => e.Year).HasColumnName("year");
            entity.Property(e => e.Color).HasColumnName("color");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.CurrentOdometerKm).HasColumnName("current_odometer_km");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Make).WithMany().HasForeignKey(e => e.MakeId);
            entity.HasOne(e => e.Model).WithMany().HasForeignKey(e => e.ModelId);
            entity.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId);
            entity.HasOne(e => e.FuelType).WithMany().HasForeignKey(e => e.FuelTypeId);
        });

        modelBuilder.Entity<DcVehicleMake>(entity =>
        {
            entity.ToTable("dc_vehicle_make");
            entity.HasKey(e => e.MakeId);
            entity.Property(e => e.MakeId).HasColumnName("make_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<DcVehicleModel>(entity =>
        {
            entity.ToTable("dc_vehicle_model");
            entity.HasKey(e => e.ModelId);
            entity.Property(e => e.ModelId).HasColumnName("model_id");
            entity.Property(e => e.MakeId).HasColumnName("make_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<DcVehicleCategory>(entity =>
        {
            entity.ToTable("dc_vehicle_category");
            entity.HasKey(e => e.CategoryId);
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<DcFuelType>(entity =>
        {
            entity.ToTable("dc_fuel_type");
            entity.HasKey(e => e.FuelTypeId);
            entity.Property(e => e.FuelTypeId).HasColumnName("fuel_type_id");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.Label).HasColumnName("label");
            entity.Property(e => e.IsElectric).HasColumnName("is_electric");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("employee");
            entity.HasKey(e => e.EmployeeId);
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
            entity.Property(e => e.Department).HasColumnName("department");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Driver)
                  .WithOne(d => d.Employee)
                  .HasForeignKey<Driver>(d => d.EmployeeId);
        });

        modelBuilder.Entity<Driver>(entity =>
        {
            entity.ToTable("driver");
            entity.HasKey(e => e.DriverId);
            entity.Property(e => e.DriverId).HasColumnName("driver_id");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.LicenseNumber).HasColumnName("license_number");
            entity.Property(e => e.LicenseExpiry).HasColumnName("license_expiry");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

        });

        modelBuilder.Entity<DriverLicenseCategory>(entity =>
        {
            entity.ToTable("driver_license_category");
            entity.HasKey(e => new { e.DriverId, e.LicenseCategoryId });
            entity.Property(e => e.DriverId).HasColumnName("driver_id");
            entity.Property(e => e.LicenseCategoryId).HasColumnName("license_category_id");
            entity.Property(e => e.ObtainedDate).HasColumnName("obtained_date");

            entity.HasOne(e => e.Driver)
                  .WithMany(d => d.LicenseCategories)
                  .HasForeignKey(e => e.DriverId);

            entity.HasOne(e => e.LicenseCategory)
                  .WithMany()
                  .HasForeignKey(e => e.LicenseCategoryId);
        });

        modelBuilder.Entity<DcLicenseCategory>(entity =>
        {
            entity.ToTable("dc_license_category");
            entity.HasKey(e => e.LicenseCategoryId);
            entity.Property(e => e.LicenseCategoryId).HasColumnName("license_category_id");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        // --- VehicleAssignment mapping ---
        modelBuilder.Entity<VehicleAssignment>(entity =>
        {
            entity.ToTable("vehicle_assignment");
            entity.HasKey(e => e.AssignmentId);
            entity.Property(e => e.AssignmentId).HasColumnName("assignment_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.DriverId).HasColumnName("driver_id");
            entity.Property(e => e.AssignedFrom).HasColumnName("assigned_from");
            entity.Property(e => e.AssignedTo).HasColumnName("assigned_to");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Vehicle)
                  .WithMany()
                  .HasForeignKey(e => e.VehicleId);

            entity.HasOne(e => e.Driver)
                  .WithMany()
                  .HasForeignKey(e => e.DriverId);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("app_user");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.Username).HasColumnName("username");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.Role).HasColumnName("role");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.MustChangePassword).HasColumnName("must_change_password");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");

            entity.HasIndex(e => e.Username).IsUnique();

            entity.HasOne(e => e.Employee)
                  .WithOne(e => e.AppUser)
                  .HasForeignKey<AppUser>(e => e.EmployeeId);
        });
        modelBuilder.Entity<OdometerLog>(entity =>
        {
            entity.ToTable("odometer_log");
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.LogId).HasColumnName("log_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.OdometerKm).HasColumnName("odometer_km");
            entity.Property(e => e.LogDate).HasColumnName("log_date");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");

            entity.HasOne(e => e.Vehicle)
                  .WithMany()
                  .HasForeignKey(e => e.VehicleId);
        });
        modelBuilder.Entity<Vendor>(entity =>
        {
            entity.ToTable("vendor");
            entity.HasKey(e => e.VendorId);
            entity.Property(e => e.VendorId).HasColumnName("vendor_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.ContactPerson).HasColumnName("contact_person");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");
        });

        modelBuilder.Entity<DcMaintenanceType>(entity =>
        {
            entity.ToTable("dc_maintenance_type");
            entity.HasKey(e => e.MaintenanceTypeId);
            entity.Property(e => e.MaintenanceTypeId).HasColumnName("maintenance_type_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<MaintenanceOrder>(entity =>
        {
            entity.ToTable("maintenance_order");
            entity.HasKey(e => e.OrderId);
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.VendorId).HasColumnName("vendor_id");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.ReportedAt).HasColumnName("reported_at");
            entity.Property(e => e.ScheduledAt).HasColumnName("scheduled_at");
            entity.Property(e => e.ClosedAt).HasColumnName("closed_at");
            entity.Property(e => e.OdometerKm).HasColumnName("odometer_km");
            entity.Property(e => e.TotalCost).HasColumnName("total_cost");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CancelReason).HasColumnName("cancel_reason");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Vehicle)
                  .WithMany()
                  .HasForeignKey(e => e.VehicleId);

            entity.HasOne(e => e.Vendor)
                  .WithMany()
                  .HasForeignKey(e => e.VendorId);

            entity.HasMany(e => e.Items)
                  .WithOne(i => i.Order)
                  .HasForeignKey(i => i.OrderId);
        });

        modelBuilder.Entity<MaintenanceItem>(entity =>
        {
            entity.ToTable("maintenance_item");
            entity.HasKey(e => e.ItemId);
            entity.Property(e => e.ItemId).HasColumnName("item_id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.MaintenanceTypeId).HasColumnName("maintenance_type_id");
            entity.Property(e => e.PartsCost).HasColumnName("parts_cost");
            entity.Property(e => e.LaborCost).HasColumnName("labor_cost");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");

            entity.HasOne(e => e.Order)
                  .WithMany(o => o.Items)
                  .HasForeignKey(e => e.OrderId);

            entity.HasOne(e => e.MaintenanceType)
                  .WithMany()
                  .HasForeignKey(e => e.MaintenanceTypeId);
        });
        modelBuilder.Entity<FuelCard>(entity =>
        {
            entity.ToTable("fuel_card");
            entity.HasKey(e => e.FuelCardId);
            entity.Property(e => e.FuelCardId).HasColumnName("fuel_card_id");
            entity.Property(e => e.CardNumber).HasColumnName("card_number");
            entity.Property(e => e.Provider).HasColumnName("provider");
            entity.Property(e => e.AssignedVehicleId).HasColumnName("assigned_vehicle_id");
            entity.Property(e => e.ValidFrom).HasColumnName("valid_from");
            entity.Property(e => e.ValidTo).HasColumnName("valid_to");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.AssignedVehicle)
                  .WithMany()
                  .HasForeignKey(e => e.AssignedVehicleId);
        });

        modelBuilder.Entity<FuelTransaction>(entity =>
        {
            entity.ToTable("fuel_transaction");
            entity.HasKey(e => e.TransactionId);
            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.FuelCardId).HasColumnName("fuel_card_id");
            entity.Property(e => e.FuelTypeId).HasColumnName("fuel_type_id");
            entity.Property(e => e.PostedAt).HasColumnName("posted_at");
            entity.Property(e => e.OdometerKm).HasColumnName("odometer_km");
            entity.Property(e => e.Liters).HasColumnName("liters");
            entity.Property(e => e.PricePerLiter).HasColumnName("price_per_liter");
            entity.Property(e => e.EnergyKwh).HasColumnName("energy_kwh");
            entity.Property(e => e.PricePerKwh).HasColumnName("price_per_kwh");
            entity.Property(e => e.TotalCost).HasColumnName("total_cost");
            entity.Property(e => e.StationName).HasColumnName("station_name");
            entity.Property(e => e.ReceiptNumber).HasColumnName("receipt_number");
            entity.Property(e => e.IsSuspicious).HasColumnName("is_suspicious");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");

            entity.HasOne(e => e.Vehicle)
                  .WithMany()
                  .HasForeignKey(e => e.VehicleId);

            entity.HasOne(e => e.FuelCard)
                  .WithMany()
                  .HasForeignKey(e => e.FuelCardId);

            entity.HasOne(e => e.FuelType)
                  .WithMany()
                  .HasForeignKey(e => e.FuelTypeId);
        });
        modelBuilder.Entity<InsurancePolicy>(entity =>
        {
            entity.ToTable("insurance_policy", "fleet");
            entity.HasKey(e => e.PolicyId);
            entity.Property(e => e.PolicyId).HasColumnName("policy_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.PolicyNumber).HasColumnName("policy_number");
            entity.Property(e => e.Insurer).HasColumnName("insurer");
            entity.Property(e => e.ValidFrom).HasColumnName("valid_from");
            entity.Property(e => e.ValidTo).HasColumnName("valid_to");
            entity.Property(e => e.Premium).HasColumnName("premium");
            entity.Property(e => e.CoverageNotes).HasColumnName("coverage_notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Vehicle)
                  .WithMany()
                  .HasForeignKey(e => e.VehicleId);
        });
        modelBuilder.Entity<RegistrationRecord>(entity =>
        {
            entity.ToTable("registration_record", "fleet");
            entity.HasKey(e => e.RegistrationId);
            entity.Property(e => e.RegistrationId).HasColumnName("registration_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.RegistrationNumber).HasColumnName("registration_number");
            entity.Property(e => e.ValidFrom).HasColumnName("valid_from");
            entity.Property(e => e.ValidTo).HasColumnName("valid_to");
            entity.Property(e => e.Fee).HasColumnName("fee");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Vehicle).WithMany().HasForeignKey(e => e.VehicleId);
        });
        modelBuilder.Entity<Fine>(entity =>
        {
            entity.ToTable("fine", "fleet");
            entity.HasKey(e => e.FineId);
            entity.Property(e => e.FineId).HasColumnName("fine_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.DriverId).HasColumnName("driver_id");
            entity.Property(e => e.OccurredAt).HasColumnName("occurred_at");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.PaidAt).HasColumnName("paid_at");
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Vehicle).WithMany().HasForeignKey(e => e.VehicleId);
            entity.HasOne(e => e.Driver).WithMany().HasForeignKey(e => e.DriverId);
        });
        modelBuilder.Entity<Accident>(entity =>
        {
            entity.ToTable("accident", "fleet");
            entity.HasKey(e => e.AccidentId);
            entity.Property(e => e.AccidentId).HasColumnName("accident_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.DriverId).HasColumnName("driver_id");
            entity.Property(e => e.OccurredAt).HasColumnName("occurred_at");
            entity.Property(e => e.Severity).HasColumnName("severity");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DamageEstimate).HasColumnName("damage_estimate");
            entity.Property(e => e.PoliceReport).HasColumnName("police_report");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ModifiedAt).HasColumnName("modified_at");
            entity.Property(e => e.ModifiedBy).HasColumnName("modified_by");

            entity.HasOne(e => e.Vehicle).WithMany().HasForeignKey(e => e.VehicleId);
            entity.HasOne(e => e.Driver).WithMany().HasForeignKey(e => e.DriverId);
        });

        modelBuilder.Entity<Inspection>(entity =>
        {
            entity.ToTable("inspection", "fleet");
            entity.HasKey(e => e.InspectionId);
            entity.Property(e => e.InspectionId).HasColumnName("inspection_id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.InspectedAt).HasColumnName("inspected_at");
            entity.Property(e => e.ValidTo).HasColumnName("valid_to");
            entity.Property(e => e.Result).HasColumnName("result");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.OdometerKm).HasColumnName("odometer_km");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");

            entity.HasOne(e => e.Vehicle).WithMany().HasForeignKey(e => e.VehicleId);
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("document", "fleet");
            entity.HasKey(e => e.DocumentId);
            entity.Property(e => e.DocumentId).HasColumnName("document_id");
            entity.Property(e => e.EntityType).HasColumnName("entity_type");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.FileName).HasColumnName("file_name");
            entity.Property(e => e.ContentType).HasColumnName("content_type");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.FileSize).HasColumnName("file_size");
            entity.Property(e => e.UploadedBy).HasColumnName("uploaded_by");
            entity.Property(e => e.UploadedAt).HasColumnName("uploaded_at");
            entity.Property(e => e.Notes).HasColumnName("notes");

            entity.HasIndex(e => new { e.EntityType, e.EntityId }).HasDatabaseName("ix_document_entity_type_entity_id");
        });
    }
}