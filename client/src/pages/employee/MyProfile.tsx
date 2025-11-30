import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  fatherName: z.string().min(2, "Father name is required"),
  mobile: z.string().min(10, "Mobile no. is required"),
  alternateNo: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  aadhar: z.string().optional(),
  pan: z.string().optional(),
});

interface MyProfileData extends z.infer<typeof profileSchema> {
  id: string;
  email: string;
  department: string;
  designation: string;
  photo?: string;
}

export default function MyProfile() {
  const { toast } = useToast();
  const [employee, setEmployee] = useState<MyProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const employeeId = localStorage.getItem('employeeId');

  const fetchEmployeeDataParallel = async () => {
    if (!employeeId) return;
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        // Get department and designation from localStorage (saved during login)
        const department = localStorage.getItem('employeeDepartment') || 'Not Assigned';
        const designation = localStorage.getItem('employeeDesignation') || 'Not Specified';
        
        const employeeWithNames = {
          ...data,
          department,
          designation,
        };
        
        setEmployee(employeeWithNames);
        if (data.photo) {
          setPhotoPreview(data.photo);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const fetchEmployeeData = async () => {
    await fetchEmployeeDataParallel();
  };

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: employee?.name || "",
      fatherName: employee?.fatherName || "",
      mobile: employee?.mobile || "",
      alternateNo: employee?.alternateNo || "",
      address: employee?.address || "",
      city: employee?.city || "",
      state: employee?.state || "",
      dob: employee?.dob || "",
      bloodGroup: employee?.bloodGroup || "",
      aadhar: employee?.aadhar || "",
      pan: employee?.pan || "",
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        name: employee.name,
        fatherName: employee.fatherName,
        mobile: employee.mobile,
        alternateNo: employee.alternateNo || "",
        address: employee.address,
        city: employee.city,
        state: employee.state,
        dob: employee.dob || "",
        bloodGroup: employee.bloodGroup || "",
        aadhar: employee.aadhar || "",
        pan: employee.pan || "",
      });
    }
  }, [employee, form]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Photo size should be less than 2MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setPhotoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!employeeId) return;

    try {
      setLoading(true);
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(values).forEach(key => {
        formData.append(key, (values as any)[key] || "");
      });

      // Add photo if changed
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}/profile`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        await fetchEmployeeData();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!employee) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>

        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {i === 1 ? (
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const initials = employee.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Profile</h2>
        <p className="text-muted-foreground mt-1">View and edit your profile information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview || ""} alt={employee.name} />
              <AvatarFallback className="bg-green-600 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                data-testid="input-photo-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-photo"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <p className="text-xs text-muted-foreground">Max 2MB. JPG, PNG supported</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email - Read Only */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={employee.email}
                    disabled
                    className="bg-muted mt-1.5"
                    data-testid="input-email-readonly"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>

                {/* Department - Read Only */}
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <Input
                    value={employee.department}
                    disabled
                    className="bg-muted mt-1.5"
                    data-testid="input-department-readonly"
                  />
                </div>
              </div>

              {/* Designation - Read Only */}
              <div>
                <label className="text-sm font-medium">Designation</label>
                <Input
                  value={employee.designation}
                  disabled
                  className="bg-muted mt-1.5"
                  data-testid="input-designation-readonly"
                />
              </div>

              {/* Editable Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} data-testid="input-name" />
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
                      <FormLabel>Father Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Father name" {...field} data-testid="input-father-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile No. *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mobile number" {...field} data-testid="input-mobile" />
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
                        <Input placeholder="Alternate number" {...field} data-testid="input-alternate-no" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="Address" {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} data-testid="input-city" />
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
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" placeholder="DOB" {...field} data-testid="input-dob" />
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
                      <FormControl>
                        <Input placeholder="Blood group" {...field} data-testid="input-blood-group" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="aadhar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar</FormLabel>
                      <FormControl>
                        <Input placeholder="Aadhar number" {...field} data-testid="input-aadhar" />
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
                      <FormLabel>PAN</FormLabel>
                      <FormControl>
                        <Input placeholder="PAN number" {...field} data-testid="input-pan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} data-testid="button-save-profile">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchEmployeeData()}
                  data-testid="button-cancel-profile"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
