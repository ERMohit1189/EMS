using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VendorRegistrationBackend.Models;
using VendorRegistrationBackend.Services;

namespace VendorRegistrationBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _invoiceService;

        public InvoicesController(IInvoiceService invoiceService)
        {
            _invoiceService = invoiceService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetInvoice(string id)
        {
            var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
            if (invoice == null)
                return NotFound(new { message = "Invoice not found" });

            return Ok(invoice);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllInvoices()
        {
            var invoices = await _invoiceService.GetAllInvoicesAsync();
            return Ok(invoices);
        }

        [HttpGet("vendor/{vendorId}")]
        public async Task<IActionResult> GetInvoicesByVendor(string vendorId)
        {
            var invoices = await _invoiceService.GetInvoicesByVendorAsync(vendorId);
            return Ok(invoices);
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin,vendor")]
        public async Task<IActionResult> CreateInvoice([FromBody] Invoice invoice)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdInvoice = await _invoiceService.CreateInvoiceAsync(invoice);
                return Created($"/api/invoices/{createdInvoice.Id}", new
                {
                    id = createdInvoice.Id,
                    invoiceNumber = createdInvoice.InvoiceNumber,
                    amount = createdInvoice.Amount
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin,vendor")]
        public async Task<IActionResult> UpdateInvoice(string id, [FromBody] Invoice invoice)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedInvoice = await _invoiceService.UpdateInvoiceAsync(id, invoice);
            if (updatedInvoice == null)
                return NotFound(new { message = "Invoice not found" });

            return Ok(new { message = "Invoice updated successfully" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> DeleteInvoice(string id)
        {
            var success = await _invoiceService.DeleteInvoiceAsync(id);
            if (!success)
                return NotFound(new { message = "Invoice not found" });

            return Ok(new { message = "Invoice deleted successfully" });
        }
    }
}
