import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useState, useRef } from 'react';
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
  sno: z.string().optional(),
  circle: z.string().optional(),
  planId: z.string().min(2, 'Plan ID is required'),
  nominalAop: z.string().optional(),
  hopType: z.string().optional(),
  hopAB: z.string().optional(),
  hopBA: z.string().optional(),
  district: z.string().optional(),
  project: z.string().optional(),
  siteAAntDia: z.string().optional(),
  siteBAntDia: z.string().optional(),
  maxAntSize: z.string().optional(),
  siteAName: z.string().optional(),
  tocoVendorA: z.string().optional(),
  tocoIdA: z.string().optional(),
  siteBName: z.string().optional(),
  tocoVendorB: z.string().optional(),
  tocoIdB: z.string().optional(),
  mediaAvailabilityStatus: z.string().optional(),
  srNoSiteA: z.string().optional(),
  srDateSiteA: z.string().optional(),
  srNoSiteB: z.string().optional(),
  srDateSiteB: z.string().optional(),
  hopSrDate: z.string().optional(),
  spDateSiteA: z.string().optional(),
  spDateSiteB: z.string().optional(),
  hopSpDate: z.string().optional(),
  soReleasedDateSiteA: z.string().optional(),
  soReleasedDateSiteB: z.string().optional(),
  hopSoDate: z.string().optional(),
  rfaiOfferedDateSiteA: z.string().optional(),
  rfaiOfferedDateSiteB: z.string().optional(),
  actualHopRfaiOfferedDate: z.string().optional(),
  partnerName: z.string().optional(),
  rfaiSurveyCompletionDate: z.string().optional(),
  moNumberSiteA: z.string().optional(),
  materialTypeSiteA: z.string().optional(),
  moDateSiteA: z.string().optional(),
  moNumberSiteB: z.string().optional(),
  materialTypeSiteB: z.string().optional(),
  moDateSiteB: z.string().optional(),
  srnRmoNumber: z.string().optional(),
  srnRmoDate: z.string().optional(),
  hopMoDate: z.string().optional(),
  hopMaterialDispatchDate: z.string().optional(),
  hopMaterialDeliveryDate: z.string().optional(),
  materialDeliveryStatus: z.string().optional(),
  siteAInstallationDate: z.string().optional(),
  ptwNumberSiteA: z.string().optional(),
  ptwStatusA: z.string().optional(),
  siteBInstallationDate: z.string().optional(),
  ptwNumberSiteB: z.string().optional(),
  ptwStatusB: z.string().optional(),
  hopIcDate: z.string().optional(),
  alignmentDate: z.string().optional(),
  hopInstallationRemarks: z.string().optional(),
  visibleInNms: z.string().optional(),
  nmsVisibleDate: z.string().optional(),
  softAtOfferDate: z.string().optional(),
  softAtAcceptanceDate: z.string().optional(),
  softAtStatus: z.string().optional(),
  phyAtOfferDate: z.string().optional(),
  phyAtAcceptanceDate: z.string().optional(),
  phyAtStatus: z.string().optional(),
  bothAtStatus: z.string().optional(),
  priIssueCategory: z.string().optional(),
  priSiteId: z.string().optional(),
  priOpenDate: z.string().optional(),
  priCloseDate: z.string().optional(),
  priHistory: z.string().optional(),
  rfiSurveyAllocationDate: z.string().optional(),
  descope: z.string().optional(),
  reasonOfExtraVisit: z.string().optional(),
  wccReceived80Percent: z.string().optional(),
  wccReceivedDate80Percent: z.string().optional(),
  wccReceived20Percent: z.string().optional(),
  wccReceivedDate20Percent: z.string().optional(),
  wccReceivedDate100Percent: z.string().optional(),
  survey: z.string().optional(),
  finalPartnerSurvey: z.string().optional(),
  surveyDate: z.string().optional(),
});

export default function SiteRegistration() {
  const { addSite, vendors } = useStore();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [stateSearch, setStateSearch] = useState('');
  const [stateHighlight, setStateHighlight] = useState(-1);
  const stateInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      inside: false,
    },
  });

  const filteredStates = IndianStates.filter(s => 
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

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
                      <Input autoFocus placeholder="e.g. DL-1001" {...field} />
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
