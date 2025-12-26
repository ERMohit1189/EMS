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

        public async Task<List<Holiday>> GetAllHolidaysAsync(int? year = null, string? state = null)
        {
            var q = _context.Holidays.AsQueryable();
            if (year.HasValue) q = q.Where(h => h.Date.Year == year.Value);
            if (!string.IsNullOrWhiteSpace(state)) q = q.Where(h => h.State == state || h.State == null || h.State == "");
            return await q.OrderBy(h => h.Date).ToListAsync();
        }

        public async Task<List<Holiday>> GetHolidaysByYearAsync(int year)
        {
            return await _context.Holidays
                .Where(h => h.Date.Year == year)
                .OrderBy(h => h.Date)
                .ToListAsync();
        }

        public async Task<List<Holiday>> GetHolidaysForMonthAsync(int year, int month, string? state = null)
        {
            var q = _context.Holidays.Where(h => h.Date.Year == year && h.Date.Month == month && h.IsActive == true);
            if (!string.IsNullOrWhiteSpace(state)) q = q.Where(h => h.State == state || h.State == null || h.State == "");
            return await q.OrderBy(h => h.Date).ToListAsync();
        }

        public async Task<(Holiday holiday, bool isUpdated)> UpsertHolidayAsync(Holiday holiday)
        {
            // Find an existing holiday matching name + date + state (or null/empty state)
            var existing = await _context.Holidays.FirstOrDefaultAsync(h =>
                h.Name == holiday.Name &&
                h.Date.Date == holiday.Date.Date &&
                ((h.State == holiday.State) || (string.IsNullOrEmpty(h.State) && string.IsNullOrEmpty(holiday.State)) || (h.State == null && holiday.State == null))
            );

            if (existing != null)
            {
                existing.Name = holiday.Name;
                existing.Date = holiday.Date;
                existing.Type = holiday.Type;
                existing.State = holiday.State;
                existing.Description = holiday.Description;
                existing.IsActive = holiday.IsActive;
                existing.UpdatedAt = DateTime.UtcNow;
                _context.Holidays.Update(existing);
                await _context.SaveChangesAsync();
                return (existing, true);
            }

            // Insert new
            holiday.Id = Guid.NewGuid().ToString();
            holiday.CreatedAt = DateTime.UtcNow;
            holiday.UpdatedAt = DateTime.UtcNow;
            _context.Holidays.Add(holiday);
            await _context.SaveChangesAsync();
            return (holiday, false);
        }

        public async Task<List<(Holiday holiday, bool isUpdated)>> BulkUpsertAsync(List<Holiday> holidays)
        {
            var results = new List<(Holiday, bool)>();
            foreach (var h in holidays)
            {
                var res = await UpsertHolidayAsync(h);
                results.Add(res);
            }
            return results;
        }

        public Task<IEnumerable<object>> GenerateHolidaySuggestionsAsync(int year, string? state = null)
        {
            // Port of Node logic: generate a list of national + festival + state-specific holidays
            // Match Node.js festival list for richer suggestions
            var national = new[] {
                new { name = "Republic Day", month = 1, day = 26, type = "public", description = "Celebrates the adoption of the Constitution of India" },
                new { name = "Independence Day", month = 8, day = 15, type = "public", description = "Commemorates India's independence from British rule" },
                new { name = "Mahatma Gandhi's Birthday", month = 10, day = 2, type = "public", description = "Birth anniversary of Mahatma Gandhi" },
            };

            var festival = new[] {
                new { name = "Holi", month = 3, day = 25, type = "public", description = "Festival of colors" },
                new { name = "Ram Navami", month = 4, day = 17, type = "optional", description = "Birth anniversary of Lord Rama" },
                new { name = "Mahavir Jayanti", month = 4, day = 21, type = "optional", description = "Birth anniversary of Lord Mahavira" },
                new { name = "Good Friday", month = 3, day = 29, type = "optional", description = "Christian holy day" },
                new { name = "Eid ul-Fitr", month = 4, day = 11, type = "public", description = "Islamic festival marking the end of Ramadan" },
                new { name = "Buddha Purnima", month = 5, day = 23, type = "optional", description = "Birth anniversary of Gautama Buddha" },
                new { name = "Eid ul-Adha", month = 6, day = 17, type = "public", description = "Festival of sacrifice" },
                new { name = "Muharram", month = 7, day = 7, type = "optional", description = "Islamic new year" },
                new { name = "Raksha Bandhan", month = 8, day = 19, type = "optional", description = "Festival celebrating the bond between brothers and sisters" },
                new { name = "Janmashtami", month = 8, day = 26, type = "optional", description = "Birth anniversary of Lord Krishna" },
                new { name = "Ganesh Chaturthi", month = 9, day = 7, type = "optional", description = "Birth anniversary of Lord Ganesha" },
                new { name = "Dussehra", month = 10, day = 12, type = "public", description = "Victory of good over evil" },
                new { name = "Diwali", month = 10, day = 31, type = "public", description = "Festival of lights" },
                new { name = "Guru Nanak Jayanti", month = 11, day = 15, type = "optional", description = "Birth anniversary of Guru Nanak" },
                new { name = "Christmas", month = 12, day = 25, type = "public", description = "Christian festival celebrating the birth of Jesus Christ" },
            };

            var stateSpecific = new Dictionary<string, (string name, int month, int day, string type, string description)[]>
            {
                { "Maharashtra", new[] { ("Maharashtra Day", 5, 1, "public", "Formation day of Maharashtra state"), ("Gudi Padwa", 3, 22, "public", "Marathi new year") } },
                { "Karnataka", new[] { ("Karnataka Rajyotsava", 11, 1, "public", "Formation day of Karnataka state"), ("Ugadi", 3, 22, "public", "Kannada new year") } },
                { "Tamil Nadu", new[] { ("Pongal", 1, 15, "public", "Harvest festival"), ("Tamil New Year", 4, 14, "public", "Tamil new year") } },
                { "West Bengal", new[] { ("Bengali New Year", 4, 15, "public", "Pohela Boishakh"), ("Durga Puja", 10, 9, "public", "Worship of Goddess Durga") } },
                { "Kerala", new[] { ("Onam", 8, 29, "public", "Harvest festival of Kerala"), ("Vishu", 4, 15, "public", "Malayali new year") } },
                { "Punjab", new[] { ("Baisakhi", 4, 13, "public", "Punjabi new year and harvest festival"), ("Lohri", 1, 13, "optional", "Harvest festival") } },
                { "Gujarat", new[] { ("Uttarayan", 1, 14, "optional", "Kite flying festival"), ("Navratri", 10, 3, "optional", "Nine nights festival") } },
            };

            var list = new List<object>();
            foreach (var n in national)
                list.Add(new { name = n.name, date = new DateTime(year, n.month, n.day).ToString("yyyy-MM-dd"), type = n.type, description = n.description });
            foreach (var f in festival)
                list.Add(new { name = f.name, date = new DateTime(year, f.month, f.day).ToString("yyyy-MM-dd"), type = f.type, description = f.description });

            if (!string.IsNullOrWhiteSpace(state) && stateSpecific.ContainsKey(state))
            {
                foreach (var s in stateSpecific[state])
                {
                    list.Add(new { name = s.name, date = new DateTime(year, s.month, s.day).ToString("yyyy-MM-dd"), type = s.type, description = s.description });
                }
            }

            return Task.FromResult(list.AsEnumerable());
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
