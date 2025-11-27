import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const vendorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode required'),
  country: z.string().default('India'),
  aadhar: z.string()
    .min(12, 'Aadhar must be at least 12 digits')
    .max(12, 'Aadhar must not exceed 12 digits')
    .regex(/^\d{12}$/, 'Aadhar must be exactly 12 digits'),
  pan: z.string()
    .min(10, 'PAN must be at least 10 characters')
    .max(10, 'PAN must not exceed 10 characters')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be in format: AAAAA9999A (5 letters, 4 digits, 1 letter)'),
  gstin: z.string()
    .min(15, 'GSTIN must be at least 15 characters')
    .max(15, 'GSTIN must not exceed 15 characters')
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'GSTIN must be exactly 15 characters in valid format')
    .optional()
    .or(z.literal('')),
  category: z.enum(['Individual', 'Company']),
  moa: z.any().optional(), // File upload simulation
});

export default function VendorRegistration() {
  const { addVendor } = useStore();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
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
      aadhar: '',
      pan: '',
      gstin: '',
      category: 'Individual',
    },
  });

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

  function onSubmit(values: z.infer<typeof vendorSchema>) {
    addVendor({
      ...values,
      gstin: values.gstin || '',
      status: 'Pending',
      moa: values.moa ? 'uploaded_doc.pdf' : '',
    });
    
    toast({
      title: 'Vendor Registered',
      description: 'Vendor has been successfully registered and is pending approval.',
    });
    
    setLocation('/vendor/list');
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vendor Registration</h2>
        <p className="text-muted-foreground">Register a new vendor for site allocation.</p>
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
                name="category"
                render={({ field }) => (
                  <FormItem className="col-span-2 space-y-3">
                    <FormLabel>Vendor Category</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Individual" />
                          </FormControl>
                          <FormLabel className="font-normal">Individual</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Company" />
                          </FormControl>
                          <FormLabel className="font-normal">Company</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name / Company Name</FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder="Enter name" {...field} />
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
                            autoFocus
                            placeholder="Search states..." 
                            value={stateSearch}
                            onChange={(e) => setStateSearch(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setStateHighlight(prev => 
                                  prev < filteredStates.length - 1 ? prev + 1 : prev
                                );
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setStateHighlight(prev => prev > 0 ? prev - 1 : -1);
                              } else if (e.key === 'Enter' && stateHighlight >= 0) {
                                e.preventDefault();
                                field.onChange(filteredStates[stateHighlight]);
                                setStateSearch('');
                                setStateHighlight(-1);
                                setTimeout(() => stateInputRef.current?.focus(), 100);
                              } else if (e.key === 'Escape') {
                                setStateSearch('');
                                setStateHighlight(-1);
                              }
                            }}
                            className="mb-2"
                          />
                        </div>
                        <div className="max-h-[150px] overflow-y-auto">
                          {filteredStates.length > 0 ? (
                            filteredStates.map((state, idx) => (
                              <div
                                key={state}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    field.onChange(state);
                                    setStateSearch('');
                                    setStateHighlight(-1);
                                    setTimeout(() => stateInputRef.current?.focus(), 100);
                                  }
                                }}
                                onMouseEnter={() => setStateHighlight(idx)}
                                onClick={() => {
                                  field.onChange(state);
                                  setStateSearch('');
                                  setStateHighlight(-1);
                                  setTimeout(() => stateInputRef.current?.focus(), 100);
                                }}
                              >
                                <SelectItem 
                                  value={state}
                                  className={stateHighlight === idx ? 'bg-accent' : ''}
                                >
                                  {state}
                                </SelectItem>
                              </div>
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
                            autoFocus
                            placeholder="Search cities..." 
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setCityHighlight(prev => 
                                  prev < filteredCities.length - 1 ? prev + 1 : prev
                                );
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setCityHighlight(prev => prev > 0 ? prev - 1 : -1);
                              } else if (e.key === 'Enter' && cityHighlight >= 0) {
                                e.preventDefault();
                                field.onChange(filteredCities[cityHighlight]);
                                setCitySearch('');
                                setCityHighlight(-1);
                                setTimeout(() => cityInputRef.current?.focus(), 100);
                              } else if (e.key === 'Escape') {
                                setCitySearch('');
                                setCityHighlight(-1);
                              }
                            }}
                            className="mb-2"
                          />
                        </div>
                        <div className="max-h-[150px] overflow-y-auto">
                          {filteredCities.length > 0 ? (
                            filteredCities.map((city, idx) => (
                              <div
                                key={city}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    field.onChange(city);
                                    setCitySearch('');
                                    setCityHighlight(-1);
                                    setTimeout(() => cityInputRef.current?.focus(), 100);
                                  }
                                }}
                                onMouseEnter={() => setCityHighlight(idx)}
                                onClick={() => {
                                  field.onChange(city);
                                  setCitySearch('');
                                  setCityHighlight(-1);
                                  setTimeout(() => cityInputRef.current?.focus(), 100);
                                }}
                              >
                                <SelectItem 
                                  value={city}
                                  className={cityHighlight === idx ? 'bg-accent' : ''}
                                >
                                  {city}
                                </SelectItem>
                              </div>
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
              <CardTitle>Documents & Compliance</CardTitle>
              <CardDescription>Upload necessary legal documents.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="aadhar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Number</FormLabel>
                    <FormControl>
                      <Input placeholder="12-digit Aadhar" maxLength={12} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input placeholder="10-digit PAN" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              
              <FormField
                control={form.control}
                name="moa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MOA / Incorporation Certificate</FormLabel>
                    <FormControl>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input id="picture" type="file" />
                      </div>
                    </FormControl>
                    <FormDescription>Upload PDF or JPG (Max 5MB)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation('/')}>
              Cancel
            </Button>
            <Button type="submit" size="lg">Register Vendor</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
