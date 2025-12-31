import { useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'vendor' | 'employee' | 'superadmin' | 'admin';
  fallbackPath?: string;
}

/**
 * ProtectedRoute component to enforce role-based access control
 * Redirects to login if user doesn't have required role
 */
export function ProtectedRoute({
  children,
  requiredUserType = 'vendor',
  fallbackPath = '/login'
}: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const vendorId = localStorage.getItem('vendorId');
    const employeeEmail = localStorage.getItem('employeeEmail');
    const employeeRole = localStorage.getItem('employeeRole');
    const isReportingPerson = localStorage.getItem('isReportingPerson') === 'true';
    const normalizedRole = employeeRole ? employeeRole.toLowerCase() : '';

    // Role flags
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';
    const isSuperadmin = normalizedRole === 'superadmin';
    const isVendor = !!vendorId && !employeeEmail;
    const isEmployee = !!employeeEmail && !vendorId;

    let hasAccess = false;

    if (requiredUserType === 'vendor') {
      // Vendor pages: vendors OR admin/superadmin
      hasAccess = isVendor || isAdmin;
    } else if (requiredUserType === 'employee') {
      // Employee pages: employees OR admin/superadmin
      hasAccess = isEmployee || isAdmin;
    } else if (requiredUserType === 'superadmin') {
      // Superadmin pages: superadmin only
      hasAccess = isSuperadmin && !!employeeEmail;
    } else if (requiredUserType === 'admin') {
      // Admin pages: admin/superadmin OR reporting persons (for approvals like allowance-approvals, approval-history, leave-allotment)
      hasAccess = (isAdmin && !!employeeEmail) || (isReportingPerson && !!employeeEmail);
    }

    if (!hasAccess) {
      console.warn(
        `[ProtectedRoute] Access denied for ${requiredUserType}. Role: ${normalizedRole}, ReportingPerson: ${isReportingPerson}. Redirecting to ${fallbackPath}`
      );
      // Redirect to appropriate login page
      const lastLoginType = localStorage.getItem('lastLoginType');
      if (lastLoginType === 'vendor') {
        setLocation('/vendor-login');
      } else if (lastLoginType === 'employee') {
        setLocation('/employee-login');
      } else {
        setLocation(fallbackPath);
      }
    }
  }, [setLocation, requiredUserType, fallbackPath]);

  return <>{children}</>;
}
