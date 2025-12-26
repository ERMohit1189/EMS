import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

// Check if employee management is hidden in production
const isDev = import.meta.env.DEV;
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  HardHat,
  Wallet,
  ClipboardCheck,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Upload,
  Key,
  ChevronDown,
  Calendar,
  UsersRound,
  Receipt,
  Circle,
  Mail,
} from "lucide-react";
import logo from "@assets/generated_images/abstract_geometric_logo_for_ems_portal.png";

interface SidebarProps {
  isLoggedIn?: boolean;
  setIsLoggedIn?: (value: boolean) => void;
}

const adminMenuGroups = [
  {
    group: "Dashboard",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
      },
    ],
  },
   {
    group: "My Work Space",
    items: [
      {
        title: "My Profile",
        icon: Users,
        href: "/employee/my-profile",
      },
      {
        title: "Mark Attendance",
        icon: Calendar,
        href: "/employee/attendance",
      },
      {
        title: "Apply Leave",
        icon: Calendar,
        href: "/employee/leave-apply",
      },
      {
        title: "Leave History",
        icon: FileText,
        href: "/employee/leave-history",
      },
        {
        title: "My Salary Structure",
        icon: BarChart3,
        href: "/employee/salary",
      },
      {
        title: "Salary History",
        icon: FileText,
        href: "/employee/salary-history",
      },
      {
        title: "My Allowances",
        icon: Wallet,
        href: "/employee/allowances",
      },
      {
        title: "Change Password",
        icon: Key,
        href: "/employee/change-password",
      },
    ],
  }, 
    {
    group: "Vendor Management",
    items: [
      {
        title: "All Vendors",
        icon: Users,
        href: "/vendor/list",
      },
      {
        title: "Register Vendor",
        icon: Users,
        href: "/vendor/register",
      },
      {
        title: "Vendor Rates",
        icon: Wallet,
        href: "/vendor/rates",
      },
      {
        title: "Vendor Credentials",
        icon: Key,
        href: "/vendor/credentials",
      },
      {
        title: "Circle Master",
        icon: Circle,
        href: "/vendor/circle-master",
      },
    ],
  },
  {
    group: "Site Management",
    items: [
      {
        title: "Site List",
        icon: Building2,
        href: "/vendor/sites",
      },
      {
        title: "Site Status",
        icon: ClipboardCheck,
        href: "/vendor/sites/status",
      },
      {
        title: "Excel Upload",
        icon: Upload,
        href: "/vendor/excel-import",
      },
    ],
  },
  {
    group: "Vendor Transactions",
    items: [
      {
        title: "PO Generation",
        icon: FileText,
        href: "/vendor/po",
      },
      {
        title: "Invoice Generation",
        icon: Receipt,
        href: "/vendor/invoices",
      },
      {
        title: "Payment Master",
        icon: Wallet,
        href: "/vendor/payment-master",
      },
    ],
  },
  {
    group: "Employee Management",
    items: [
      {
        title: "All Employees",
        icon: HardHat,
        href: "/employee/list",
      },
      {
        title: "Register Employee",
        icon: Users,
        href: "/employee/register",
      },
      {
        title: "Employee Credentials",
        icon: Key,
        href: "/employee/credentials",
      },
      {
        title: "Teams",
        icon: UsersRound,
        href: "/admin/teams",
      },
      {
        title: "Department Master",
        icon: Building2,
        href: "/employee/department-master",
      },
      {
        title: "Designation Master",
        icon: FileText,
        href: "/employee/designation-master",
      },
    ],
  },
  {
    group: "Attendance & Leave",
    items: [
      {
        title: "Holiday Master",
        icon: Calendar,
        href: "/admin/holiday-master",
      },
      {
        title: "Leave Allotment",
        icon: Calendar,
        href: "/admin/leave-allotment",
      },
      {
        title: "Monthly Attendance",
        icon: Calendar,
        href: "/employee/monthly-attendance",
      },
      {
        title: "Bulk Attendance",
        icon: Users,
        href: "/admin/bulk-attendance",
      },
      {
        title: "Attendance Report",
        icon: FileText,
        href: "/admin/attendance-report",
      },
    ],
  },
  {
    group: "Payroll & Salary",
  items: [
      {
        title: "Salary Structure",
        icon: BarChart3,
        href: "/employee/salary-structure",
      },
      {
        title: "Generate Salaries",
        icon: BarChart3,
        href: "/admin/salary-generation",
      },
      {
        title: "Month wise Salary Report",
        icon: FileText,
        href: "/admin/salary-reports",
      },
      {
        title: "Employee wise Salary Report",
        icon: FileText,
        href: "/employee/salary-report",
      },
    ],
  },
  {
    group: "Allowances & Approvals",
    items: [     
      {
        title: "Allowance Approvals",
        icon: ClipboardCheck,
        href: "/admin/allowance-approvals",
      },
      {
        title: "Leave Approvals",
        icon: ClipboardCheck,
        href: "/employee/leave-approvals",
      },
      {
        title: "Approval History",
        icon: BarChart3,
        href: "/admin/approval-history",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        title: "Export Headers",
        icon: Upload,
        href: "/export-settings",
      },
      {
        title: "App Settings",
        icon: SettingsIcon,
        href: "/settings",
      },
      {
        title: "Email Settings",
        icon: Mail,
        href: "/admin/email-settings",
      },
    ],
  },
  {
    group: "Help & Docs",
    items: [
      {
        title: "Help Center",
        icon: FileText,
        href: "/help",
      },
    ],
  },
];

