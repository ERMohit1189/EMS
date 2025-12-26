using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class HolidayService : IHolidayService
    {
        private readonly AppDbContext _context;

        public HolidayService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Holiday?> GetHolidayByIdAsync(string id)
        {
            return await _context.Holidays
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public async Task<List<Holiday>> GetAllHolidaysAsync()
        {
            return await _context.Holidays
                .OrderBy(h => h.Date)
                .ToListAsync();
        }

        public async Task<List<Holiday>> GetHolidaysByYearAsync(int year)
        {
            return await _context.Holidays
                .Where(h => h.Date.Year == year)
                .OrderBy(h => h.Date)
                .ToListAsync();
        }

        public async Task<Holiday> CreateHolidayAsync(Holiday holiday)
        {
            holiday.Id = Guid.NewGuid().ToString();
            holiday.CreatedAt = DateTime.UtcNow;
            holiday.UpdatedAt = DateTime.UtcNow;

            _context.Holidays.Add(holiday);
            await _context.SaveChangesAsync();
            return holiday;
        }

        public async Task<Holiday?> UpdateHolidayAsync(string id, Holiday holiday)
        {
            var existing = await _context.Holidays.FindAsync(id);
            if (existing == null) return null;

            existing.Name = holiday.Name;
            existing.Date = holiday.Date;
            existing.Type = holiday.Type;
            existing.State = holiday.State;
            existing.Description = holiday.Description;
            existing.IsActive = holiday.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.Holidays.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteHolidayAsync(string id)
        {
            var holiday = await _context.Holidays.FindAsync(id);
            if (holiday == null) return false;

            _context.Holidays.Remove(holiday);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
