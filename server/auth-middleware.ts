import { Request, Response, NextFunction } from "express";

/**
 * Authentication middleware to protect routes
 * Checks if user has a valid session (employee or vendor)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const isEmployeeLoggedIn = req.session?.employeeId && req.session?.employeeEmail;
  const isVendorLoggedIn = req.session?.vendorId && req.session?.vendorEmail;

  console.log('[Auth] requireAuth check:', {
    path: req.path,
    method: req.method,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    employeeId: req.session?.employeeId ? req.session.employeeId : 'missing',
    vendorId: req.session?.vendorId ? req.session.vendorId : 'missing',
    cookies: req.headers.cookie ? 'present' : 'missing'
  });

  if (!isEmployeeLoggedIn && !isVendorLoggedIn) {
    console.log('[Auth] Authentication failed - no valid session');
    return res.status(401).json({ 
      error: "Authentication required",
      message: "You must be logged in to access this resource"
    });
  }

  console.log('[Auth] Authentication successful');
  next();
}

/**
 * Employee-only authentication middleware
 * Ensures only employees can access the route
 */
export function requireEmployeeAuth(req: Request, res: Response, next: NextFunction) {
  console.log('[Auth] requireEmployeeAuth check:', {
    path: req.path,
    method: req.method,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    employeeId: req.session?.employeeId ? req.session.employeeId : 'missing',
    employeeEmail: req.session?.employeeEmail ? req.session.employeeEmail : 'missing',
    cookies: req.headers.cookie ? 'present' : 'missing'
  });

  if (!req.session?.employeeId || !req.session?.employeeEmail) {
    console.log('[Auth] Employee authentication failed - no valid session');
    return res.status(401).json({ 
      error: "Employee authentication required",
      message: "You must be logged in as an employee to access this resource"
    });
  }

  console.log('[Auth] Employee authentication successful');
  next();
}

/**
 * Vendor-only authentication middleware
 * Ensures only vendors can access the route
 */
export function requireVendorAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.vendorId || !req.session?.vendorEmail) {
    return res.status(401).json({ 
      error: "Vendor authentication required",
      message: "You must be logged in as a vendor to access this resource"
    });
  }

  next();
}

/**
 * Admin or Superadmin authentication middleware
 * Ensures only admin or superadmin employees can access the route
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  console.log('[Auth] requireAdminAuth check:', {
    path: req.path,
    method: req.method,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    employeeId: req.session?.employeeId ? req.session.employeeId : 'missing',
    employeeEmail: req.session?.employeeEmail ? req.session.employeeEmail : 'missing',
    employeeRole: (req.session as any)?.employeeRole || 'missing',
    cookies: req.headers.cookie ? 'present' : 'missing'
  });

  if (!req.session?.employeeId || !req.session?.employeeEmail) {
    console.log('[Auth] Admin authentication failed - no valid session');
    return res.status(401).json({ 
      error: "Admin authentication required",
      message: "You must be logged in as an admin or superadmin to access this resource"
    });
  }

  // Check if employee has admin or superadmin role
  const role = (req.session as any).employeeRole?.toLowerCase();
  if (role !== 'admin' && role !== 'superadmin') {
    console.log('[Auth] Admin authorization failed - insufficient permissions. Role:', role);
    return res.status(403).json({ 
      error: "Admin authorization required",
      message: "You must have admin or superadmin privileges to access this resource"
    });
  }

  console.log('[Auth] Admin authentication successful. Role:', role);
  next();
}

/**
 * Superadmin-only authentication middleware
 * Ensures only superadmin employees can access the route
 */
export function requireSuperadminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.employeeId || !req.session?.employeeEmail) {
    return res.status(401).json({ 
      error: "Authentication required",
      message: "You must be logged in as a superadmin to access this resource"
    });
  }
  const role = (req.session as any).employeeRole || '';
  if (typeof role !== 'string' || role.toLowerCase() !== 'superadmin') {
    console.log('[Auth] Superadmin authorization failed - role:', role);
    return res.status(403).json({
      error: 'Superadmin authorization required',
      message: 'You must be a superadmin to access this resource'
    });
  }

  console.log('[Auth] Superadmin authorized:', req.session?.employeeId);
  next();
}

/**
 * Session validation endpoint
 * Returns current session status
 */
export function checkSession(req: Request, res: Response) {
  const isEmployeeLoggedIn = !!(req.session?.employeeId && req.session?.employeeEmail);
  const isVendorLoggedIn = !!(req.session?.vendorId && req.session?.vendorEmail);

  console.log('[checkSession] Session check:', {
    isEmployeeLoggedIn,
    isVendorLoggedIn,
    employeeId: req.session?.employeeId,
    vendorId: req.session?.vendorId,
    sessionExists: !!req.session
  });

  if (isEmployeeLoggedIn) {
    return res.json({
      authenticated: true,
      userType: 'employee',
      employeeId: req.session.employeeId,
      employeeEmail: req.session.employeeEmail,
      employeeRole: req.session.employeeRole || 'user',
      employeeName: req.session.employeeName
    });
  }

  if (isVendorLoggedIn) {
    return res.json({
      authenticated: true,
      userType: 'vendor',
      vendorId: req.session.vendorId,
      vendorEmail: req.session.vendorEmail,
      vendorName: req.session.vendorName
    });
  }

  return res.json({
    authenticated: false
  });
}
