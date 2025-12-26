using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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
        public DbSet<PaymentMaster> PaymentMasters { get; set; } = null!;
        public DbSet<Holiday> Holidays { get; set; } = null!;

        // Note: PaymentMaster also accessible via Set<PaymentMaster>()

        // Session Management
        public DbSet<SessionRow> Sessions { get; set; } = null!;

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

            modelBuilder.Entity<Invoice>()
                .HasIndex(i => i.InvoiceNumber)
                .IsUnique();

            modelBuilder.Entity<Site>()
                .HasIndex(s => new { s.VendorId, s.Name });
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