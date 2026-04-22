using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FleetManagement.Infrastructure.Data;

public class FleetDbContextFactory : IDesignTimeDbContextFactory<FleetDbContext>
{
    public FleetDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<FleetDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=aws-1-eu-west-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.ivpuxbkzhelbcibuircn;Password=MaxFleet#123;SSL Mode=Require;Trust Server Certificate=true;Pooling=false;Timeout=30;Command Timeout=30"
        );

        return new FleetDbContext(optionsBuilder.Options);
    }
}
