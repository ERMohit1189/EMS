using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class CircleService : ICircleService
    {
        private readonly AppDbContext _context;

        public CircleService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Circle?> GetCircleByIdAsync(string id)
        {
            return await _context.Circles.FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<List<Circle>> GetAllCirclesAsync()
        {
            return await _context.Circles.ToListAsync();
        }

        public async Task<(List<Circle> circles, int totalCount)> GetCirclesPagedAsync(int page, int pageSize)
        {
            var totalCount = await _context.Circles.CountAsync();

            var circles = await _context.Circles
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (circles, totalCount);
        }

        public async Task<Circle> CreateCircleAsync(Circle circle)
        {
            circle.Id = Guid.NewGuid().ToString();
            circle.CreatedAt = DateTime.UtcNow;
            circle.UpdatedAt = DateTime.UtcNow;

            _context.Circles.Add(circle);
            await _context.SaveChangesAsync();
            return circle;
        }

        public async Task<Circle?> UpdateCircleAsync(string id, Circle circle)
        {
            var existing = await _context.Circles.FindAsync(id);
            if (existing == null) return null;

            existing.Name = circle.Name;
            existing.ShortName = circle.ShortName;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.Circles.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteCircleAsync(string id)
        {
            var circle = await _context.Circles.FindAsync(id);
            if (circle == null) return false;

            _context.Circles.Remove(circle);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
