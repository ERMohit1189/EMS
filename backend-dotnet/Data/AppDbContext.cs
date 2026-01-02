using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<AuthAuditLog> AuthAuditLogs { get; set; } = null!;
        // Employee Management
        public DbSet<Employee> Employees { get; set; } = null!;
        public DbSet<Department> Departments { get; set; } = null!;
        public DbSet<Designation> Designations { get; set; } = null!;

        // Vendor Management
        public DbSet<Vendor> Vendors { get; set; } = null!;
        public DbSet<VendorRate> VendorRates { get; set; } = null!;
        public DbSet<VendorPasswordOtp> VendorPasswordOtps { get; set; } = null!;

        // Site Management
        public DbSet<Site> Sites { get; set; } = null!;
        public DbSet<Zone> Zones { get; set; } = null!;
        public DbSet<Circle> Circles { get; set; } = null!;

        // Purchase Orders & Invoices
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; } = null!;
        public DbSet<PurchaseOrderLine> PurchaseOrderLines { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;

        // Attendance & Leave
        public DbSet<Attendance> Attendances { get; set; } = null!;
        public DbSet<LeaveRequest> LeaveRequests { get; set; } = null!;
        public DbSet<LeaveAllotment> LeaveAllotments { get; set; } = null!;

        // Salary & Payroll
        public DbSet<SalaryStructure> SalaryStructures { get; set; } = null!;
        public DbSet<GeneratedSalary> GeneratedSalaries { get; set; } = null!;
        public DbSet<PaymentMaster> PaymentMasters { get; set; } = null!;
        public DbSet<Holiday> Holidays { get; set; } = null!;

        // Allowances
        public DbSet<DailyAllowance> DailyAllowances { get; set; } = null!;

        // Teams
        public DbSet<Team> Teams { get; set; } = null!;
        public DbSet<TeamMember> TeamMembers { get; set; } = null!;

        // Note: PaymentMaster also accessible via Set<PaymentMaster>()

        // Session Management (deprecated - using JWT tokens instead)
        // public DbSet<SessionRow> Sessions { get; set; } = null!;

        // Export Settings
        public DbSet<ExportHeader> ExportHeaders { get; set; } = null!;

        // Application Settings
        public DbSet<AppSettings> AppSettings { get; set; } = null!;

        // Report Templates
        public DbSet<ReportTemplate> ReportTemplates { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Employee relationships
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Designation)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DesignationId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure Vendor relationships
            modelBuilder.Entity<Site>()
                .HasOne(s => s.Vendor)
                .WithMany(v => v.Sites)
                .HasForeignKey(s => s.VendorId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Site>()
                .HasOne(s => s.Zone)
                .WithMany(z => z.Sites)
                .HasForeignKey(s => s.ZoneId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure PurchaseOrder relationships
            modelBuilder.Entity<PurchaseOrder>()
                .HasOne(po => po.Vendor)
                .WithMany(v => v.PurchaseOrders)
                .HasForeignKey(po => po.VendorId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseOrderLine>()
                .HasOne(pol => pol.PurchaseOrder)
                .WithMany(po => po.Lines)
                .HasForeignKey(pol => pol.PoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseOrderLine>()
                .HasOne(pol => pol.Site)
                .WithMany(s => s.PurchaseOrderLines)
                .HasForeignKey(pol => pol.SiteId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Invoice relationships
            modelBuilder.Entity<Invoice>()
                .HasOne(i => i.Vendor)
                .WithMany(v => v.Invoices)
                .HasForeignKey(i => i.VendorId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Attendance relationships
            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Employee)
                .WithMany(e => e.Attendances)
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure LeaveRequest relationships
            modelBuilder.Entity<LeaveRequest>()
                .HasOne(lr => lr.Employee)
                .WithMany(e => e.LeaveRequests)
                .HasForeignKey(lr => lr.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure LeaveAllotment relationships
            modelBuilder.Entity<LeaveAllotment>()
                .HasOne(la => la.Employee)
                .WithMany(e => e.LeaveAllotments)
                .HasForeignKey(la => la.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure SalaryStructure relationships
            modelBuilder.Entity<SalaryStructure>()
                .HasOne(ss => ss.Employee)
                .WithMany(e => e.SalaryStructures)
                .HasForeignKey(ss => ss.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure PaymentMaster relationships
            modelBuilder.Entity<PaymentMaster>()
                .HasOne(pm => pm.Site)
                .WithMany(s => s.PaymentMasters)
                .HasForeignKey(pm => pm.SiteId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<PaymentMaster>()
                .HasOne(pm => pm.Vendor)
                .WithMany(v => v.PaymentMasters)
                .HasForeignKey(pm => pm.VendorId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure VendorRate relationships
            modelBuilder.Entity<VendorRate>()
                .HasOne(vr => vr.Vendor)
                .WithMany(v => v.VendorRates)
                .HasForeignKey(vr => vr.VendorId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure VendorPasswordOtp relationships
            modelBuilder.Entity<VendorPasswordOtp>()
                .HasOne(vpo => vpo.Vendor)
                .WithMany(v => v.PasswordOtps)
                .HasForeignKey(vpo => vpo.VendorId)
                .OnDelete(DeleteBehavior.Cascade);

            // Create indexes
            modelBuilder.Entity<Employee>()
                .HasIndex(e => e.Email)
                .IsUnique();

            modelBuilder.Entity<Employee>()
                .HasIndex(e => e.EmpCode)
                .IsUnique();

            modelBuilder.Entity<Employee>()
                .HasIndex(e => e.Mobile)
                .IsUnique();

            modelBuilder.Entity<Vendor>()
                .HasIndex(v => v.Email)
                .IsUnique();

            modelBuilder.Entity<Vendor>()
                .HasIndex(v => v.VendorCode)
                .IsUnique();

            modelBuilder.Entity<Vendor>()
                .HasIndex(v => v.Mobile)
                .IsUnique();

            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.EmployeeId, a.Month, a.Year })
                .IsUnique();

            modelBuilder.Entity<LeaveAllotment>()
                .HasIndex(la => new { la.EmployeeId, la.Year })
                .IsUnique();

            modelBuilder.Entity<SalaryStructure>()
                .HasIndex(ss => new { ss.EmployeeId, ss.Month, ss.Year })
                .IsUnique();

            modelBuilder.Entity<Holiday>()
                .HasIndex(h => h.Name)
                .IsUnique();

            modelBuilder.Entity<PurchaseOrder>()
                .HasIndex(po => po.PoNumber)
                .IsUnique();

            // Team relationships
            modelBuilder.Entity<TeamMember>()
                .HasOne(tm => tm.Team)
                .WithMany(t => t.Members)
                .HasForeignKey(tm => tm.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Team>()
                .HasIndex(t => t.Name);


            modelBuilder.Entity<Invoice>()
                .HasIndex(i => i.InvoiceNumber)
                .IsUnique();

            modelBuilder.Entity<Site>()
                .HasIndex(s => new { s.VendorId, s.Name });

            // Configure DailyAllowance relationships
            modelBuilder.Entity<DailyAllowance>()
                .HasOne(da => da.Employee)
                .WithMany(e => e.DailyAllowances)
                .HasForeignKey(da => da.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DailyAllowance>()
                .HasOne(da => da.Team)
                .WithMany(t => t.DailyAllowances)
                .HasForeignKey(da => da.TeamId)
                .OnDelete(DeleteBehavior.NoAction);

            // Create indexes for DailyAllowance
            modelBuilder.Entity<DailyAllowance>()
                .HasIndex(da => da.ApprovalStatus);

            modelBuilder.Entity<DailyAllowance>()
                .HasIndex(da => da.TeamId);

            modelBuilder.Entity<DailyAllowance>()
                .HasIndex(da => da.ApprovalCount);

            modelBuilder.Entity<DailyAllowance>()
                .HasIndex(da => da.PaidStatus);

            // Configure AuthAuditLog entity
            var authAuditLogBuilder = modelBuilder.Entity<AuthAuditLog>();
            authAuditLogBuilder.ToTable("AuthAuditLogs");
            authAuditLogBuilder.Property(aal => aal.Id).HasColumnName("Id");
            authAuditLogBuilder.Property(aal => aal.EventType).HasColumnName("EventType");
            authAuditLogBuilder.Property(aal => aal.Path).HasColumnName("Path");
            authAuditLogBuilder.Property(aal => aal.QueryString).HasColumnName("QueryString");
            authAuditLogBuilder.Property(aal => aal.Method).HasColumnName("Method");
            authAuditLogBuilder.Property(aal => aal.UserId).HasColumnName("UserId");
            authAuditLogBuilder.Property(aal => aal.UserName).HasColumnName("UserName");
            authAuditLogBuilder.Property(aal => aal.Email).HasColumnName("Email");
            authAuditLogBuilder.Property(aal => aal.IsAuthenticated).HasColumnName("IsAuthenticated");
            authAuditLogBuilder.Property(aal => aal.Roles).HasColumnName("Roles");
            authAuditLogBuilder.Property(aal => aal.Claims).HasColumnName("Claims");
            authAuditLogBuilder.Property(aal => aal.IpAddress).HasColumnName("IpAddress");
            authAuditLogBuilder.Property(aal => aal.UserAgent).HasColumnName("UserAgent");
            authAuditLogBuilder.Property(aal => aal.UserType).HasColumnName("UserType");
            authAuditLogBuilder.Property(aal => aal.AuthStatus).HasColumnName("AuthStatus");
            authAuditLogBuilder.Property(aal => aal.FailureReason).HasColumnName("FailureReason");
            authAuditLogBuilder.Property(aal => aal.CreatedAt).HasColumnName("CreatedAt");

            // Configure DailyAllowance properties - mark as not database-generated to work with triggers
            var dailyAllowanceBuilder = modelBuilder.Entity<DailyAllowance>();
            dailyAllowanceBuilder.Property(da => da.Id).ValueGeneratedNever();
            dailyAllowanceBuilder.Property(da => da.SubmittedAt).ValueGeneratedNever();
            dailyAllowanceBuilder.Property(da => da.CreatedAt).ValueGeneratedNever();
            dailyAllowanceBuilder.Property(da => da.UpdatedAt).ValueGeneratedNever();

            // Configure ExportHeader table mapping with column names
            var exportHeaderBuilder = modelBuilder.Entity<ExportHeader>()
                .ToTable("export_headers");

            exportHeaderBuilder.Property(e => e.Id).HasColumnName("id");
            exportHeaderBuilder.Property(e => e.CompanyName).HasColumnName("company_name");
            exportHeaderBuilder.Property(e => e.ReportTitle).HasColumnName("report_title");
            exportHeaderBuilder.Property(e => e.FooterText).HasColumnName("footer_text");
            exportHeaderBuilder.Property(e => e.ContactPhone).HasColumnName("contact_phone");
            exportHeaderBuilder.Property(e => e.ContactEmail).HasColumnName("contact_email");
            exportHeaderBuilder.Property(e => e.Website).HasColumnName("website");
            exportHeaderBuilder.Property(e => e.Gstin).HasColumnName("gstin");
            exportHeaderBuilder.Property(e => e.Address).HasColumnName("address");
            exportHeaderBuilder.Property(e => e.State).HasColumnName("state");
            exportHeaderBuilder.Property(e => e.City).HasColumnName("city");
            exportHeaderBuilder.Property(e => e.ShowGeneratedDate).HasColumnName("show_generated_date");
            exportHeaderBuilder.Property(e => e.CreatedAt).HasColumnName("created_at");
            exportHeaderBuilder.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            // Configure UpdatedAt to be automatically set on updates
            exportHeaderBuilder.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate();

            // Configure AppSettings table mapping with column names
            var appSettingsBuilder = modelBuilder.Entity<AppSettings>()
                .ToTable("app_settings");

            appSettingsBuilder.Property(a => a.Id).HasColumnName("id");
            appSettingsBuilder.Property(a => a.ApprovalsRequiredForAllowance).HasColumnName("approvals_required_for_allowance");
            appSettingsBuilder.Property(a => a.PoGenerationDate).HasColumnName("po_generation_date");
            appSettingsBuilder.Property(a => a.InvoiceGenerationDate).HasColumnName("invoice_generation_date");
            appSettingsBuilder.Property(a => a.SmtpHost).HasColumnName("smtp_host");
            appSettingsBuilder.Property(a => a.SmtpPort).HasColumnName("smtp_port");
            appSettingsBuilder.Property(a => a.SmtpUser).HasColumnName("smtp_user");
            appSettingsBuilder.Property(a => a.SmtpPass).HasColumnName("smtp_pass");
            appSettingsBuilder.Property(a => a.SmtpSecure).HasColumnName("smtp_secure");
            appSettingsBuilder.Property(a => a.FromEmail).HasColumnName("from_email");
            appSettingsBuilder.Property(a => a.FromName).HasColumnName("from_name");
            appSettingsBuilder.Property(a => a.LetterheadImage).HasColumnName("letterhead_image");
            appSettingsBuilder.Property(a => a.ApplyLetterheadToPO).HasColumnName("apply_letterhead_to_po");
            appSettingsBuilder.Property(a => a.ApplyLetterheadToInvoice).HasColumnName("apply_letterhead_to_invoice");
            appSettingsBuilder.Property(a => a.ApplyLetterheadToSalarySlip).HasColumnName("apply_letterhead_to_salary_slip");
            appSettingsBuilder.Property(a => a.CreatedAt).HasColumnName("created_at");
            appSettingsBuilder.Property(a => a.UpdatedAt).HasColumnName("updated_at");

            // Configure UpdatedAt to be automatically set on updates
            appSettingsBuilder.Property(a => a.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate();
        }
    }

    public class SessionRow
    {
        [Key]
        public string Sid { get; set; } = string.Empty;

        [Required]
        public string Data { get; set; } = string.Empty;

        public DateTime? ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}