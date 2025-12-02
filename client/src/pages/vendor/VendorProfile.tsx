import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import { IndianStates, getCitiesByState } from '@/assets/india-data';
import { getApiBaseUrl } from '@/lib/api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const vendorProfileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().optional().or(z.literal('')),
  country: z.string().default('India'),
  aadhar: z.string().optional().or(z.literal('')),
  pan: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  category: z.enum(['Individual', 'Company']),
});

export default function VendorProfile() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [cities, setCities] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof vendorProfileSchema>>({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: {
      name: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      aadhar: '',
      pan: '',
      gstin: '',
      category: 'Individual',
    },
  });

  useEffect(() => {
    const id = localStorage.getItem('vendorId');
    if (!id) {
      setLocation('/vendor-login');
      return;
    }
    setVendorId(id);
    fetchVendorData(id);
  }, [setLocation]);

  const fetchVendorData = async (id: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${id}`);
      if (response.ok) {
        const vendor = await response.json();
        form.reset({
          name: vendor.name || '',
          mobile: vendor.mobile || '',
          address: vendor.address || '',
          city: vendor.city || '',
          state: vendor.state || '',
          pincode: vendor.pincode || '',
          country: vendor.country || 'India',
          aadhar: vendor.aadhar || '',
          pan: vendor.pan || '',
          gstin: vendor.gstin || '',
          category: vendor.category || 'Individual',
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const watchedState = form.watch('state');
  useEffect(() => {
    if (watchedState) {
      setCities(getCitiesByState(watchedState));
      form.setValue('city', '', { shouldValidate: false });
      setCitySearch('');
    }
  }, [watchedState, form]);

  const filteredStates = IndianStates.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  const filteredCities = cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

  async function onSubmit(values: z.infer<typeof vendorProfileSchema>) {
    if (!vendorId) return;
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update profile' }));
        throw new Error(error.error || 'Failed to update profile');
      }

      toast({ title: 'Success', description: 'Profile updated successfully!' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/vendor/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Profile</h2>
          <p className="text-muted-foreground">Update your vendor information</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">Email and Vendor Code cannot be changed for security purposes.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your personal or company details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem className="col-span-2 space-y-3">
                  <FormLabel>Vendor Category <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-8">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Individual" /></FormControl>
                        <FormLabel className="font-normal">Individual</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="Company" /></FormControl>
                        <FormLabel className="font-normal">Company</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name / Company Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="Enter name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="mobile" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="9876543210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address Details</CardTitle>
              <CardDescription>Update your billing and communication address.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="col-span-3">
                  <FormLabel>Street Address <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="123 Main St, Block A" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>State <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); setStateSearch(''); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      <div className="p-2"><Input ref={stateInputRef} autoFocus placeholder="Search..." value={stateSearch} onChange={(e) => setStateSearch(e.target.value)} className="mb-2" /></div>
                      <div className="max-h-[150px] overflow-y-auto">
                        {filteredStates.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); setCitySearch(''); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      <div className="p-2"><Input ref={cityInputRef} autoFocus placeholder="Search..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} className="mb-2" /></div>
                      <div className="max-h-[150px] overflow-y-auto">
                        {filteredCities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="pincode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pincode</FormLabel>
                  <FormControl><Input placeholder="110001" {...field} /></FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl><Input {...field} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents & Compliance</CardTitle>
              <CardDescription>Update your legal documents information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField control={form.control} name="aadhar" render={({ field }) => (
                <FormItem>
                  <FormLabel>Aadhar Number</FormLabel>
                  <FormControl><Input placeholder="12-digit Aadhar" maxLength={12} {...field} /></FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="pan" render={({ field }) => (
                <FormItem>
                  <FormLabel>PAN Number</FormLabel>
                  <FormControl><Input placeholder="10-digit PAN" maxLength={10} {...field} /></FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="gstin" render={({ field }) => (
                <FormItem className="col-span-2 md:col-span-1">
                  <FormLabel>GSTIN</FormLabel>
                  <FormControl><Input placeholder="GST Number" maxLength={15} {...field} /></FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation('/vendor/dashboard')}>Cancel</Button>
            <Button type="submit" size="lg">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
