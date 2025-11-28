import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Load saved credentials from cookies on mount
  useEffect(() => {
    const cookiesEnabled = localStorage.getItem("useCredentialsCookies") === "true";
    if (cookiesEnabled) {
      const cookies = document.cookie.split("; ");
      const savedCredsCookie = cookies.find(cookie => cookie.startsWith("employeeLoginCredentials="));
      
      if (savedCredsCookie) {
        try {
          const credsJson = decodeURIComponent(savedCredsCookie.substring("employeeLoginCredentials=".length));
          const creds = JSON.parse(credsJson);
          setEmail(creds.email || "");
          setPassword(creds.password || "");
          setRememberMe(true);
        } catch (error) {
          console.error("Failed to load saved credentials:", error);
        }
      }
    }
  }, []);

  const setCookie = (name: string, value: string, days: number = 7) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Strict`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("employeeId", data.employee.id);
      localStorage.setItem("employeeEmail", data.employee.email);
      localStorage.setItem("employeeName", data.employee.name);

      // Save credentials to cookies if Remember Me is checked and cookies are enabled
      const cookiesEnabled = localStorage.getItem("useCredentialsCookies") === "true";
      if (rememberMe && cookiesEnabled) {
        setCookie(
          "employeeLoginCredentials",
          JSON.stringify({ email, password }),
          7
        );
        toast({
          title: "Success",
          description: "Login successful! Credentials saved to cookies",
        });
      } else {
        toast({
          title: "Success",
          description: "Login successful!",
        });
      }

      window.dispatchEvent(new Event("login"));
      setLocation("/");
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Employee Login</CardTitle>
          <CardDescription>Sign in with your email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email (Username)</label>
              <Input
                type="email"
                placeholder="employee@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                data-testid="input-password"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
                data-testid="checkbox-remember-me"
              />
              <label htmlFor="remember-me" className="text-sm cursor-pointer">
                Remember me (requires cookies to be enabled)
              </label>
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
