import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import { IndianStates, getCitiesByState } from '@/assets/india-data';
import { getApiBaseUrl } from '@/lib/api';
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
import { Upload, X } from 'lucide-react';

const vendorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string()
    .min(0, 'Pincode is optional')
    .optional()
    .or(z.literal('')),
  country: z.string().default('India'),
  aadhar: z.string()
    .min(0, 'Aadhar is optional')
    .optional()
    .or(z.literal('')),
  pan: z.string()
    .min(0, 'PAN is optional')
    .optional()
    .or(z.literal('')),
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
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [cities, setCities] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [stateHighlight, setStateHighlight] = useState(-1);
  const [cityHighlight, setCityHighlight] = useState(-1);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  
  // File upload states
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstinFile, setGstinFile] = useState<File | null>(null);

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

  async function onSubmit(values: z.infer<typeof vendorSchema>) {
    try {
      const formData = new FormData();

      // Append all form values as text fields
      Object.entries(values).forEach(([key, value]) => {
        if (key !== 'moa' && value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });

      // Add required fields that might be empty
      if (!values.gstin) {
        formData.append('gstin', '');
      }
      if (!values.aadhar) {
        formData.append('aadhar', '');
      }
      if (!values.pan) {
        formData.append('pan', '');
      }

      // Append files separately
      if (aadharFile) {
        formData.append('aadharFile', aadharFile);
      }
      if (panFile) {
        formData.append('panFile', panFile);
      }
      if (gstinFile) {
        formData.append('gstinFile', gstinFile);
      }

      const response = await fetch(`${getApiBaseUrl()}/api/vendors`, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to register vendor' }));
        // Use message field if available (has the most detailed error), otherwise use error field
        const errorMessage = errorData.message || errorData.error || 'Failed to register vendor';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast({
        title: 'Success',
        description: 'Vendor has been successfully registered and is pending approval.',
      });

      setLocation('/vendor/list');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to register vendor',
        variant: 'destructive',
      });
    }
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
                    <FormLabel>Vendor Category <span className="text-red-500">*</span></FormLabel>
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
                    <FormLabel>Full Name / Company Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder="Enter name" {...field} onBlur={(e) => { field.onBlur(); form.trigger('name'); }} />
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
                    <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="vendor@example.com" {...field} onBlur={(e) => { field.onBlur(); form.trigger('email'); }} />
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
                    <FormLabel>Mobile Number <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} onBlur={(e) => { field.onBlur(); form.trigger('mobile'); }} />
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
                    <FormLabel>Street Address <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Block A" {...field} onBlur={(e) => { field.onBlur(); form.trigger('address'); }} />
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
                    <FormLabel>State <span className="text-red-500">*</span></FormLabel>
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
                    <FormLabel>City <span className="text-red-500">*</span></FormLabel>
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
                      <Input placeholder="110001" {...field} onBlur={(e) => { field.onBlur(); form.trigger('pincode'); }} />
                    </FormControl>
                    <FormDescription>Optional - Leave empty if not available</FormDescription>
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
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="aadhar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Number</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="12-digit Aadhar" maxLength={12} {...field} onBlur={(e) => { field.onBlur(); form.trigger('aadhar'); }} className="flex-1" />
                      </FormControl>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast({ title: "Error", description: "File must be <5MB", variant: "destructive" });
                              return;
                            }
                            setAadharFile(file);
                          }
                        }}
                        className="hidden"
                        id="aadhar-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('aadhar-file')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      {aadharFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAadharFile(null)}
                          className="text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {aadharFile && (
                      <p className="text-xs text-green-600">{aadharFile.name}</p>
                    )}
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
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="10-digit PAN" maxLength={10} {...field} onBlur={(e) => { field.onBlur(); form.trigger('pan'); }} className="flex-1" />
                      </FormControl>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast({ title: "Error", description: "File must be <5MB", variant: "destructive" });
                              return;
                            }
                            setPanFile(file);
                          }
                        }}
                        className="hidden"
                        id="pan-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('pan-file')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      {panFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPanFile(null)}
                          className="text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {panFile && (
                      <p className="text-xs text-green-600">{panFile.name}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="15-char GST Number" maxLength={15} {...field} onBlur={(e) => { field.onBlur(); form.trigger('gstin'); }} className="flex-1" />
                      </FormControl>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast({ title: "Error", description: "File must be <5MB", variant: "destructive" });
                              return;
                            }
                            setGstinFile(file);
                          }
                        }}
                        className="hidden"
                        id="gstin-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('gstin-file')?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      {gstinFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setGstinFile(null)}
                          className="text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {gstinFile && (
                      <p className="text-xs text-green-600">{gstinFile.name}</p>
                    )}
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
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </span>
              ) : "Register Vendor"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
