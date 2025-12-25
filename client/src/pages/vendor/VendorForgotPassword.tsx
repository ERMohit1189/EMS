import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { Mail, Building2, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function VendorForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email'|'otp'|'reset'|'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Send OTP to email
  const sendOtp = async () => {
    if (!email) return toast({ title: 'Error', description: 'Enter your email', variant: 'destructive' });
    setLoading(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/vendors/request-reset-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const js = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(js?.error || js?.message || 'Failed to send OTP');
      toast({ title: 'OTP Sent', description: 'Check your email for the OTP' });
      setStep('otp');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send OTP', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // Verify OTP only
  const verifyOtp = async () => {
    if (!email || !otp) return toast({ title: 'Error', description: 'Enter email and OTP', variant: 'destructive' });
    setLoading(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/vendors/validate-reset-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp })
      });
      const js = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(js?.error || js?.message || 'Invalid OTP');
      toast({ title: 'OTP Verified', description: 'You can now set a new password' });
      setStep('reset');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Invalid OTP', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // Set new password (finalize reset)
  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
    if (newPassword !== confirmPassword) return toast({ title: 'Error', description: "Passwords don't match", variant: 'destructive' });
    setLoading(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/vendors/verify-reset-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, newPassword })
      });
      const js = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(js?.error || js?.message || 'Failed to reset password');
      toast({ title: 'Success', description: 'Password reset successfully' });
      setStep('success');
      setTimeout(() => setLocation('/vendor-login'), 2000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Reset failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4">
        <Card className="max-w-md shadow-2xl border-0">
          <CardContent className="pt-12 pb-6 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Successful</h2>
            <p className="text-gray-600 mb-6">Your password has been reset. Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Portal</h1>
          <p className="text-sm text-gray-600 mt-2">Reset Your Password</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b">
            <CardTitle className="text-2xl text-blue-900">Forgot Password</CardTitle>
            <CardDescription className="text-gray-600">{step === 'email' ? 'Enter your registered email' : step === 'otp' ? 'Enter the OTP sent to your email' : 'Set a new password'}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {step === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input className="pl-10 h-11" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} placeholder="vendor@example.com" />
                  </div>
                </div>

                <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600" onClick={sendOtp} disabled={loading}> {loading ? 'Sending...' : 'Send OTP' } </Button>

                <div className="mt-6 text-center border-t pt-4">
                  <p className="text-sm text-gray-600">Remember your password? <Link href="/vendor-login" className="text-blue-600 hover:text-blue-800 font-semibold">Sign In</Link></p>
                </div>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">OTP <span className="text-red-500">*</span></label>
                  <Input className="h-11 mt-2" value={otp} onChange={e => setOtp(e.target.value)} disabled={loading} placeholder="Enter 6-digit code" />
                </div>

                <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600" onClick={verifyOtp} disabled={loading}> {loading ? 'Verifying...' : 'Verify OTP' } </Button>

                <div className="mt-2 text-center">
                  <button className="text-sm text-gray-600 hover:text-blue-700" onClick={() => setStep('email')}>Send to a different email</button>
                </div>
              </div>
            )}

            {step === 'reset' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">New Password <span className="text-red-500">*</span></label>
                  <Input className="h-11 mt-2" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={loading} placeholder="Enter new password" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Confirm Password <span className="text-red-500">*</span></label>
                  <Input className="h-11 mt-2" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} placeholder="Confirm password" />
                </div>

                <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600" onClick={resetPassword} disabled={loading}> {loading ? 'Resetting...' : 'Reset Password' } </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
