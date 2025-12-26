import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from '@/lib/api';
import { Mail, Lock, HardHat } from "lucide-react";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Load saved credentials on mount (Remember Me feature)
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberMe_email");
    const savedPassword = localStorage.getItem("rememberMe_password");

    console.log("[EmployeeLogin] Page loaded - checking for saved credentials...");
    console.log("[EmployeeLogin] Saved email found:", !!savedEmail, savedEmail ? `(${savedEmail})` : "");
    console.log("[EmployeeLogin] Saved password found:", !!savedPassword);

    if (savedEmail && savedPassword) {
      console.log("[EmployeeLogin] ✅ Loading saved credentials from localStorage");
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
      console.log("[EmployeeLogin] ✅ Form pre-filled with saved credentials!");
    } else {
      console.log("[EmployeeLogin] No saved credentials found");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Start timing
    const loginStartTime = performance.now();
    console.log('='.repeat(60));
    console.log(`[LOGIN TIMER] 🔐 Login button clicked at: ${new Date().toLocaleTimeString()}.${Date.now() % 1000}`);
    console.log(`[LOGIN TIMER] Starting login process...`);
    console.log('='.repeat(60));

    try {
      console.log('[EmployeeLogin] Login attempt to: /api/auth/login');
      console.log('[EmployeeLogin] Email:', email);

      const fetchStartTime = performance.now();
      const apiUrl = `${getApiBaseUrl()}/api/auth/login`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const fetchEndTime = performance.now();
      const fetchDuration = ((fetchEndTime - fetchStartTime) / 1000).toFixed(3);

      console.log(`[LOGIN TIMER] ⏱️  API call completed in: ${fetchDuration} seconds`);
      console.log('[EmployeeLogin] Response status:', response.status);
      console.log('[EmployeeLogin] Response ok:', response.ok);

      const data = await response.json();
      console.log('[EmployeeLogin] Response data:', data);

      if (!response.ok || !data.success) {
        const errorMsg = data.message || data.error || `Login failed: ${response.status} ${response.statusText}`;
        console.error('[EmployeeLogin] Error:', errorMsg);
        toast({
          title: "Login Failed",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      if (!data.user) {
        console.error('[EmployeeLogin] No user data in response');
        toast({
          title: "Login Failed",
          description: "No user data received from server",
          variant: "destructive",
        });
        return;
      }

      console.log('User data:', data.user);
      console.log('[EmployeeLogin] Role from API:', data.user.role);

      // Clear ANY and ALL vendor-related data from previous sessions to prevent conflicts
      console.log('[EmployeeLogin] Clearing all vendor data from localStorage...');
      localStorage.removeItem("vendorId");
      localStorage.removeItem("vendorName");
      localStorage.removeItem("vendorCode");
      localStorage.removeItem("vendorEmail");
      localStorage.removeItem("vendorPhone");
      localStorage.removeItem("vendorGst");
      localStorage.removeItem("vendorPan");
      localStorage.removeItem("isVendor");
      console.log('[EmployeeLogin] ✅ All vendor data cleared');

      // Normalize role to lowercase to prevent case-sensitivity issues
      const normalizedRole = (data.user.role || "user").toLowerCase().trim();

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("employeeId", data.user.id);
      localStorage.setItem("employeeEmail", data.user.email);
      localStorage.setItem("employeeName", data.user.name);
      localStorage.setItem("employeeCode", data.user.empCode || data.user.id);
      localStorage.setItem("employeeRole", normalizedRole);
      localStorage.setItem("employeeDepartment", data.user.department || "Not Assigned");
      localStorage.setItem("employeeDesignation", data.user.designation || "Not Specified");
      // Cache-bust the photo URL so the header reflects updated uploads immediately
      const addCacheBuster = (url: string) => {
        if (!url) return '';
        try {
          const u = new URL(url, window.location.origin);
          u.searchParams.set('v', String(Date.now()));
          return u.toString();
        } catch (e) {
          const sep = url.includes('?') ? '&' : '?';
          return `${url}${sep}v=${Date.now()}`;
        }
      };
      localStorage.setItem("employeePhoto", addCacheBuster(data.user.photo || ""));
      const isRPValue = data.user.isReportingPerson ? "true" : "false";
      localStorage.setItem("isReportingPerson", isRPValue);
      // Also store reporting team ids for client-side convenience
      try {
        localStorage.setItem('reportingTeamIds', JSON.stringify(data.user.reportingTeamIds || []));
      } catch (e) {
        console.warn('Failed to store reportingTeamIds in localStorage', e);
      }

      // Store last login type for session expiry redirect
      localStorage.setItem("lastLoginType", "employee");

      // CRITICAL: Set browserSessionId to mark this as an active session
      // This prevents App.tsx from treating page refresh as a new browser session
      const browserSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('browserSessionId', browserSessionId);
      console.log('[EmployeeLogin] Browser session ID set:', browserSessionId);

      console.log('[EmployeeLogin] Raw role from API:', data.user.role);
      console.log('[EmployeeLogin] Normalized and stored employeeRole:', normalizedRole);
      console.log('[EmployeeLogin] Stored isReportingPerson:', isRPValue);
      console.log('[EmployeeLogin] localStorage.getItem("isReportingPerson"):', localStorage.getItem("isReportingPerson"));

      console.log('localStorage after login:', {
        department: localStorage.getItem("employeeDepartment"),
        designation: localStorage.getItem("employeeDesignation")
      });

      // Save credentials to localStorage if Remember Me is checked
      console.log("[EmployeeLogin] Remember Me checkbox state:", rememberMe);
      
      if (rememberMe) {
        console.log("[EmployeeLogin] Saving credentials to localStorage...");
        localStorage.setItem("rememberMe_email", email);
        localStorage.setItem("rememberMe_password", password);
        console.log("[EmployeeLogin] ✅ Credentials saved successfully!");
        console.log("[EmployeeLogin] Saved email:", localStorage.getItem("rememberMe_email"));
        console.log("[EmployeeLogin] Saved password:", localStorage.getItem("rememberMe_password") ? "***[HIDDEN]***" : "NOT SAVED");
        toast({
          title: "Success",
          description: "Login successful! Credentials saved for next time",
        });
      } else {
        console.log("[EmployeeLogin] Remember Me was not checked, clearing saved credentials");
        localStorage.removeItem("rememberMe_email");
        localStorage.removeItem("rememberMe_password");
        toast({
          title: "Success",
          description: "Login successful!",
        });
      }

      window.dispatchEvent(new Event("login"));

      // Small delay to ensure session is fully established
      setTimeout(() => {
        const loginEndTime = performance.now();
        const totalDuration = ((loginEndTime - loginStartTime) / 1000).toFixed(3);
        console.log('='.repeat(60));
        console.log(`[LOGIN TIMER] ✅ Total login time: ${totalDuration} seconds`);
        console.log(`[LOGIN TIMER] Login completed at: ${new Date().toLocaleTimeString()}.${Date.now() % 1000}`);
        console.log('='.repeat(60));

        // SuperAdmin should go to main dashboard (/), but Admin and User go to employee dashboard
        if (normalizedRole === 'superadmin') {
          console.log(`[EmployeeLogin] SuperAdmin role detected - redirecting to /dashboard`);
          setLocation("/");
        } else {
          console.log(`[EmployeeLogin] Admin or User role detected - redirecting to /employee/dashboard`);
          setLocation("/employee/dashboard");
        }
      }, 100);
    } catch (error: any) {
      const loginEndTime = performance.now();
      const totalDuration = ((loginEndTime - loginStartTime) / 1000).toFixed(3);
      console.log('='.repeat(60));
      console.log(`[LOGIN TIMER] ❌ Login failed after: ${totalDuration} seconds`);
      console.log(`[LOGIN TIMER] Error: ${error.message}`);
      console.log('='.repeat(60));
      
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 px-2 sm:px-4">
      <div className="w-full max-w-md flex flex-col items-center justify-center">
        {/* Header Logo Area */}
        <div className="text-center mb-2 sm:mb-3 flex-shrink-0">
          <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-2 sm:mb-3">
            <HardHat className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight text-center">
            <span className="block text-xs sm:text-sm md:text-base">Employee Portal</span>
            <span className="block text-sm sm:text-base md:text-lg">Enterprise Operations Management System</span>
          </h1>
          {/* <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Designed &amp; Developed by <a href="https://qaiinnovation.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Quantum AI Innovation</a>
          </p> */}
        </div>

        <Card className="shadow-2xl border-0 flex-shrink-0">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-t-lg py-2 sm:py-3 shadow-md">
            <CardTitle className="text-lg sm:text-2xl text-green-900">Welcome Back</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">Sign in to access your dashboard</CardDescription>
          </CardHeader>

          <CardContent className="pt-3 sm:pt-4">
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4 bg-white bg-opacity-70 p-3 sm:p-4 rounded-lg shadow-sm">
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="employee@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      data-testid="input-email"
                      className="pl-9 sm:pl-10 h-9 sm:h-11 text-sm border-gray-300 focus:border-green-500 focus:ring-green-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      data-testid="input-password"
                      className="pl-9 sm:pl-10 h-9 sm:h-11 text-sm border-gray-300 focus:border-green-500 focus:ring-green-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2 sm:gap-3 p-1 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => {
                      setRememberMe(checked as boolean);
                    }}
                    disabled={loading}
                    data-testid="checkbox-remember-me"
                    className="h-4 w-4 border-gray-300"
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-xs sm:text-sm text-gray-700 cursor-pointer flex-1"
                  >
                    Remember me for 7 days
                  </label>
                </div>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-9 sm:h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Logging in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>

              {/* Footer Info */}
              <p className="text-xs text-center text-gray-500 mt-0.5">
                Protected by enterprise-grade security. Your data is encrypted and secure.
              </p>
              <p className="text-xs text-center text-gray-500 mt-0">
                Design and Developed by <a href="https://qaiinnovation.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Quantum AI Innovation</a>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Bottom Links */}
        <div className="mt-2 sm:mt-3 w-full flex justify-between items-center px-1 sm:px-2 flex-shrink-0 flex-nowrap">
          {/* <p className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">
            Don't have account?{" "}
            <Link href="/employee-signup" className="text-green-600 hover:text-green-800 font-semibold">
              Sign Up
            </Link>
          </p> */}
          <Link
            href="/employee/privacy-policy"
            className="text-[10px] sm:text-xs text-gray-600 hover:text-gray-900 underline transition-colors whitespace-nowrap ml-1"
            data-testid="link-privacy-policy"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );

}
