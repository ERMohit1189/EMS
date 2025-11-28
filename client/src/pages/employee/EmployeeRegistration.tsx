import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
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

const employeeSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  fatherName: z.string().min(2, 'Father name is required'),
  maritalStatus: z.enum(['Single', 'Married']),
  mobile: z.string().min(10, 'Mobile no. is required'),
  address: z.string().min(5, 'Address is required'),
  role: z.string().min(1, 'Role is required'),
  departmentId: z.string().optional(),
  designationId: z.string().min(1, 'Designation is required'),
  doj: z.string().min(1, 'Date of joining is required'),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  ppeKit: z.boolean().default(false),
  kitNo: z.string().optional(),
  // Required fields for backend but not in form
  dob: z.string().default('2000-01-01'),
  country: z.string().default('India'),
  city: z.string().default('Not Specified'),
  state: z.string().default('Not Specified'),
  aadhar: z.string().default('000000000000'),
  pan: z.string().default('AAAAA0000A'),
  bloodGroup: z.string().default('O+'),
  nominee: z.string().default('Not Specified'),
  alternateNo: z.string().optional(),
});

interface Department { id: string; name: string; }
interface Designation { id: string; name: string; }

export default function EmployeeRegistration() {
  const { addEmployee } = useStore();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

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
      ppeKit: false,
      maritalStatus: 'Single',
      status: 'Active',
    },
  });

  function onSubmit(values: z.infer<typeof employeeSchema>) {
    addEmployee({
      ...values,
      alternateNo: values.alternateNo || '',
      kitNo: values.kitNo || '',
    });
    toast({
      title: 'Employee Registered',
      description: 'New employee profile created successfully.',
    });
    setLocation('/employee/list');
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Employee Registration</h2>
        <p className="text-muted-foreground">Onboard new staff members with essential information.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder="Enter full name" {...field} />
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
                    <FormLabel>Father's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Father's name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
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
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile No.</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
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
                          <SelectValue placeholder="Select department" />
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
                    <FormLabel>Designation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
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
                    <FormLabel>Date of Joining</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Employee Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
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
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="ppeKit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-medium cursor-pointer">
                      PPE Kit Issued?
                    </FormLabel>
                  </FormItem>
                )}
              />
              
              {form.watch('ppeKit') && (
                <FormField
                  control={form.control}
                  name="kitNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kit Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter kit number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation('/employee/list')}>
              Cancel
            </Button>
            <Button type="submit" size="lg">Register Employee</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
