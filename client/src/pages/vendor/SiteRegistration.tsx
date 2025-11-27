import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
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

const siteSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  zoneId: z.string().optional(),
  siteId: z.string().min(2, 'Site ID is required'),
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

const renderField = (form: any, name: string, label: string, type: 'text' | 'date' | 'number' = 'text') => (
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

export default function SiteRegistration() {
  const { addSite } = useStore();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [zones, setZones] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zonesRes, vendorsRes] = await Promise.all([
          fetch('/api/zones?pageSize=10000'),
          fetch('/api/vendors?pageSize=10000'),
        ]);
        
        if (zonesRes.ok) {
          const data = await zonesRes.json();
          setZones(data.data || []);
        }
        if (vendorsRes.ok) {
          const data = await vendorsRes.json();
          setVendors(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load zones or vendors');
      }
    };
    fetchData();
  }, []);

  const form = useForm<z.infer<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
  });

  function onSubmit(values: z.infer<typeof siteSchema>) {
    addSite({
      ...values,
      siteAmount: 0,
      vendorAmount: 0,
      status: 'Pending',
    });
    
    toast({
      title: 'Site Registered',
      description: 'New site has been successfully registered.',
    });
    
    setLocation('/vendor/site-list');
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Site Registration</h2>
        <p className="text-muted-foreground">Register a new HOP site with comprehensive details.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Site Identification */}
          <Card>
            <CardHeader>
              <CardTitle>Site Identification</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vendor *</FormLabel>
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
              {renderField(form, 'siteId', 'Site ID *')}
              {renderField(form, 'sno', 'S.No.')}
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Zone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {zones.map(zone => (
                          <SelectItem key={zone.id} value={zone.id}>{zone.name} ({zone.shortName})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderField(form, 'planId', 'Plan ID *')}
              {renderField(form, 'project', 'Project')}
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'nominalAop', 'Nominal AOP')}
              {renderField(form, 'hopType', 'HOP Type')}
              {renderField(form, 'hopAB', 'HOP A-B')}
              {renderField(form, 'hopBA', 'HOP B-A')}
              {renderField(form, 'district', 'District')}
            </CardContent>
          </Card>

          {/* Site A Details */}
          <Card>
            <CardHeader>
              <CardTitle>Site A Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'siteAName', 'Site A Name')}
              {renderField(form, 'siteAAntDia', 'Site A Antenna Dia')}
              {renderField(form, 'tocoVendorA', 'TOCO Vendor A')}
              {renderField(form, 'tocoIdA', 'TOCO ID A')}
            </CardContent>
          </Card>

          {/* Site B Details */}
          <Card>
            <CardHeader>
              <CardTitle>Site B Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'siteBName', 'Site B Name')}
              {renderField(form, 'siteBAntDia', 'Site B Antenna Dia')}
              {renderField(form, 'tocoVendorB', 'TOCO Vendor B')}
              {renderField(form, 'tocoIdB', 'TOCO ID B')}
              {renderField(form, 'maxAntSize', 'Max Antenna Size')}
            </CardContent>
          </Card>

          {/* SR, SP, SO Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Service Request & Survey Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'srNoSiteA', 'SR No Site A')}
              {renderField(form, 'srDateSiteA', 'SR Date Site A', 'date')}
              {renderField(form, 'srNoSiteB', 'SR No Site B')}
              {renderField(form, 'srDateSiteB', 'SR Date Site B', 'date')}
              {renderField(form, 'hopSrDate', 'HOP SR Date', 'date')}
              {renderField(form, 'spDateSiteA', 'SP Date Site A', 'date')}
              {renderField(form, 'spDateSiteB', 'SP Date Site B', 'date')}
              {renderField(form, 'hopSpDate', 'HOP SP Date', 'date')}
            </CardContent>
          </Card>

          {/* SO & RFAI */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Order & RFAI</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'soReleasedDateSiteA', 'SO Released Date A', 'date')}
              {renderField(form, 'soReleasedDateSiteB', 'SO Released Date B', 'date')}
              {renderField(form, 'hopSoDate', 'HOP SO Date', 'date')}
              {renderField(form, 'rfaiOfferedDateSiteA', 'RFAI Offered Date A', 'date')}
              {renderField(form, 'rfaiOfferedDateSiteB', 'RFAI Offered Date B', 'date')}
              {renderField(form, 'actualHopRfaiOfferedDate', 'Actual HOP RFAI Offered', 'date')}
              {renderField(form, 'partnerName', 'Partner Name')}
              {renderField(form, 'rfaiSurveyCompletionDate', 'RFAI Survey Completion', 'date')}
            </CardContent>
          </Card>

          {/* Material Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Material Orders</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'moNumberSiteA', 'MO Number Site A')}
              {renderField(form, 'materialTypeSiteA', 'Material Type Site A')}
              {renderField(form, 'moDateSiteA', 'MO Date Site A', 'date')}
              {renderField(form, 'moNumberSiteB', 'MO Number Site B')}
              {renderField(form, 'materialTypeSiteB', 'Material Type Site B')}
              {renderField(form, 'moDateSiteB', 'MO Date Site B', 'date')}
              {renderField(form, 'srnRmoNumber', 'SRN/RMO Number')}
              {renderField(form, 'srnRmoDate', 'SRN/RMO Date', 'date')}
              {renderField(form, 'hopMoDate', 'HOP MO Date', 'date')}
            </CardContent>
          </Card>

          {/* Material Delivery & Installation */}
          <Card>
            <CardHeader>
              <CardTitle>Material Delivery & Installation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'hopMaterialDispatchDate', 'HOP Material Dispatch', 'date')}
              {renderField(form, 'hopMaterialDeliveryDate', 'HOP Material Delivery', 'date')}
              {renderField(form, 'materialDeliveryStatus', 'Material Delivery Status')}
              {renderField(form, 'mediaAvailabilityStatus', 'Media Availability Status')}
              {renderField(form, 'siteAInstallationDate', 'Site A Installation Date', 'date')}
              {renderField(form, 'ptwNumberSiteA', 'PTW Number Site A')}
              {renderField(form, 'ptwStatusA', 'PTW Status A')}
              {renderField(form, 'siteBInstallationDate', 'Site B Installation Date', 'date')}
            </CardContent>
          </Card>

          {/* PTW & Alignment */}
          <Card>
            <CardHeader>
              <CardTitle>PTW & Alignment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'ptwNumberSiteB', 'PTW Number Site B')}
              {renderField(form, 'ptwStatusB', 'PTW Status B')}
              {renderField(form, 'hopIcDate', 'HOP I&C Date', 'date')}
              {renderField(form, 'alignmentDate', 'Alignment Date', 'date')}
            </CardContent>
          </Card>

          {/* NMS Visibility */}
          <Card>
            <CardHeader>
              <CardTitle>NMS Visibility</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {renderField(form, 'visibleInNms', 'Visible in NMS')}
              {renderField(form, 'nmsVisibleDate', 'NMS Visible Date', 'date')}
            </CardContent>
          </Card>

          {/* Acceptance Testing */}
          <Card>
            <CardHeader>
              <CardTitle>Acceptance Testing (AT)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'softAtOfferDate', 'SOFT-AT Offer Date', 'date')}
              {renderField(form, 'softAtAcceptanceDate', 'SOFT-AT Acceptance', 'date')}
              {renderField(form, 'softAtStatus', 'SOFT-AT Status')}
              {renderField(form, 'phyAtOfferDate', 'PHY-AT Offer Date', 'date')}
              {renderField(form, 'phyAtAcceptanceDate', 'PHY-AT Acceptance', 'date')}
              {renderField(form, 'phyAtStatus', 'PHY-AT Status')}
              {renderField(form, 'bothAtStatus', 'Both AT Status')}
            </CardContent>
          </Card>

          {/* PRI & Survey */}
          <Card>
            <CardHeader>
              <CardTitle>PRI & Survey Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'priIssueCategory', 'PRI Issue Category')}
              {renderField(form, 'priSiteId', 'PRI Site ID')}
              {renderField(form, 'priOpenDate', 'PRI Open Date', 'date')}
              {renderField(form, 'priCloseDate', 'PRI Close Date', 'date')}
              {renderField(form, 'rfiSurveyAllocationDate', 'RFI Survey Allocation', 'date')}
              {renderField(form, 'descope', 'Descope')}
              {renderField(form, 'survey', 'Survey')}
              {renderField(form, 'finalPartnerSurvey', 'Final Partner Survey')}
              {renderField(form, 'surveyDate', 'Survey Date', 'date')}
            </CardContent>
          </Card>

          {/* WCC Information */}
          <Card>
            <CardHeader>
              <CardTitle>WCC (Work Completion Certificate)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'wccReceived80Percent', 'WCC Received 80%')}
              {renderField(form, 'wccReceivedDate80Percent', 'WCC Date 80%', 'date')}
              {renderField(form, 'wccReceived20Percent', 'WCC Received 20%')}
              {renderField(form, 'wccReceivedDate20Percent', 'WCC Date 20%', 'date')}
              {renderField(form, 'wccReceivedDate100Percent', 'WCC Date 100%', 'date')}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" size="lg" data-testid="button-submit">
              Register Site
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => setLocation('/vendor/site-list')}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
