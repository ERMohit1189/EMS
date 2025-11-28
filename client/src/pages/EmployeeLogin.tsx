import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Mail, Lock, HardHat } from "lucide-react";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Load saved credentials and check login status on mount
  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const empName = localStorage.getItem("employeeName");
    
    if (loggedIn && empName) {
      setIsLoggedIn(true);
      setEmployeeName(empName);
      console.log("[EmployeeLogin] Employee already logged in:", empName);
    }
    
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

  const handleLogout = () => {
    console.log("[EmployeeLogin] ========== LOGOUT INITIATED ==========");
    console.log("[EmployeeLogin] Logout button clicked by:", employeeName);
    console.log("[EmployeeLogin] Current time:", new Date().toLocaleString());
    console.log("[EmployeeLogin] Action: Session termination");
    console.log("[EmployeeLogin] Redirect destination: /employee-login");
    console.log("[EmployeeLogin] Remember Me credentials: PRESERVED");
    console.log("[EmployeeLogin] ==========================================");
    
    toast({
      title: "Logged Out Successfully ✓",
      description: "Redirecting to Employee Login Page...",
    });
    
    // Dispatch logout event to App component to handle everything
    window.dispatchEvent(new Event('logout'));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = `${getApiBaseUrl()}/api/employees/login`;
      console.log('Login attempt to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        const errorMsg = data.error || `API Error: ${response.status} ${response.statusText}`;
        console.error('Login error:', errorMsg);
        toast({
          title: "Login Failed",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      console.log('Employee data:', data.employee);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("employeeId", data.employee.id);
      localStorage.setItem("employeeEmail", data.employee.email);
      localStorage.setItem("employeeName", data.employee.name);
      localStorage.setItem("employeeDepartment", data.employee.department || "Not Assigned");
      localStorage.setItem("employeeDesignation", data.employee.designation || "Not Specified");
      
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
      setLocation("/employee/dashboard");
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 p-4">
      <div className="w-full max-w-md">
        {/* Header Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-4">
            <HardHat className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Portal</h1>
          <p className="text-sm text-gray-600 mt-2">Enterprise Management System</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b">
            {isLoggedIn ? (
              <>
                <CardTitle className="text-2xl text-green-900">Welcome, {employeeName}!</CardTitle>
                <CardDescription className="text-gray-600">You are currently logged in</CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl text-green-900">Welcome Back</CardTitle>
                <CardDescription className="text-gray-600">Sign in to access your dashboard</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {isLoggedIn ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-gray-700 mb-4">
                    You are logged in as <strong>{employeeName}</strong>
                  </p>
                  <Button
                    onClick={() => setLocation("/employee/dashboard")}
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all mb-3"
                    data-testid="button-go-to-dashboard"
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    onClick={handleLogout}
                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                    data-testid="button-logout"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="employee@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    data-testid="input-email"
                    className="pl-10 h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    data-testid="input-password"
                    className="pl-10 h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
                <label htmlFor="remember-me" className="text-sm text-gray-700 cursor-pointer flex-1">
                  Remember me for 7 days
                </label>
              </div>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Footer Info */}
              <p className="text-xs text-center text-gray-500 mt-4">
                Protected by enterprise-grade security. Your data is encrypted and secure.
              </p>
            </form>
            )}
          </CardContent>
        </Card>

        {/* Privacy Policy Link */}
        <div className="text-center mt-6">
          <Link href="/employee/privacy-policy" className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors" data-testid="link-privacy-policy">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
