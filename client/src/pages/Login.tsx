import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail } from 'lucide-react';
import logo from '@assets/generated_images/abstract_geometric_logo_for_ems_portal.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Clear all non-superadmin session data when login page loads
  useEffect(() => {
    // Clear vendor session data
    localStorage.removeItem('vendorId');
    localStorage.removeItem('vendorEmail');
    localStorage.removeItem('vendorName');
    localStorage.removeItem('vendorCode');
    
    // Clear employee session data
    localStorage.removeItem('employeeId');
    localStorage.removeItem('employeeEmail');
    localStorage.removeItem('employeeName');
    localStorage.removeItem('employeeRole');
    localStorage.removeItem('employeeDepartment');
    localStorage.removeItem('employeeDesignation');
    
    // Clear user data
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!email || !password) {
        toast({
          title: 'Error',
          description: 'Please enter email and password',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({
          title: 'Error',
          description: 'Please enter a valid email',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Superadmin validation - only allow superadmin role
      const superadminEmail = 'admin@ems.com';
      const superadminPassword = 'password';
      
      if (email !== superadminEmail || password !== superadminPassword) {
        // Clear any lingering session data on failed login
        localStorage.removeItem('vendorId');
        localStorage.removeItem('vendorEmail');
        localStorage.removeItem('vendorName');
        localStorage.removeItem('vendorCode');
        localStorage.removeItem('employeeId');
        localStorage.removeItem('employeeEmail');
        localStorage.removeItem('employeeName');
        localStorage.removeItem('employeeRole');
        localStorage.removeItem('employeeDepartment');
        localStorage.removeItem('employeeDesignation');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        
        toast({
          title: 'Error',
          description: 'Invalid credentials. Only superadmin can access this portal.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Store login info in localStorage
      const userData = { email, name: 'Superadmin', role: 'superadmin' };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('employeeRole', 'superadmin');

      toast({
        title: 'Success',
        description: 'Logged in as Superadmin',
      });

      // Dispatch login event to App component
      window.dispatchEvent(new Event('login'));

      // Redirect to dashboard
      setTimeout(() => {
        setLocation('/');
      }, 100);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center pb-4">
          <div className="flex justify-center">
            <img src={logo} alt="EMS Logo" className="h-16 w-16 rounded-lg shadow-md" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-gray-900">EMS Portal</CardTitle>
            <CardDescription className="text-base mt-2">Enterprise Management System</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@ems.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
