using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LeaveTypesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetLeaveTypes()
        {
            var leaveTypes = new[]
            {
                new { code = "ML", name = "Medical Leave" },
                new { code = "CL", name = "Casual Leave" },
                new { code = "EL", name = "Earned Leave" },
                new { code = "SL", name = "Sick Leave" },
                new { code = "PL", name = "Personal Leave" },
                new { code = "UL", name = "Unpaid Leave" },
                new { code = "LWP", name = "Leave Without Pay" }
            };

            return Ok(leaveTypes);
        }
    }
}
