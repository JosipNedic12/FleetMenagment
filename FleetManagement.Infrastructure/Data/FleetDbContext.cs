using FleetManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Data;

public class FleetDbContext : DbContext
{
    public FleetDbContext(DbContextOptions<FleetDbContext> options) : base(options) { }

    // Core tables
    public DbSet<Vehicle> Vehicles { get; set; }

    // Dictionaries
    public DbSet<DcVehicleMake> VehicleMakes { get; set; }
    public DbSet<DcVehicleModel> VehicleModels { get; set; }
    public DbSet<DcVehicleCategory> VehicleCategories { get; set; }
    public DbSet<DcFuelType> FuelTypes { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Driver> Drivers { get; set; }
    public DbSet<DriverLicenseCategory> DriverLicenseCategories { get; set; }
    public DbSet<DcLicenseCategory> LicenseCategories { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tell EF Core to use the "fleet" schema
        modelBuilder.HasDefaultSchema("fleet");

        // Vehicle table mapping
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

            // Relationships
            entity.HasOne(e => e.Make).WithMany().HasForeignKey(e => e.MakeId);
            entity.HasOne(e => e.Model).WithMany().HasForeignKey(e => e.ModelId);
            entity.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId);
            entity.HasOne(e => e.FuelType).WithMany().HasForeignKey(e => e.FuelTypeId);
        });

        // Dictionary tables mapping
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
    }
}