const userEmployeeMenuGroups = [
  {
    group: "My Dashboard",
    items: [
      {
        title: "My Profile",
        icon: Users,
        href: "/employee/my-profile",
      },
    ],
  },
  {
    group: "Attendance",
    items: [
      {
        title: "Mark Attendance",
        icon: Calendar,
        href: "/employee/attendance",
      },
      {
        title: "Apply Leave",
        icon: Calendar,
        href: "/employee/leave-apply",
      },
      {
        title: "Leave Approvals",
        icon: ClipboardCheck,
        href: "/employee/leave-approvals",
      },
    ],
  },
  {
    group: "Salary & Benefits",
    items: [
      {
        title: "My Salary Structure",
        icon: BarChart3,
        href: "/employee/salary",
      },
      {
        title: "Salary History",
        icon: FileText,
        href: "/employee/salary-history",
      },
      {
        title: "My Allowances",
        icon: Wallet,
        href: "/employee/allowances",
      },
    ],
  },
  {
    group: "Approvals",
    items: [
      {
        title: "Allowance Approvals",
        icon: ClipboardCheck,
        href: "/admin/allowance-approvals",
      },
      {
        title: "Approval History",
        icon: BarChart3,
        href: "/admin/approval-history",
      },
    ],
  },
  {
    group: "Leave Management",
    items: [
      {
        title: "Leave Allotment",
        icon: Calendar,
        href: "/admin/leave-allotment",
        adminOnly: true,
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        title: "Change Password",
        icon: Key,
        href: "/employee/change-password",
      },
    ],
  },
  {
    group: "Help & Docs",
    items: [
      {
        title: "Help Center",
        icon: FileText,
        href: "/help",
      },
    ],
  },
];

