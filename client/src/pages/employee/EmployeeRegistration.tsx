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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const RequiredLabel = ({ children }: { children: string }) => (
  <span>
    {children} <span className="text-red-600">*</span>
  </span>
);

const baseSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  dob: z.string().optional(),
  fatherName: z.string().min(2, 'Father name is required'),
  mobile: z.string().min(10, 'Mobile no. is required'),
  alternateNo: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  role: z.string().min(1, 'Role is required'),
  departmentId: z.string().optional(),
  designationId: z.string().min(1, 'Designation is required'),
  doj: z.string().min(1, 'Date of joining is required'),
  aadhar: z.string().optional(),
  pan: z.string().optional(),
  bloodGroup: z.string().optional(),
  maritalStatus: z.enum(['Single', 'Married']),
  spouseName: z.string().optional(),
  nominee: z.string().optional(),
  ppeKit: z.boolean().default(false),
  kitNo: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

const employeeSchema = baseSchema
  .refine(
    (data) => {
      if (data.maritalStatus === 'Married' && !data.spouseName) {
        return false;
      }
      return true;
    },
    {
      message: 'Spouse name is required if married',
      path: ['spouseName'],
    }
  )
  .refine(
    (data) => {
      if (data.ppeKit && !data.kitNo) {
        return false;
      }
      return true;
    },
    {
      message: 'Kit number is required if PPE kit is issued',
      path: ['kitNo'],
    }
  );

interface Department { id: string; name: string; }
interface Designation { id: string; name: string; }

export default function EmployeeRegistration() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [cities, setCities] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [stateHighlight, setStateHighlight] = useState(-1);
  const [cityHighlight, setCityHighlight] = useState(-1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [age, setAge] = useState<{ years: number; months: number; days: number } | null>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const calculateAge = (dob: string) => {
    if (!dob) {
      setAge(null);
      return;
    }
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    setAge({ years, months, days });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deptRes, desigRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/departments`),
          fetch(`${getApiBaseUrl()}/api/designations`),
        ]);
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (desigRes.ok) setDesignations(await desigRes.json());
      } catch (error) {
        console.error('Failed to load departments/designations', error);
      }
    };
    loadData();
  }, []);

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      country: 'India',
      ppeKit: false,
      maritalStatus: 'Single',
      status: 'Active',
    },
  });

  const watchedState = form.watch('state');
  const watchedDob = form.watch('dob');
  
  useEffect(() => {
    if (watchedState) {
      setCities(getCitiesByState(watchedState));
      form.setValue('city', '', { shouldValidate: false });
      setCitySearch('');
    }
  }, [watchedState, form]);

  useEffect(() => {
    calculateAge(watchedDob || '');
  }, [watchedDob]);

  const filteredStates = IndianStates.filter(s => 
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );
  
  const filteredCities = cities.filter(c => 
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  async function onSubmit(values: z.infer<typeof employeeSchema>) {
    const emailLower = values.email.toLowerCase();
    
    try {
      // Prepare the payload to send to backend
      const payload = {
        name: values.name,
        email: emailLower,
        fatherName: values.fatherName,
        mobile: values.mobile,
        alternateNo: values.alternateNo,
        address: values.address,
        city: values.city,
        state: values.state,
        country: values.country,
        dob: values.dob,
        aadhar: values.aadhar,
        pan: values.pan,
        bloodGroup: values.bloodGroup,
        maritalStatus: values.maritalStatus,
        spouseName: values.spouseName,
        nominee: values.nominee,
        doj: values.doj,
        departmentId: values.departmentId,
        designationId: values.designationId,
        role: values.role,
        status: values.status,
        ppeKit: values.ppeKit,
        kitNo: values.kitNo,
      };

      const response = await fetch(`${getApiBaseUrl()}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        form.setError('email', { message: error.error || 'Failed to register employee' });
        toast({
          title: 'Registration Failed',
          description: error.error || 'Failed to register employee',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Employee Registered',
        description: 'New employee profile created successfully.',
      });
      setLocation('/employee/list');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to register employee',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Employee Registration</h2>
        <p className="text-muted-foreground">Onboard new staff members with complete information.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Full Name</RequiredLabel></FormLabel>
                    <FormControl>
                      <Input 
                        autoFocus 
                        placeholder="Enter name" 
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          form.trigger('name');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Father's Name</RequiredLabel></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Father's Name" 
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          form.trigger('fatherName');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Group</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Marital Status</RequiredLabel></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('maritalStatus') === 'Married' && (
                <FormField
                  control={form.control}
                  name="spouseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Spouse Name</RequiredLabel></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Spouse's Name" 
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            form.trigger('spouseName');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {age !== null && (
                <div className={`col-span-3 p-4 rounded-md border ${
                  age.years < 18 
                    ? 'border-red-300 bg-red-50' 
                    : age.years >= 18 && age.years <= 60 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-orange-300 bg-orange-50'
                }`}>
                  <div className={`font-semibold ${
                    age.years < 18 
                      ? 'text-red-900' 
                      : age.years >= 18 && age.years <= 60 
                      ? 'text-green-900' 
                      : 'text-orange-900'
                  }`}>
                    Age: {age.years}{age.years !== 1 ? ' years' : ' year'}, {age.months}{age.months !== 1 ? ' months' : ' month'}, {age.days}{age.days !== 1 ? ' days' : ' day'}
                  </div>
                  {age.years < 18 && (
                    <div className="text-sm text-red-700 mt-2 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Employee must be at least 18 years old</span>
                    </div>
                  )}
                  {age.years >= 18 && age.years <= 60 && (
                    <div className="text-sm text-green-700 mt-2 flex items-center gap-2">
                      <span>✓</span>
                      <span>Valid working age</span>
                    </div>
                  )}
                  {age.years > 60 && (
                    <div className="text-sm text-orange-700 mt-2 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Employee is above standard retirement age</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
               <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Mobile No.</RequiredLabel></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="9876543210"
                        maxLength={10}
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          form.trigger('mobile');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="alternateNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate No.</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" maxLength={10} {...field} />
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
                    <FormLabel><RequiredLabel>Email (Login ID)</RequiredLabel></FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="employee@company.com" 
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          form.trigger('email');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormLabel><RequiredLabel>Address</RequiredLabel></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Full Address" 
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          form.trigger('address');
                        }}
                      />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
               <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Role</RequiredLabel></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Designation</RequiredLabel></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {designations.map(desig => (
                          <SelectItem key={desig.id} value={desig.id}>{desig.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="doj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Date of Joining</RequiredLabel></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nominee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominee Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Nominee" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aadhar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar No</FormLabel>
                    <FormControl>
                      <Input placeholder="Aadhar" maxLength={12} {...field} />
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
                    <FormLabel>PAN No</FormLabel>
                    <FormControl>
                      <Input placeholder="PAN" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><RequiredLabel>Employee Status</RequiredLabel></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
               <CardTitle>Safety Equipment</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="ppeKit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        PPE Kit Issued?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
               <FormField
                control={form.control}
                name="kitNo"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{form.watch('ppeKit') && <RequiredLabel>Kit Number</RequiredLabel>}{!form.watch('ppeKit') && 'Kit Number'}</FormLabel>
                    <FormControl>
                      <Input placeholder="Kit ID (if issued)" {...field} />
                    </FormControl>
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
            <Button type="submit" size="lg">Onboard Employee</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
