using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services
{
    public class DesignationService : IDesignationService
    {
        private readonly AppDbContext _context;

        public DesignationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Designation>> GetAllDesignationsAsync()
        {
            return await _context.Designations
                .OrderBy(d => d.Name)
                .ToListAsync();
        }
    }
}
