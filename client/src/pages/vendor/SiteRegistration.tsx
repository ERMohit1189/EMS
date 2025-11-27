import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { IndianStates } from '@/assets/india-data';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const siteSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  siteId: z.string().min(2, 'Site ID is required'),
  planId: z.string().min(2, 'Plan ID is required'),
  antennaSize: z.string().min(1, 'Antenna size is required'),
  incDate: z.string().min(1, 'INC date is required'),
  state: z.string().min(2, 'State is required'),
  region: z.string().min(2, 'Region is required'),
  zone: z.string().min(2, 'Zone is required'),
  inside: z.boolean().default(false),
  formNo: z.string().min(1, 'Form No is required'),
  siteAmount: z.string().transform((val) => Number(val)),
  vendorAmount: z.string().transform((val) => Number(val)),
  softAtRemark: z.string().optional(),
  phyAtRemark: z.string().optional(),
  atpRemark: z.string().optional(),
});

export default function SiteRegistration() {
  const { addSite, vendors } = useStore();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const form = useForm<z.infer<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      inside: false,
    },
  });

  function onSubmit(values: z.infer<typeof siteSchema>) {
    addSite({
      ...values,
      status: 'Pending',
      softAtRemark: values.softAtRemark || 'Pending',
      phyAtRemark: values.phyAtRemark || 'Pending',
      atpRemark: values.atpRemark || 'Pending',
    });
    
    toast({
      title: 'Site Registered',
      description: 'New site has been successfully registered.',
    });
    
    setLocation('/vendor/sites');
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Site Registration</h2>
        <p className="text-muted-foreground">Register a new site for installation or maintenance.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Site Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Select Vendor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name} ({v.city})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. DL-1001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. P-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
                <CardTitle>Technical & Location</CardTitle>
             </CardHeader>
             <CardContent className="grid gap-6 md:grid-cols-4">
               <FormField
                control={form.control}
                name="antennaSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antenna Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0.6m">0.6m</SelectItem>
                        <SelectItem value="1.2m">1.2m</SelectItem>
                        <SelectItem value="1.8m">1.8m</SelectItem>
                        <SelectItem value="2.4m">2.4m</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="incDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>INC Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {IndianStates.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="Region" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="Zone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="formNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form No</FormLabel>
                    <FormControl>
                      <Input placeholder="F-100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inside"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Inside Premises</FormLabel>
                      <CardDescription>Is the site inside a building?</CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
             </CardContent>
          </Card>

          <Card>
            <CardHeader>
               <CardTitle>Financials & Remarks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="siteAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendorAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="softAtRemark"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Soft AT Remark</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Remark..." {...field} />
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
            <Button type="submit" size="lg">Register Site</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
