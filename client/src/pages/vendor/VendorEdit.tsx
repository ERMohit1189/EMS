import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { IndianStates, getCitiesByState } from '@/assets/india-data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Vendor } from '@shared/schema';

const vendorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode required'),
  country: z.string().default('India'),
  gstin: z.string().optional().or(z.literal('')),
});

export default function VendorEdit() {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [stateHighlight, setStateHighlight] = useState(-1);
  const [cityHighlight, setCityHighlight] = useState(-1);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof vendorSchema>>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      gstin: '',
    },
  });

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${id}`);
      if (!response.ok) throw new Error('Failed to fetch vendor');
      const vendor = await response.json();
      form.reset({
        name: vendor.name,
        email: vendor.email,
        mobile: vendor.mobile,
        address: vendor.address,
        city: vendor.city,
        state: vendor.state,
        pincode: vendor.pincode,
        country: vendor.country,
        gstin: vendor.gstin || '',
      });
      setCities(getCitiesByState(vendor.state));
      setLoading(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load vendor',
        variant: 'destructive',
      });
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

  const filteredStates = IndianStates.filter(s => 
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );
  
  const filteredCities = cities.filter(c => 
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  async function onSubmit(values: z.infer<typeof vendorSchema>) {
    try {
      const response = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to update vendor');

      toast({
        title: 'Success',
        description: 'Vendor updated successfully',
      });
      setLocation('/vendor/list');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update vendor',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading vendor...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Vendor</h2>
        <p className="text-muted-foreground">Update vendor information.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Personal or company details of the vendor.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name / Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="vendor@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address Details</CardTitle>
              <CardDescription>Billing and communication address.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Block A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); setStateSearch(''); }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                        <div className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Input 
                            ref={stateInputRef}
                            placeholder="Search states..." 
                            value={stateSearch}
                            onChange={(e) => setStateSearch(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        <div className="max-h-[150px] overflow-y-auto">
                          {filteredStates.length > 0 ? (
                            filteredStates.map((state) => (
                              <SelectItem 
                                key={state}
                                value={state}
                                onClick={() => {
                                  field.onChange(state);
                                  setStateSearch('');
                                }}
                              >
                                {state}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1 text-sm text-muted-foreground">No states found</div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); setCitySearch(''); }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                        <div className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Input 
                            ref={cityInputRef}
                            placeholder="Search cities..." 
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        <div className="max-h-[150px] overflow-y-auto">
                          {filteredCities.length > 0 ? (
                            filteredCities.map((city) => (
                              <SelectItem 
                                key={city}
                                value={city}
                                onClick={() => {
                                  field.onChange(city);
                                  setCitySearch('');
                                }}
                              >
                                {city}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1 text-sm text-muted-foreground">No cities found</div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input placeholder="110001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="GST Number" maxLength={15} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation('/vendor/list')}>
              Cancel
            </Button>
            <Button type="submit" size="lg">Update Vendor</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
