import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/mockData';
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

const siteSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  siteId: z.string().min(2, 'Site ID is required'),
  planId: z.string().min(2, 'Plan ID is required'),
  circle: z.string().optional(),
  hopAB: z.string().optional(),
  maxAntSize: z.string().optional(),
  status: z.string().optional(),
});

const renderField = (form: any, name: string, label: string, type: string = 'text') => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input type={type} placeholder={label} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export default function SiteEdit() {
  const { id } = useParams() as { id: string };
  const { vendors } = useStore();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
  });

  useEffect(() => {
    fetchSite();
  }, [id]);

  const fetchSite = async () => {
    try {
      const response = await fetch(`/api/sites/${id}`);
      if (!response.ok) throw new Error('Site not found');
      const site = await response.json();
      form.reset(site);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load site', variant: 'destructive' });
      setLocation('/vendor/sites');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof siteSchema>) => {
    try {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Failed to update');
      toast({ title: 'Success', description: 'Site updated successfully' });
      setLocation('/vendor/sites');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Site</h2>
        <p className="text-muted-foreground">Update site information.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vendor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderField(form, 'siteId', 'Site ID *')}
              {renderField(form, 'planId', 'Plan ID *')}
              {renderField(form, 'circle', 'Circle')}
              {renderField(form, 'hopAB', 'HOP A-B')}
              {renderField(form, 'maxAntSize', 'Max Antenna Size')}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
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

          <div className="flex gap-4">
            <Button type="submit" size="lg">
              Update Site
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => setLocation('/vendor/sites')}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
