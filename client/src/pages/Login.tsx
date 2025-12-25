import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Lock, Mail } from "lucide-react";
import logo from "@assets/generated_images/abstract_geometric_logo_for_ems_portal.png";

import { Footer } from "@/components/layout/Footer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Optionally disable this login page via env (VITE_DISABLE_LOGIN=true) or via localStorage (disableLogin=true)
  const disableLogin = import.meta.env.VITE_DISABLE_LOGIN === 'true' || localStorage.getItem('disableLogin') === 'true';
  if (disableLogin) {
    // Render a 404-like response when login is disabled
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-6">
          <h1 className="text-3xl font-bold mb-2">404 — Not Found</h1>
          <p className="text-muted-foreground mb-4">This login page is disabled.</p>
        </div>
      </div>
    );
  }

  // Clear all non-superadmin session data when login page loads
  useEffect(() => {
    // Clear vendor session data
    localStorage.removeItem("vendorId");
    localStorage.removeItem("vendorEmail");
    localStorage.removeItem("vendorName");
    localStorage.removeItem("vendorCode");

    // Clear employee session data
    localStorage.removeItem("employeeId");
    localStorage.removeItem("employeeEmail");
    localStorage.removeItem("employeeName");
    localStorage.removeItem("employeeRole");
    localStorage.removeItem("employeeDepartment");
    localStorage.removeItem("employeeDesignation");

    // Clear user data
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!email || !password) {
        toast({
          title: "Error",
          description: "Please enter email and password",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const apiUrl = `${getApiBaseUrl()}/api/admin/login`;
      console.log("[superadmin] Login attempt to:", apiUrl);
      console.log("[superadmin] Email:", email);
      // Call backend admin login API - validates credentials against database
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();
      console.log("[Login] API Response:", data);

      if (!response.ok) {
        console.log("[Login] Login failed - response not ok");
        toast({
          title: "Error",
          description: data.error || "Login failed",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("[Login] Before storing - response data:", data);

      // Store login info in localStorage
      try {
        // Helper to add a short cache-busting query param so replacing the same filename shows immediately
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

        const photoUrl = addCacheBuster(data.employee.photo || '');

        const userData = {
          email: data.employee.email,
          name: data.employee.name,
          role: data.employee.role,
          photo: photoUrl
        };
        console.log("[Login] Storing userData:", userData);

        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("employeeRole", data.employee.role);
        localStorage.setItem("employeeId", data.employee.id);
        localStorage.setItem("employeeEmail", data.employee.email);
        localStorage.setItem("employeeName", data.employee.name);
        localStorage.setItem("employeeCode", data.employee.emp_code || data.employee.id);
        localStorage.setItem("employeePhoto", photoUrl);

        // Store last login type for session expiry redirect
        localStorage.setItem("lastLoginType", "admin");

        // CRITICAL: Set browserSessionId to mark this as an active session
        // This prevents App.tsx from treating page refresh as a new browser session
        const browserSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('browserSessionId', browserSessionId);
        console.log('[Login] Browser session ID set:', browserSessionId);

        console.log("[Login] ✅ All stored successfully");
        console.log("[Login] Verification - what we stored:", {
          employeeName: localStorage.getItem("employeeName"),
          employeeRole: localStorage.getItem("employeeRole"),
          employeeId: localStorage.getItem("employeeId"),
          isLoggedIn: localStorage.getItem("isLoggedIn"),
        });
      } catch (storageError) {
        console.error("[Login] ❌ Storage error:", storageError);
        toast({
          title: "Error",
          description: "Failed to store login data",
          variant: "destructive",
        });
        return;
      }

      // Clear any saved last location to prevent redirecting to old vendor/employee dashboards
      sessionStorage.removeItem("lastValidLocation");

      toast({
        title: "Success",
        description: `Logged in as ${data.employee.name}`,
      });

      // Dispatch login event to App component - trigger header update
      console.log("[Login] Dispatching login event...");
      window.dispatchEvent(new Event("login"));

      // Give event listeners time to process the login event
      setTimeout(() => {
        console.log("[Login] Redirecting to dashboard...");
        setLocation("/");
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-2 sm:px-4">
      <div className="w-full max-w-md flex flex-col items-center justify-center">
        <Card className="shadow-2xl border-0 w-full">
          <CardHeader className="space-y-2 sm:space-y-4 text-center pb-3 sm:pb-4">
            <div className="flex justify-center">
              <img
                src={logo}
                alt="EOMS Logo"
                className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg shadow-md"
              />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                Enterprise Operations Management System (EOMS)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
                Designed &amp; Developed by <a href="https://qaiinnovation.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Quantum AI Innovation</a>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-3 sm:pt-4">
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4 bg-white bg-opacity-70 p-3 sm:p-4 rounded-lg shadow-sm">
              {/* Email Field */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="superadmin@eoms.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 sm:h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 sm:h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                  disabled={loading}
                />
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-9 sm:h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : "Login"}
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
      </div>
    </div>
  );
}
