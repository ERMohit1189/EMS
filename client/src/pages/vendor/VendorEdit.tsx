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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, X, Eye, Download } from 'lucide-react';
import type { Vendor } from '@shared/schema';

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
  moa: z.any().optional(),
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
  
  // File upload states
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstinFile, setGstinFile] = useState<File | null>(null);
  const [moaFile, setMoaFile] = useState<File | null>(null);
  
  // Existing uploaded documents from database
  const [existingAadharDoc, setExistingAadharDoc] = useState<string>('');
  const [existingPanDoc, setExistingPanDoc] = useState<string>('');
  const [existingGstinDoc, setExistingGstinDoc] = useState<string>('');
  const [existingMoaDoc, setExistingMoaDoc] = useState<string>('');

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
      moa: '',
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
        pincode: vendor.pincode || '',
        country: vendor.country,
        aadhar: vendor.aadhar || '',
        pan: vendor.pan || '',
        gstin: vendor.gstin || '',
        category: vendor.category || 'Individual',
        moa: vendor.moa || '',
      });
      
      // Store existing uploaded documents
      setExistingAadharDoc(vendor.aadharDoc || '');
      setExistingPanDoc(vendor.panDoc || '');
      setExistingGstinDoc(vendor.gstinDoc || '');
      setExistingMoaDoc(vendor.moaDoc || '');
      
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
      const formData = new FormData();
      
      // Append all form values - text fields remain as text values
      Object.entries(values).forEach(([key, value]) => {
        if (key !== 'moa' && value !== null && value !== undefined && value !== '') {
          // Ensure we're sending the actual form values, not filenames
          formData.append(key, String(value));
        }
      });

      // Append file uploads separately - these go to *Doc fields
      if (aadharFile) {
        formData.append('aadharFile', aadharFile);
      }
      if (panFile) {
        formData.append('panFile', panFile);
      }
      if (gstinFile) {
        formData.append('gstinFile', gstinFile);
      }
      if (moaFile) {
        formData.append('moaFile', moaFile);
      }

      const response = await fetch(`${getApiBaseUrl()}/api/vendors/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update vendor');
      }

      toast({
        title: 'Success',
        description: 'Vendor updated successfully',
      });
      setLocation('/vendor/list');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update vendor',
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
                name="category"
                render={({ field }) => (
                  <FormItem className="col-span-2 space-y-3">
                    <FormLabel>Vendor Category <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
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
                    <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
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
                    <FormLabel>Mobile Number <span className="text-red-500">*</span></FormLabel>
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
                    <FormLabel>Street Address <span className="text-red-500">*</span></FormLabel>
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
                        <Input placeholder="12-digit Aadhar" maxLength={12} {...field} className="flex-1" />
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
                      <p className="text-xs text-green-600">New: {aadharFile.name}</p>
                    )}
                    {existingAadharDoc && !aadharFile && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-blue-600">📎 Existing document uploaded</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`${getApiBaseUrl()}/uploads/${existingAadharDoc}`, '_blank')}
                          className="h-6 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `${getApiBaseUrl()}/uploads/${existingAadharDoc}`;
                            link.download = existingAadharDoc;
                            link.click();
                          }}
                          className="h-6 px-2"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
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
                        <Input placeholder="10-digit PAN" maxLength={10} {...field} className="flex-1" />
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
                      <p className="text-xs text-green-600">New: {panFile.name}</p>
                    )}
                    {existingPanDoc && !panFile && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-blue-600">📎 Existing document uploaded</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`${getApiBaseUrl()}/uploads/${existingPanDoc}`, '_blank')}
                          className="h-6 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `${getApiBaseUrl()}/uploads/${existingPanDoc}`;
                            link.download = existingPanDoc;
                            link.click();
                          }}
                          className="h-6 px-2"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
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
                        <Input placeholder="15-char GST Number" maxLength={15} {...field} className="flex-1" />
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
                      <p className="text-xs text-green-600">New: {gstinFile.name}</p>
                    )}
                    {existingGstinDoc && !gstinFile && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-blue-600">📎 Existing document uploaded</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`${getApiBaseUrl()}/uploads/${existingGstinDoc}`, '_blank')}
                          className="h-6 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `${getApiBaseUrl()}/uploads/${existingGstinDoc}`;
                            link.download = existingGstinDoc;
                            link.click();
                          }}
                          className="h-6 px-2"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
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
                    <div className="flex gap-2">
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
                            setMoaFile(file);
                            // Don't set the file object in the form, keep existing value
                          }
                        }}
                        className="hidden"
                        id="moa-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('moa-file')?.click()}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                      {moaFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMoaFile(null);
                          }}
                          className="text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {moaFile && (
                      <p className="text-xs text-green-600">New: {moaFile.name}</p>
                    )}
                    {existingMoaDoc && !moaFile && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-blue-600">📎 Existing document uploaded</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`${getApiBaseUrl()}/uploads/${existingMoaDoc}`, '_blank')}
                          className="h-6 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `${getApiBaseUrl()}/uploads/${existingMoaDoc}`;
                            link.download = existingMoaDoc;
                            link.click();
                          }}
                          className="h-6 px-2"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <FormDescription>Upload PDF or JPG (Max 5MB)</FormDescription>
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
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : "Update Vendor"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
