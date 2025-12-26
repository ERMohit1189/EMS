using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TeamsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeamsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> CreateTeam([FromBody] Team team)
        {
            if (string.IsNullOrWhiteSpace(team.Name)) return BadRequest(new { error = "Name is required" });
            team.Id = Guid.NewGuid().ToString();
            team.CreatedAt = DateTime.UtcNow;
            team.UpdatedAt = DateTime.UtcNow;
            _context.Teams.Add(team);
            await _context.SaveChangesAsync();
            return Ok(team);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetTeams()
        {
            var teams = await _context.Teams
                .Select(t => new { id = t.Id, name = t.Name, description = t.Description })
                .ToListAsync();
            return Ok(teams);
        }

        [HttpGet("employee/{employeeId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTeamsForEmployee(string employeeId)
        {
            var teams = await _context.TeamMembers
                .Where(tm => tm.EmployeeId == employeeId)
                .Join(_context.Teams, tm => tm.TeamId, t => t.Id, (tm, t) => new { id = t.Id, name = t.Name, description = t.Description })
                .ToListAsync();
            return Ok(teams);
        }

        [HttpGet("my-reporting-teams")]
        [Authorize(Roles = "admin,user,superadmin")]
        public async Task<IActionResult> GetMyReportingTeams()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                         User.FindFirst("sub")?.Value ??
                         User.FindFirst("id")?.Value ?? string.Empty;
            if (string.IsNullOrEmpty(userId)) return Unauthorized(new { error = "Not authenticated" });

            var teams = await _context.TeamMembers
                .Where(tm => tm.ReportingPerson1 == userId || tm.ReportingPerson2 == userId || tm.ReportingPerson3 == userId)
                .Join(_context.Teams, tm => tm.TeamId, t => t.Id, (tm, t) => new { id = t.Id, name = t.Name, description = t.Description })
                .Distinct()
                .ToListAsync();

            return Ok(teams);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTeam(string id)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null) return NotFound();
            return Ok(team);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateTeam(string id, [FromBody] Team updated)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null) return NotFound();
            team.Name = updated.Name;
            team.Description = updated.Description;
            team.UpdatedAt = DateTime.UtcNow;
            _context.Teams.Update(team);
            await _context.SaveChangesAsync();
            return Ok(team);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteTeam(string id)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null) return NotFound();
            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("{id}/members")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> AddMember(string id, [FromBody] TeamMember member)
        {
            var team = await _context.Teams.FindAsync(id);
            if (team == null) return NotFound(new { error = "Team not found" });
            member.Id = Guid.NewGuid().ToString();
            member.TeamId = id;
            member.CreatedAt = DateTime.UtcNow;
            member.UpdatedAt = DateTime.UtcNow;
            _context.TeamMembers.Add(member);
            await _context.SaveChangesAsync();
            return Ok(member);
        }

        [HttpGet("{id}/members")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMembers(string id, [FromQuery] int? page, [FromQuery] int? pageSize)
        {
            // Join TeamMembers with Employee, Department, Designation to return enriched member info
            var query = from tm in _context.TeamMembers
                        join e in _context.Employees on tm.EmployeeId equals e.Id
                        join d in _context.Departments on e.DepartmentId equals d.Id into deptJoin
                        from dept in deptJoin.DefaultIfEmpty()
                        join des in _context.Designations on e.DesignationId equals des.Id into desJoin
                        from desig in desJoin.DefaultIfEmpty()
                        where tm.TeamId == id
                        select new
                        {
                            id = tm.Id,
                            employeeId = tm.EmployeeId,
                            employeeCode = e.EmpCode,
                            name = e.Name,
                            email = e.Email,
                            departmentName = dept != null ? dept.Name : null,
                            designationName = desig != null ? desig.Name : null,
                            reportingPerson1 = tm.ReportingPerson1,
                            reportingPerson2 = tm.ReportingPerson2,
                            reportingPerson3 = tm.ReportingPerson3,
                        };

            if (page.HasValue && pageSize.HasValue)
            {
                var total = await query.CountAsync();
                var items = await query.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value).ToListAsync();
                return Ok(new { members = items, total = total });
            }

            var members = await query.ToListAsync();
            return Ok(members);
        }

        [HttpDelete("{teamId}/members/{memberId}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteMember(string teamId, string memberId)
        {
            var member = await _context.TeamMembers.FindAsync(memberId);
            if (member == null) return NotFound(new { error = "Member not found" });
            _context.TeamMembers.Remove(member);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPut("members/{memberId}/reporting")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateReporting(string memberId, [FromBody] TeamMember input)
        {
            var member = await _context.TeamMembers.FindAsync(memberId);
            if (member == null) return NotFound(new { error = "Member not found" });
            member.ReportingPerson1 = input.ReportingPerson1;
            member.ReportingPerson2 = input.ReportingPerson2;
            member.ReportingPerson3 = input.ReportingPerson3;
            member.UpdatedAt = DateTime.UtcNow;
            _context.TeamMembers.Update(member);
            await _context.SaveChangesAsync();
            return Ok(member);
        }

        [HttpDelete("{teamId}/reporting/{level}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> ClearReportingForLevel(string teamId, int level)
        {
            if (level < 1 || level > 3) return BadRequest(new { error = "Invalid level" });
            var members = await _context.TeamMembers.Where(tm => tm.TeamId == teamId).ToListAsync();
            foreach (var m in members)
            {
                if (level == 1) m.ReportingPerson1 = null;
                if (level == 2) m.ReportingPerson2 = null;
                if (level == 3) m.ReportingPerson3 = null;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = $"Reporting Person {level} cleared for all team members" });
        }
    }
}
