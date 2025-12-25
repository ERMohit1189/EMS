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
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianStates, getCitiesByState } from "@/assets/india-data";

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
  role: string;
  status: string;
  photo?: string;
}

export default function MyProfile() {
  // Role-based access control
  const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
  if (employeeRole !== 'admin' && employeeRole !== 'user' && employeeRole !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }
  const { toast } = useToast();
  const employeeId = localStorage.getItem('employeeId');
  const [employee, setEmployee] = useState<MyProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmployeeDataParallel = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        // Get department and designation from localStorage (saved during login), fall back to API
        const department = localStorage.getItem('employeeDepartment') || data.department || 'Not Assigned';
        const designation = localStorage.getItem('employeeDesignation') || data.designation || 'Not Specified';
        
        const employeeWithNames = {
          ...data,
          department,
          designation,
          role: data.role || localStorage.getItem('employeeRole') || 'user',
          status: data.status || 'Active',
        };
        
        // Log when role/status are missing so we can diagnose the backend
        if (!data.role || !data.status) {
          console.warn('MyProfile: missing role/status from API for', req.params?.id || employeeId, data.role, data.status);
        }

        setEmployee(employeeWithNames);
        if (data.photo) {
          // Append cache-busting query param so browsers load the replaced file immediately
          const addCacheBuster = (url: string) => {
            if (!url) return '';
            try {
              const u = new URL(url, window.location.origin);
              u.searchParams.set('v', String(Date.now()));
              return u.toString();
            } catch (e) {
              const sep = url.includes('?') ? '&' : '?';
              return `${url}${sep}v=${Date.now()}`;
            }
          };

          const photoWithBuster = addCacheBuster(data.photo);
          setPhotoPreview(photoWithBuster);

          // If this is the logged-in employee, update localStorage so header/dashboard can show the image
          if (localStorage.getItem('employeeId') === data.id) {
            localStorage.setItem('employeePhoto', photoWithBuster);
            // dispatch login + custom event so header picks up new photo immediately
            window.dispatchEvent(new Event('login'));
            window.dispatchEvent(new Event('user-updated'));
          }
        }
        // preload cities list based on current state
        setCities(getCitiesByState(data.state || ""));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      // preload cities for the employee's state first so Select has options
      const initialCities = getCitiesByState(employee.state || "");
      setCities(initialCities);

      // Now reset the form values (state & city will match available options)
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

      // Force set state and city so controlled Selects bind reliably
      console.log('MyProfile: setting state immediate ->', employee.state || '');
      form.setValue("state", employee.state || "", { shouldValidate: false });
      setTimeout(() => {
        console.log('MyProfile: setting state microtask ->', employee.state || '');
        form.setValue("state", employee.state || "", { shouldValidate: false });
      }, 0);

      // Try immediate set and also a microtask fallback to avoid timing issues with Select components
      if (employee.city && initialCities.includes(employee.city)) {
        console.log('MyProfile: setting city immediate ->', employee.city);
        form.setValue("city", employee.city, { shouldValidate: false });
        setTimeout(() => {
          console.log('MyProfile: setting city microtask ->', employee.city);
          form.setValue("city", employee.city, { shouldValidate: false });
        }, 0);
      } else {
        console.log('MyProfile: clearing city immediate');
        form.setValue("city", "", { shouldValidate: false });
        setTimeout(() => {
          console.log('MyProfile: clearing city microtask');
          form.setValue("city", "", { shouldValidate: false });
        }, 0);
      }

      // Debug: log employee state and form values after reset and after microtask to verify binding
      try {
        console.log('MyProfile: employee.state', employee.state);
        console.log('MyProfile: initialCities includes city?', initialCities.includes(employee.city || ''));
        console.log('MyProfile: form values after reset (immediate)', form.getValues());
        setTimeout(() => {
          console.log('MyProfile: form values after reset (microtask)', form.getValues());
        }, 0);

        // Force final set after a short delay to override any later clears
        setTimeout(() => {
          console.log('MyProfile: forcing final state/city set ->', employee.state, employee.city);
          form.setValue("state", employee.state || "", { shouldValidate: false });
          const finalCities = getCitiesByState(employee.state || "");
          if (employee.city && finalCities.includes(employee.city)) {
            form.setValue("city", employee.city, { shouldValidate: false });
          } else {
            form.setValue("city", "", { shouldValidate: false });
          }
          console.log('MyProfile: form values after forced set', form.getValues());
        }, 50);
      } catch (e) {
        console.warn('MyProfile: failed to get form values after reset', e);
      }
    }
  }, [employee, form]);

  // Watch state changes and update city options
  const watchedState = form.watch("state");
  const initializingRef = useRef(true);

  useEffect(() => {
    console.log('MyProfile: watchedState changed ->', watchedState);
    if (watchedState) {
      setCities(getCitiesByState(watchedState));
      // Only clear city when state is changed by the user (not during initial form population)
      if (!initializingRef.current && watchedState !== employee?.state) {
        form.setValue("city", "", { shouldValidate: false });
      }
    } else {
      setCities([]);
      if (!initializingRef.current) {
        form.setValue("city", "", { shouldValidate: false });
      }
    }
  }, [watchedState, form, employee?.state]);

  // After initial population complete, clear the init flag
  useEffect(() => {
    // Run in microtask so this runs after initial setValue calls
    const t = setTimeout(() => { initializingRef.current = false; }, 0);
    return () => clearTimeout(t);
  }, []);

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
      setSaving(true);
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
      setSaving(false);
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

          {/* Colored badges for read-only fields (Email / Dept / Desig / Role / Status / DOJ) */}
          {employee && (
            <div className="flex gap-2 flex-wrap mb-4" data-testid="profile-badges-colored">
              <Badge className="bg-blue-600 text-white text-xs" data-testid="badge-email">
                Email: <span className="ml-2 font-medium">{employee.email}</span>
              </Badge>

              <Badge className="bg-red-500 text-white text-xs" data-testid="badge-dept">
                Dept: <span className="ml-2 font-medium">{employee.department || '—'}</span>
              </Badge>

              <Badge className="bg-yellow-400 text-black text-xs" data-testid="badge-desig">
                Desig: <span className="ml-2 font-medium">{employee.designation || '—'}</span>
              </Badge>

              <Badge className="bg-orange-500 text-white text-xs" data-testid="badge-role">
                Role: <span className="ml-2 font-medium">{employee.role || '—'}</span>
              </Badge>

              <Badge className={employee.status === 'Active' ? 'bg-green-500 text-white text-xs' : 'bg-red-600 text-white text-xs'} data-testid="badge-status">
                Status: <span className="ml-2 font-medium">{employee.status || '—'}</span>
              </Badge>

              <Badge className="bg-pink-400 text-black text-xs" data-testid="badge-doj">
                DOJ: <span className="ml-2 font-medium">{employee.doj ? (typeof employee.doj === 'string' ? employee.doj : (employee.doj as any)?.split?.('T')?.[0] || '') : '—'}</span>
              </Badge>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">






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
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          value={field.value || ""}
                          onValueChange={(val) => {
                            field.onChange(val);
                            const newCities = getCitiesByState(val);
                            setCities(newCities);
                            // clear city only if it doesn't belong to the new state's cities
                            const currentCity = form.getValues("city");
                            if (!newCities.includes(currentCity)) {
                              form.setValue("city", "", { shouldValidate: false });
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {IndianStates.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                <Button type="submit" disabled={saving} data-testid="button-save-profile">
                  {saving ? "Saving..." : "Save Changes"}
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
