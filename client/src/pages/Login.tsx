import { useState } from 'react';
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

      // Store login info in localStorage
      const userData = { email, name: email.split('@')[0] };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');

      toast({
        title: 'Success',
        description: 'Logged in successfully',
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

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-900 mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-amber-800">
                <p>Email: <span className="font-mono bg-white px-2 py-1 rounded">admin@ems.com</span></p>
                <p>Password: <span className="font-mono bg-white px-2 py-1 rounded">password</span></p>
              </div>
              <p className="text-xs text-amber-700 mt-2">Use any email and password to login</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
