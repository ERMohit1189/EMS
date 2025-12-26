using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class ZoneService : IZoneService
    {
        private readonly AppDbContext _context;

        public ZoneService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Zone?> GetZoneByIdAsync(string id)
        {
            return await _context.Zones.FirstOrDefaultAsync(z => z.Id == id);
        }

        public async Task<List<Zone>> GetAllZonesAsync()
        {
            return await _context.Zones.ToListAsync();
        }

        public async Task<(List<Zone> zones, int totalCount)> GetZonesPagedAsync(int page, int pageSize)
        {
            var totalCount = await _context.Zones.CountAsync();

            var zones = await _context.Zones
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (zones, totalCount);
        }

        public async Task<Zone> CreateZoneAsync(Zone zone)
        {
            zone.Id = Guid.NewGuid().ToString();
            zone.CreatedAt = DateTime.UtcNow;
            zone.UpdatedAt = DateTime.UtcNow;

            _context.Zones.Add(zone);
            await _context.SaveChangesAsync();
            return zone;
        }

        public async Task<Zone?> UpdateZoneAsync(string id, Zone zone)
        {
            var existing = await _context.Zones.FindAsync(id);
            if (existing == null) return null;

            existing.Name = zone.Name;
            existing.ShortName = zone.ShortName;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.Zones.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteZoneAsync(string id)
        {
            var zone = await _context.Zones.FindAsync(id);
            if (zone == null) return false;

            _context.Zones.Remove(zone);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