const employeeAdminMenuGroups = [
  {
    group: "My Dashboard",
    items: [
      {
        title: "My Profile",
        icon: Users,
        href: "/employee/my-profile",
      },
    ],
  },
  {
    group: "My Attendance",
    items: [
      {
        title: "Mark Attendance",
        icon: Calendar,
        href: "/employee/attendance",
      },
      {
        title: "Monthly Attendance",
        icon: Calendar,
        href: "/employee/monthly-attendance",
      },
      {
        title: "Apply Leave",
        icon: Calendar,
        href: "/employee/leave-apply",
      },
      {
        title: "Leave History",
        icon: FileText,
        href: "/employee/leave-history",
      },
      {
        title: "Leave Approvals",
        icon: ClipboardCheck,
        href: "/employee/leave-approvals",
      },
    ],
  },
  {
    group: "My Salary",
    items: [
      {
        title: "My Salary Structure",
        icon: BarChart3,
        href: "/employee/salary-structure",
      },
      {
        title: "Salary Report",
        icon: FileText,
        href: "/employee/salary-report",
      },
      {
        title: "My Allowances",
        icon: Wallet,
        href: "/employee/allowances",
      },
    ],
  },
  {
    group: "Employee Management",
    items: [
      {
        title: "All Employees",
        icon: HardHat,
        href: "/employee/list",
      },
      {
        title: "Register Employee",
        icon: Users,
        href: "/employee/register",
      },
      {
        title: "Employee Credentials",
        icon: Key,
        href: "/employee/credentials",
      },
      {
        title: "Teams",
        icon: UsersRound,
        href: "/admin/teams",
      },
    ],
  },
  {
    group: "Attendance & Leave",
    items: [
      {
        title: "Holiday Master",
        icon: Calendar,
        href: "/admin/holiday-master",
      },
      {
        title: "Leave Allotment",
        icon: Calendar,
        href: "/admin/leave-allotment",
      },
      {
        title: "Monthly Attendance",
        icon: Calendar,
        href: "/employee/monthly-attendance",
      },
      {
        title: "Bulk Attendance",
        icon: Users,
        href: "/admin/bulk-attendance",
      },
      {
        title: "Attendance Report",
        icon: FileText,
        href: "/admin/attendance-report",
      },
    ],
  },
  {
    group: "Payroll",
    items: [
      {
        title: "My Salary Structure",
        icon: BarChart3,
        href: "/employee/salary-structure",
      },
      {
        title: "Employee Salary",
        icon: BarChart3,
        href: "/employee/salary",
      },
      {
        title: "Salary Report",
        icon: FileText,
        href: "/employee/salary-report",
      },
      {
        title: "Salary History",
        icon: FileText,
        href: "/employee/salary-history",
      },
      {
        title: "Generate Salaries",
        icon: BarChart3,
        href: "/admin/salary-generation",
      },
      {
        title: "Salary Reports",
        icon: FileText,
        href: "/admin/salary-reports",
      },
    ],
  },
  {
    group: "Approvals",
    items: [
      {
        title: "Allowance Approvals",
        icon: ClipboardCheck,
        href: "/admin/allowance-approvals",
      },
      {
        title: "Approval History",
        icon: BarChart3,
        href: "/admin/approval-history",
      },
    ],
  },
  {
    group: "Masters",
    items: [
      {
        title: "Department Master",
        icon: Building2,
        href: "/employee/department-master",
      },
      {
        title: "Designation Master",
        icon: FileText,
        href: "/employee/designation-master",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        title: "Change Password",
        icon: Key,
        href: "/employee/change-password",
      },
    ],
  },
];

const vendorMenuGroups = [
  {
    group: "Dashboard",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/vendor/dashboard",
      },
    ],
  },
  {
    group: "My Profile",
    items: [
      {
        title: "My Profile",
        icon: Users,
        href: "/vendor/profile",
      },
    ],
  },
  {
    group: "Purchase & Invoice",
    items: [
      {
        title: "PO Generation",
        icon: FileText,
        href: "/vendor/po",
      },
      {
        title: "Invoice Generation",
        icon: Receipt,
        href: "/vendor/invoices",
      },
    ],
  },
  {
    group: "Reports",
    items: [
      {
        title: "PO Report",
        icon: FileText,
        href: "/reports/vendor-po",
      },
      {
        title: "Invoice Report",
        icon: Receipt,
        href: "/reports/vendor-invoice",
      },
      {
        title: "Site Report",
        icon: Building2,
        href: "/reports/vendor-site",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        title: "Change Password",
        icon: Key,
        href: "/vendor/change-password",
      },
    ],
  },
  {
    group: "Help & Docs",
    items: [
      {
        title: "Help Center",
        icon: FileText,
        href: "/help",
      },
    ],
  },
];

