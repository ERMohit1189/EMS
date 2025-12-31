import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from '@/lib/api';
import { Mail, Lock, Building2 } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

export default function VendorLogin() {
  const [email, setEmail] = useState("10018cd4e5@vendor.local");
  const [password, setPassword] = useState("2Tpvzlv1C0kC");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Load saved credentials from localStorage on mount (Remember Me feature)
  useEffect(() => {
    const savedEmail = localStorage.getItem("vendorRememberMe_email");
    const savedPassword = localStorage.getItem("vendorRememberMe_password");

    console.log("[VendorLogin] Page loaded - checking for saved credentials...");
    console.log("[VendorLogin] Saved email found:", !!savedEmail, savedEmail ? `(${savedEmail})` : "");
    console.log("[VendorLogin] Saved password found:", !!savedPassword);

    if (savedEmail && savedPassword) {
      console.log("[VendorLogin] ✅ Loading saved credentials from localStorage");
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
      console.log("[VendorLogin] ✅ Form pre-filled with saved credentials!");
    } else {
      console.log("[VendorLogin] No saved credentials found");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Login attempt to: /api/vendors/login');

      const apiUrl = `${getApiBaseUrl()}/api/vendors/login`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.message || data.error || `API Error: ${response.status} ${response.statusText}`;
        console.error('Login error:', errorMsg);
        toast({
          title: "Login Failed",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Store JWT token
      if (data.token) {
        localStorage.setItem("token", data.token);
        console.log('[VendorLogin] JWT token stored successfully');
      } else {
        console.warn('[VendorLogin] No token received from server');
      }

      // Clear any employee-related data from previous sessions
      localStorage.removeItem("employeeId");
      localStorage.removeItem("employeeEmail");
      localStorage.removeItem("employeeName");
      localStorage.removeItem("employeeRole");
      // Also clear other employee-related keys to avoid mixed session state
      localStorage.removeItem("employeeCode");
      localStorage.removeItem("employeeDepartment");
      localStorage.removeItem("employeeDesignation");
      localStorage.removeItem("employeePhoto");
      localStorage.removeItem("isReportingPerson");
      localStorage.removeItem("reportingTeamIds");
      // Remove any stored 'user' object left from previous employee login
      localStorage.removeItem("user");
      // Also clear employee Remember Me credentials to avoid showing old employee credentials
      localStorage.removeItem("rememberMe_email");
      localStorage.removeItem("rememberMe_password");

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("vendorId", data.vendor.id);
      localStorage.setItem("vendorEmail", data.vendor.email);
      localStorage.setItem("vendorName", data.vendor.name);
      localStorage.setItem("vendorCode", data.vendor.vendorCode);
      localStorage.setItem("vendorStatus", data.vendor.status);
      localStorage.setItem("vendorRole", data.vendor.role);

      // Mark current user as vendor and provide a small 'user' object used by header
      localStorage.setItem("isVendor", "true");
      try {
        localStorage.setItem('user', JSON.stringify({ email: data.vendor.email, name: data.vendor.name, role: (data.vendor.role || 'vendor') }));
      } catch (e) {
        console.warn('[VendorLogin] Failed to set user object in localStorage', e);
      }

      // Store last login type for session expiry redirect
      localStorage.setItem("lastLoginType", "vendor");

      // Save credentials to localStorage if Remember Me is checked
      console.log("[VendorLogin] Remember Me checkbox state:", rememberMe);

      if (rememberMe) {
        console.log("[VendorLogin] Saving credentials to localStorage...");
        localStorage.setItem("vendorRememberMe_email", email);
        localStorage.setItem("vendorRememberMe_password", password);
        console.log("[VendorLogin] ✅ Credentials saved successfully!");
        toast({
          title: "Success",
          description: "Login successful! Credentials saved for next time",
        });
      } else {
        console.log("[VendorLogin] Remember Me was not checked, clearing saved credentials");
        localStorage.removeItem("vendorRememberMe_email");
        localStorage.removeItem("vendorRememberMe_password");
        toast({
          title: "Success",
          description: "Login successful!",
        });
      }

      window.dispatchEvent(new Event("login"));

      setLocation("/vendor/dashboard");
    } catch (error: any) {
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
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 px-2 sm:px-4">
      <div className="w-full max-w-md flex flex-col items-center justify-center">
        {/* Header Logo Area */}
        <div className="text-center mb-2 sm:mb-3 flex-shrink-0">
          <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-2 sm:mb-3">
            <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight text-center">
            <span className="block text-xs sm:text-sm md:text-base">Vendor Portal</span>
            <span className="block text-sm sm:text-base md:text-lg">Enterprise Operations Management System</span>
          </h1>
          {/* <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Designed &amp; Developed by <a href="https://qaiinnovation.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Quantum AI Innovation</a>
          </p> */}
        </div>

        <Card className="shadow-2xl border-0 flex-shrink-0">
          <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-t-lg py-2 sm:py-3 shadow-md">
            <CardTitle className="text-lg sm:text-2xl text-blue-900">Welcome Back</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">Sign in to access your dashboard</CardDescription>
          </CardHeader>

          <CardContent className="pt-3 sm:pt-4">
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4 bg-white bg-opacity-70 p-3 sm:p-4 rounded-lg shadow-sm">
              {/* Email Field */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-semibold text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="vendor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    data-testid="input-email"
                    className="pl-9 sm:pl-10 h-9 sm:h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-semibold text-gray-700">Password</label>
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
                    className="pl-9 sm:pl-10 h-9 sm:h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 sm:gap-3 p-1 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loading}
                  data-testid="checkbox-remember-me"
                  className="h-4 w-4 border-gray-300"
                />
                <label htmlFor="remember-me" className="text-xs sm:text-sm text-gray-700 cursor-pointer flex-1">
                  Remember me for 7 days
                </label>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right -mt-1">
                <Link href="/vendor/forgot-password" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-semibold" data-testid="link-forgot-password">
                  Forgot Password?
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-9 sm:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
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
                Designed &amp; Developed by <a href="https://qaiinnovation.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Quantum AI Innovation</a>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-2 sm:mt-3 w-full flex justify-between items-center px-1 sm:px-2 flex-shrink-0 flex-nowrap">
          <p className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">
            Don't have account?{" "}
            <Link href="/vendor-signup" className="text-blue-600 hover:text-blue-800 font-semibold" data-testid="link-signup">
              Sign Up
            </Link>
          </p>
          <Link href="/vendor/privacy-policy" className="text-[10px] sm:text-xs text-gray-600 hover:text-gray-900 underline whitespace-nowrap ml-1" data-testid="link-privacy-policy">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
