import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useRoute } from 'wouter';
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

export default function EmployeeEdit() {
  const [match, params] = useRoute('/employee/edit/:id');
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
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const employeeId = params?.id;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [empRes, deptRes, desigRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/employees/${employeeId}`, { cache: 'no-store' }),
          fetch(`${getApiBaseUrl()}/api/departments`, { cache: 'no-store' }),
          fetch(`${getApiBaseUrl()}/api/designations`, { cache: 'no-store' }),
        ]);
        if (empRes.ok) setEmployee(await empRes.json());
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (desigRes.ok) setDesignations(await desigRes.json());
      } catch (error) {
        console.error('Failed to load data', error);
        toast({ title: 'Error', description: 'Failed to load employee data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    if (employeeId) loadData();
  }, [employeeId, toast]);

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      name: employee.name || '',
      email: employee.email || '',
      dob: employee.dob || '',
      fatherName: employee.fatherName || '',
      mobile: employee.mobile || '',
      alternateNo: employee.alternateNo || '',
      address: employee.address || '',
      city: employee.city || '',
      state: employee.state || '',
      country: employee.country || 'India',
      role: employee.role || 'user',
      departmentId: employee.departmentId || '',
      designationId: employee.designationId || '',
      doj: employee.doj || '',
      aadhar: employee.aadhar || '',
      pan: employee.pan || '',
      bloodGroup: employee.bloodGroup || '',
      maritalStatus: employee.maritalStatus || 'Single',
      spouseName: employee.spouseName || '',
      nominee: employee.nominee || '',
      ppeKit: employee.ppeKit || false,
      kitNo: employee.kitNo || '',
      status: employee.status || 'Active',
    } : {
      country: 'India',
      ppeKit: false,
      maritalStatus: 'Single',
      status: 'Active',
      role: 'user',
      email: '',
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        name: employee.name || '',
        email: employee.email || '',
        dob: employee.dob || '',
        fatherName: employee.fatherName || '',
        mobile: employee.mobile || '',
        alternateNo: employee.alternateNo || '',
        address: employee.address || '',
        city: employee.city || '',
        state: employee.state || '',
        country: employee.country || 'India',
        role: employee.role || 'user',
        departmentId: employee.departmentId || '',
        designationId: employee.designationId || '',
        doj: employee.doj || '',
        aadhar: employee.aadhar || '',
        pan: employee.pan || '',
        bloodGroup: employee.bloodGroup || '',
        maritalStatus: employee.maritalStatus || 'Single',
        spouseName: employee.spouseName || '',
        nominee: employee.nominee || '',
        ppeKit: employee.ppeKit || false,
        kitNo: employee.kitNo || '',
        status: employee.status || 'Active',
      });
      calculateAge(employee?.dob || '');
    }
  }, [employee, form]);

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
    if (!employeeId) return;
    
    try {
      const payload = {
        name: values.name,
        email: values.email,
        fatherName: values.fatherName,
        mobile: values.mobile,
        alternateNo: values.alternateNo || '',
        address: values.address,
        city: values.city || 'Not Specified',
        state: values.state || 'Not Specified',
        country: values.country || 'India',
        dob: values.dob || '2000-01-01',
        aadhar: values.aadhar || '',
        pan: values.pan || '',
        bloodGroup: values.bloodGroup || 'O+',
        maritalStatus: values.maritalStatus,
        spouseName: values.spouseName || '',
        nominee: values.nominee || 'Not Specified',
        doj: values.doj,
        departmentId: values.departmentId || null,
        designationId: values.designationId,
        role: values.role || 'user',
        status: values.status || 'Active',
        ppeKit: values.ppeKit,
        kitNo: values.kitNo || '',
      };

      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update employee',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Employee Updated',
        description: 'Employee profile has been updated successfully.',
      });
      setLocation('/employee/list');
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <p className="text-lg">Loading employee data...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <h2 className="text-2xl font-bold mb-2">Employee Not Found</h2>
        <p>The employee you're trying to edit doesn't exist.</p>
        <Button onClick={() => setLocation('/employee/list')} className="mt-4">Back to List</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Employee</h2>
        <p className="text-muted-foreground">Update employee information.</p>
      </div>

      <Form {...form}>
        <form key={employeeId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
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
                      <Input placeholder="Enter name" {...field} />
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
                      <Input placeholder="Father's Name" {...field} />
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
                      <Input placeholder="Optional" {...field} />
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
                            className="mb-2"
                          />
                        </div>
                        <div className="max-h-[150px] overflow-y-auto">
                          {filteredStates.length > 0 ? (
                            filteredStates.map((state) => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
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
                            className="mb-2"
                          />
                        </div>
                        <div className="max-h-[150px] overflow-y-auto">
                          {filteredCities.length > 0 ? (
                            filteredCities.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => setLocation('/employee/list')}>
              Cancel
            </Button>
            <Button type="submit" size="lg">Update Employee</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