export function Sidebar({ isLoggedIn, setIsLoggedIn }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [sessionInfo, setSessionInfo] = useState<any | null>(null);

  // Check if user is logged in as employee or vendor (use localStorage directly)
  // Note: Frontend stores auth state in localStorage after login, so we trust localStorage over /api/session
  const storedIsEmployee =
    typeof window !== "undefined" && localStorage.getItem("employeeId") !== null;
  const storedIsVendor =
    typeof window !== "undefined" && localStorage.getItem("vendorId") !== null;
  const storedEmployeeRole =
    typeof window !== "undefined" ? localStorage.getItem("employeeRole") : null;

  // For superadmin, admin, and user roles: ALL are employees
  // Use localStorage directly since it's source of truth after login
  let isEmployee = storedIsEmployee;
  let isVendor = storedIsVendor;

  // IMPORTANT: Employee and Vendor should be mutually exclusive
  // If both are true (due to session/localStorage conflict), prioritize employee
  if (isEmployee && isVendor) {
    console.warn('[Sidebar] ⚠️ CONFLICT: Both isEmployee and isVendor are true! Prioritizing employee status.');
    isVendor = false;  // Force vendor to false when there's a conflict
  }

  const employeeRole = (storedEmployeeRole || "")?.toLowerCase()?.trim();

  // Debug logging
  console.log('[Sidebar] Role Debug:', {
    storedEmployeeRole,
    sessionEmployeeRole: sessionInfo?.employeeRole,
    finalEmployeeRole: employeeRole,
    isEmployee,
    isVendor,
    conflict: (sessionInfo?.isEmployee ?? storedIsEmployee) && (sessionInfo?.isVendor ?? storedIsVendor)
  });

  const isUserEmployee = isEmployee && employeeRole === "user";
  const isEmployeeAdmin = isEmployee && employeeRole === "admin";
  const isSuperAdmin = isEmployee && employeeRole === "superadmin";

  console.log('[Sidebar] Role Flags:', {
    isUserEmployee,
    isEmployeeAdmin,
    isSuperAdmin
  });
  // Prefer session-based reporting status; fall back to localStorage for older sessions
  const isReportingPerson = (sessionInfo && typeof sessionInfo.isReportingPerson !== 'undefined')
    ? Boolean(sessionInfo.isReportingPerson)
    : (typeof window !== "undefined" ? localStorage.getItem("isReportingPerson") === "true" : false);

  // Memoize menuGroups to prevent infinite loop
  const menuGroups = useMemo(() => {
    if (isVendor) {
      return vendorMenuGroups;
    }

    // SuperAdmin gets full admin menu, but hide 'My Work Space' group
    if (isSuperAdmin) {
      return adminMenuGroups.filter((g) => g.group !== 'My Work Space');
    }

    // Employee with admin role gets most admin menus; restrict some superadmin-only items
    if (isEmployeeAdmin) {
      // Create a shallow copy and remove Email Settings from Settings group for non-superadmin admins
      const filtered = adminMenuGroups.map((g) => {
        if (g.group === 'Settings') {
          return { ...g, items: g.items.filter((it: any) => it.href !== '/admin/email-settings') };
        }
        return g;
      });
      return filtered;
    }

    // Regular user employee gets limited menu
    let groups = userEmployeeMenuGroups;

    // Only keep Approvals group if the user is a reporting person
    if (!isReportingPerson) {
      groups = groups.filter((group) => group.group !== "Approvals");
    }

    // Only show Leave Management to admins
    if (employeeRole !== 'admin') {
      groups = groups.filter((group) => group.group !== "Leave Management");
    }

    // Decide visibility for Leave Approvals link: show to admins or reporting persons
    const showLeaveApprovalsLink = (isEmployeeAdmin || isReportingPerson);
    if (!showLeaveApprovalsLink) {
      // Remove Leave Approvals item from Attendance & My Attendance groups for non-approvers
      groups = groups.map((g) => {
        if (g.group === 'Attendance' || g.group === 'My Attendance') {
          return { ...g, items: g.items.filter((it: any) => it.title !== 'Leave Approvals') };
        }
        return g;
      });
    }

    // Ensure reporting persons can see the Leave Approvals link inside the Attendance groups
    // This makes the link available to regular users who are reporting persons (not just admins)
    if (isReportingPerson && isEmployee) {
      groups = groups.map((g) => {
        if ((g.group === 'Attendance' || g.group === 'My Attendance') && Array.isArray(g.items)) {
          const exists = g.items.some((it: any) => it.href === '/employee/leave-approvals');
          if (!exists) {
            return { ...g, items: [...g.items, { title: 'Leave Approvals', icon: ClipboardCheck, href: '/employee/leave-approvals' }] };
          }
        }
        return g;
      });
    }

    // If logged-in user is a regular user and a reporting person, use the /user path for allowance approvals
    if (isUserEmployee && isReportingPerson) {
      groups = groups.map((g) => {
        if (!Array.isArray(g.items)) return g;
        return {
          ...g,
          items: g.items.map((it: any) => it.href === '/admin/allowance-approvals' ? { ...it, href: '/user/allowance-approvals' } : it),
        };
      });
    }

    return groups;
  }, [isVendor, isUserEmployee, isEmployeeAdmin, isSuperAdmin, isReportingPerson, employeeRole]);

  // Debug: show computed menu groups in console to help diagnose missing items
  console.debug('[Sidebar] computed menuGroups for user:', menuGroups);

  // Initialize expanded groups based on menu groups - collapsed by default
  useEffect(() => {
    // Load session info from server (override localStorage if present)
    const loadSessionInfo = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/session`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setSessionInfo(json);
        }
      } catch (err) {
        // ignore - fallback to localStorage
      }
    };
    loadSessionInfo();
    const initialExpandedGroups: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      // For user employees and employee admins, auto-expand My Dashboard on initial load
      // All others collapsed by default
      initialExpandedGroups[group.group] = 
        ((isUserEmployee || isEmployeeAdmin) && group.group === "My Dashboard") ? true : false;
    });
    setExpandedGroups(initialExpandedGroups);
  }, [isVendor, isUserEmployee, isEmployeeAdmin, isReportingPerson, isEmployee]);

  // Pending approvals count for approvers (displayed as a badge in the sidebar)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pulseActive, setPulseActive] = useState<boolean>(false);
  const prevPendingCountRef = useRef<number>(0);
  const pulseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPending = async () => {
      try {
        // Only fetch pending approvals for employees who are reporting persons or admins
        if (!isEmployee || !(isReportingPerson || isEmployeeAdmin)) return;

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/leaves/pending`, { credentials: 'include' });

        // If unauthenticated or server returned HTML (login page/error), avoid parsing as JSON
        if (!res.ok) {
          console.debug('[Sidebar] pending leaves fetch returned non-ok status', res.status);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.debug('[Sidebar] pending leaves endpoint returned non-JSON response, skipping', contentType);
          return;
        }

        let data: any = null;
        try {
          data = await res.json();
        } catch (parseErr) {
          console.debug('[Sidebar] failed to parse pending leaves JSON, skipping', parseErr);
          return;
        }

        const count = Array.isArray(data) ? data.length : 0;

        // If the count increased since last time, trigger pulse
        const prev = prevPendingCountRef.current || 0;
        if (!cancelled && count > prev) {
          setPulseActive(true);
          // clear any existing timeout
          if (pulseTimeoutRef.current) {
            clearTimeout(pulseTimeoutRef.current);
          }
          pulseTimeoutRef.current = window.setTimeout(() => {
            setPulseActive(false);
            pulseTimeoutRef.current = null;
          }, 3000);
        }

        prevPendingCountRef.current = count;
        if (!cancelled) setPendingApprovalsCount(count);
      } catch (e) {
        console.error('[Sidebar] failed to fetch pending leaves', e);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 60 * 1000); // refresh every minute
    return () => {
      cancelled = true;
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
        pulseTimeoutRef.current = null;
      }
      clearInterval(interval);
    };
  }, [isEmployee, sessionInfo]);

  // Auto-expand/collapse groups based on current route
  useEffect(() => {
    const getGroupForRoute = (route: string): string | null => {
      // Route mapping is now handled by role-based logic below
      if (isVendor) {
        // For vendor users
        if (route.startsWith("/reports")) return "Reports";
        if (route.startsWith("/vendor/dashboard")) return "Dashboard";
        if (route.startsWith("/vendor/profile")) return "My Profile";
        if (route.startsWith("/vendor/change-password")) return "Settings";
        if (route.startsWith("/vendor/po") || route.startsWith("/vendor/invoices")) return "Purchase & Invoice";
        return "Dashboard";
      } else if (isEmployeeAdmin) {
        // For employee admins

        // My Work Space routes (personal pages) - CHECK FIRST before other routes
        if (
          route.startsWith("/employee/my-profile") ||
          route.startsWith("/employee/attendance") ||
          // Match the exact salary page or its subroutes, but do NOT match salary-structure
          (route === "/employee/salary" || route.startsWith("/employee/salary/")) ||
          route.startsWith("/employee/salary-history") ||
          route.startsWith("/employee/allowances") ||
          route.startsWith("/employee/change-password")
        )
          return "My Work Space";

        // Handle monthly attendance as part of admin Attendance & Leave group instead of My Work Space
        if (route.startsWith("/employee/monthly-attendance")) return "Attendance & Leave";

        if (route.startsWith("/settings")) return "Settings";

        // Employee Management routes
        if (
          route.startsWith("/employee/list") ||
          route.startsWith("/employee/register") ||
          route.startsWith("/employee/credentials") ||
          route.startsWith("/admin/teams")
        )
          return "Employee Management";

        // Attendance & Leave routes (admin functions)
        if (
          route.startsWith("/admin/holiday-master") ||
          route.startsWith("/admin/leave-allotment") ||
          route.startsWith("/admin/attendance-report")
        )
          return "Attendance & Leave";

        // Payroll routes (admin salary management - not personal)
        if (route.startsWith("/admin/salary-generation"))
          return "Payroll & Salary";

        // Approvals routes
        if (route.startsWith("/employee/leave-approvals"))
          return "Allowances & Approvals";

        if (
          route.startsWith("/admin/allowance-approvals") ||
          route.startsWith("/user/allowance-approvals") ||
          route.startsWith("/admin/approval-history")
        )
          return "Approvals";

        // Masters routes
        if (
          route.startsWith("/employee/department-master") ||
          route.startsWith("/employee/designation-master")
        )
          return "Masters";

        // My Dashboard routes
        if (route.startsWith("/employee/dashboard"))
          return "My Dashboard";

        return "My Dashboard";
      } else if (isUserEmployee) {
        // For user employees
        if (route.startsWith("/settings") || route.startsWith("/employee/change-password"))
          return "Settings";
        if (
          route.startsWith("/admin/allowance-approvals") ||
          route.startsWith("/user/allowance-approvals") ||
          route.startsWith("/admin/approval-history")
        )
          return "Approvals";

        // My Dashboard
        if (route.startsWith("/employee/dashboard") || route.startsWith("/employee/my-profile"))
          return "My Dashboard";

        // Attendance
        if (
          route.startsWith("/employee/attendance") ||
          route.startsWith("/employee/monthly-attendance")
        )
          return "Attendance";

        // Salary & Benefits - check for /employee/salary (not /employee/salary-structure)
        if (
          (route === "/employee/salary" || route.startsWith("/employee/salary/")) ||
          route.startsWith("/employee/allowances")
        )
          return "Salary & Benefits";

        // Leave Management
        if (route.startsWith("/employee/leave"))
          return "Leave Management";

        if (route.startsWith("/employee")) return "My Dashboard";
        return "My Dashboard";
      } else {
        // For admin employees - check more specific routes first
        if (route === "/") return "Dashboard";
        
        // Settings routes
        if (route.startsWith("/settings") || route.includes("export-headers") || route.includes("export-settings"))
          return "Settings";
        
        // Masters routes
        if (
          route.startsWith("/employee/department-master") ||
          route.startsWith("/employee/designation-master")
        )
          return "Masters";
        
        // Allowances & Approvals routes
        if (
          route.startsWith("/admin/allowance-approvals") ||
          route.startsWith("/user/allowance-approvals") ||
          route.startsWith("/admin/approval-history")
        )
          return "Allowances & Approvals";
        
        // My Work Space routes (personal pages) - CHECK FIRST before other routes
        if (
          route.startsWith("/employee/my-profile") ||
          route.startsWith("/employee/attendance") ||
          route.startsWith("/employee/change-password")
        )
          return "My Work Space";

        // Treat monthly attendance as part of Attendance group for admins (prevent auto-expanding My Work Space)
        if (route.startsWith("/employee/monthly-attendance")) return "Attendance & Leave";

        // Payroll & Salary routes - check before general /employee routes
        if (
          route.startsWith("/employee/salary-structure") ||
          route.startsWith("/employee/salary") ||
          route.startsWith("/employee/salary-history") ||
          route.startsWith("/employee/allowances")
        )
          return "Payroll & Salary";

        // Vendor Transactions routes
        if (
          route.startsWith("/vendor/payment-master") ||
          route.startsWith("/vendor/po") ||
          route.startsWith("/vendor/invoices")
        )
          return "Vendor Transactions";

        // Attendance & Leave routes for admin functions
        if (
          route.startsWith("/admin/holiday-master") ||
          route.startsWith("/admin/leave-allotment") ||
          route.startsWith("/admin/attendance-report")
        )
          return "Attendance & Leave";

        // Employee Management routes
        if (
          route.startsWith("/employee/list") ||
          route.startsWith("/employee/register") ||
          route.startsWith("/employee/credentials") ||
          route.startsWith("/admin/teams")
        )
          return "Employee Management";

        // Site Management routes - check BEFORE general /vendor routes
        if (
          route.startsWith("/vendor/sites") ||
          route.startsWith("/vendor/excel-import")
        ) {
          return "Site Management";
        }

        // Vendor Management routes
        if (route.startsWith("/vendor")) {
          return "Vendor Management";
        }

        return null;
      }
    };

    const activeGroup = getGroupForRoute(location);

    setExpandedGroups((prev) => {
      const newExpandedGroups: Record<string, boolean> = { ...prev };
      menuGroups.forEach((group) => {
        // Always expand the group for the current route
        if (group.group === activeGroup) {
          newExpandedGroups[group.group] = true;
        } else if ((isUserEmployee || isEmployeeAdmin) && group.group === "My Dashboard") {
          newExpandedGroups[group.group] = true;
        }
      });
      return newExpandedGroups;
    });
    // Listen for external requests to ensure a group is expanded (used by in-app tour)
    const ensureHandler = (e: any) => {
      try {
        const groups: string[] = e?.detail?.groups || [];
        if (!Array.isArray(groups) || groups.length === 0) return;
        setExpandedGroups((prev) => {
          const next = { ...prev };
          groups.forEach(g => { next[g] = true; });
          return next;
        });
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('ensure-sidebar-groups', ensureHandler as EventListener);
    return () => window.removeEventListener('ensure-sidebar-groups', ensureHandler as EventListener);
  }, [location, menuGroups, isVendor, isEmployee, isUserEmployee, isEmployeeAdmin]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newExpanded = { ...prev, [groupName]: !prev[groupName] };

      // If the group was just expanded, navigate to its first item's href (useful for groups like "Attendance & Leave" -> "Holiday Master")
      if (newExpanded[groupName]) {
        const group = menuGroups.find((g) => g.group === groupName);
        if (group && group.items && group.items.length > 0) {
          const firstHref = group.items[0].href;
          if (firstHref && firstHref !== location) {
            setLocation(firstHref);
          }
        }
      }

      return newExpanded;
    });
  };

  const handleLogout = () => {
    console.log("[Sidebar] Logout clicked");
    // Dispatch logout event to App component
    window.dispatchEvent(new Event("logout"));
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <img src={logo} alt="EOMS Logo" className="h-8 w-8 rounded-sm" />
        <span className="text-lg font-bold tracking-tight">EOMS Portal</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-2 px-2">
          {/* Employee Dashboard Link - Only for Regular Employees (not superadmin or admin) */}
          {isUserEmployee && (
            <div className="mb-4 pb-4 border-b border-sidebar-border">
              <Link href="/employee/dashboard">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-green-500 hover:text-white cursor-pointer",
                    location === "/employee/dashboard" || location === "/"
                      ? "bg-green-600 text-white shadow-md"
                      : "bg-green-400 text-white shadow-sm",
                  )}
                  data-testid="link-employee-dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My Dashboard
                </div>
              </Link>
            </div>
          )}

          {/* Vendor Dashboard Link - Only for Vendor Users */}
          {isVendor && (
            <div className="mb-4 pb-4 border-b border-sidebar-border">
              <Link href="/vendor/dashboard">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-blue-500 hover:text-white cursor-pointer",
                    location === "/vendor/dashboard" || location === "/"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-blue-400 text-white shadow-sm",
                  )}
                  data-testid="link-vendor-dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </div>
              </Link>
            </div>
          )}

          {menuGroups.filter(g => g.group !== 'Help & Docs').map((group, groupIndex) => (
            <div key={groupIndex}>
              <button
                onClick={() => toggleGroup(group.group)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider hover:text-sidebar-foreground/90 transition-colors"
              >
                <span>{group.group}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    expandedGroups[group.group] ? "rotate-0" : "-rotate-90",
                  )}
                />
              </button>
              {expandedGroups[group.group] && (
                <div className="grid gap-1 mt-1">
                  {group.items && group.items.length > 0 ? (
                    group.items.map((item, itemIndex) => (
                      <Link key={itemIndex} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                            location === item.href
                              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                              : "text-sidebar-foreground/70",
                          )}
                          data-testid={`nav-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            {item.title}
                          </div>

                          {/* Show pending approvals badge for Leave Approvals menu */}
                          {item.href === '/employee/leave-approvals' && pendingApprovalsCount > 0 && (
                            <span title={`${pendingApprovalsCount} pending approvals`} className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold ${pulseActive ? 'animate-pulse ring-2 ring-red-300' : ''}`}>
                              {pendingApprovalsCount}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted">No options available</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4 space-y-2"></div>
    </div>
  );
}
