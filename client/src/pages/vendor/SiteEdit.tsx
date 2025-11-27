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
  vendorId: z.string().optional(),
  zoneId: z.string().optional(),
  siteId: z.string().optional(),
  sno: z.string().optional(),
  circle: z.string().optional(),
  planId: z.string().optional(),
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

export default function SiteEdit() {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const form = useForm<z.infer<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch zones and vendors first
        const [zonesRes, vendorsRes] = await Promise.all([
          fetch('/api/zones?pageSize=10000'),
          fetch('/api/vendors?pageSize=10000'),
        ]);
        
        let loadedZones: any[] = [];
        let loadedVendors: any[] = [];

        if (zonesRes.ok) {
          const data = await zonesRes.json();
          loadedZones = data.data || [];
          setZones(loadedZones);
        }
        if (vendorsRes.ok) {
          const data = await vendorsRes.json();
          loadedVendors = data.data || [];
          setVendors(loadedVendors);
        }
        
        // Then fetch the site with loaded zones data
        if (id) {
          await fetchSite(loadedZones);
        }
      } catch (error) {
        console.error('Failed to load data');
      }
    };
    loadData();
  }, [id]);

  const fetchSite = async (loadedZones: any[] = []) => {
    try {
      const response = await fetch(`/api/sites/${id}`);
      if (!response.ok) throw new Error('Site not found');
      const site = await response.json();
      
      // Match circle by short name with circles loaded from Circle Master
      let finalZoneId = site.zoneId;
      if (!finalZoneId && site.circle && loadedZones.length > 0) {
        const matchedZone = loadedZones.find(z => z.shortName === site.circle);
        if (matchedZone) {
          finalZoneId = matchedZone.id;
        }
      }
      
      form.reset({
        ...site,
        zoneId: finalZoneId || undefined,
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load site', variant: 'destructive' });
      setLocation('/vendor/site-list');
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
      setLocation('/vendor/site-list');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Site</h2>
        <p className="text-muted-foreground">Update comprehensive site information.</p>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Circle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Circle" />
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
              {renderField(form, 'circle', 'Circle')}
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
              {renderField(form, 'mediaAvailabilityStatus', 'Media Availability Status')}
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

          {/* SO and RFAI Dates */}
          <Card>
            <CardHeader>
              <CardTitle>SO & RFAI Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'soReleasedDateSiteA', 'SO Released Date Site A', 'date')}
              {renderField(form, 'soReleasedDateSiteB', 'SO Released Date Site B', 'date')}
              {renderField(form, 'hopSoDate', 'HOP SO Date', 'date')}
              {renderField(form, 'rfaiOfferedDateSiteA', 'RFAI Offered Date Site A', 'date')}
              {renderField(form, 'rfaiOfferedDateSiteB', 'RFAI Offered Date Site B', 'date')}
              {renderField(form, 'actualHopRfaiOfferedDate', 'Actual HOP RFAI Offered Date', 'date')}
              {renderField(form, 'partnerName', 'Partner Name')}
              {renderField(form, 'rfaiSurveyCompletionDate', 'RFAI Survey Completion Date', 'date')}
            </CardContent>
          </Card>

          {/* MO Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Material Order (MO) Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'moNumberSiteA', 'MO Number Site A')}
              {renderField(form, 'materialTypeSiteA', 'Material Type Site A')}
              {renderField(form, 'moDateSiteA', 'MO Date Site A', 'date')}
              {renderField(form, 'moNumberSiteB', 'MO Number Site B')}
              {renderField(form, 'materialTypeSiteB', 'Material Type Site B')}
              {renderField(form, 'moDateSiteB', 'MO Date Site B', 'date')}
              {renderField(form, 'srnRmoNumber', 'SRN RMO Number')}
              {renderField(form, 'srnRmoDate', 'SRN RMO Date', 'date')}
            </CardContent>
          </Card>

          {/* HOP Dispatch & Delivery */}
          <Card>
            <CardHeader>
              <CardTitle>HOP Material Dispatch & Delivery</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'hopMoDate', 'HOP MO Date', 'date')}
              {renderField(form, 'hopMaterialDispatchDate', 'HOP Material Dispatch Date', 'date')}
              {renderField(form, 'hopMaterialDeliveryDate', 'HOP Material Delivery Date', 'date')}
              {renderField(form, 'materialDeliveryStatus', 'Material Delivery Status')}
            </CardContent>
          </Card>

          {/* Installation & PTW */}
          <Card>
            <CardHeader>
              <CardTitle>Installation & PTW</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'siteAInstallationDate', 'Site A Installation Date', 'date')}
              {renderField(form, 'ptwNumberSiteA', 'PTW Number Site A')}
              {renderField(form, 'ptwStatusA', 'PTW Status A')}
              {renderField(form, 'siteBInstallationDate', 'Site B Installation Date', 'date')}
              {renderField(form, 'ptwNumberSiteB', 'PTW Number Site B')}
              {renderField(form, 'ptwStatusB', 'PTW Status B')}
              {renderField(form, 'hopIcDate', 'HOP IC Date', 'date')}
              {renderField(form, 'alignmentDate', 'Alignment Date', 'date')}
            </CardContent>
          </Card>

          {/* IC & NMS */}
          <Card>
            <CardHeader>
              <CardTitle>IC & NMS Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'hopInstallationRemarks', 'HOP Installation Remarks')}
              {renderField(form, 'visibleInNms', 'Visible in NMS')}
              {renderField(form, 'nmsVisibleDate', 'NMS Visible Date', 'date')}
            </CardContent>
          </Card>

          {/* AT Status */}
          <Card>
            <CardHeader>
              <CardTitle>AT Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'softAtOfferDate', 'Soft AT Offer Date', 'date')}
              {renderField(form, 'softAtAcceptanceDate', 'Soft AT Acceptance Date', 'date')}
              {renderField(form, 'softAtStatus', 'Soft AT Status')}
              {renderField(form, 'phyAtOfferDate', 'Physical AT Offer Date', 'date')}
              {renderField(form, 'phyAtAcceptanceDate', 'Physical AT Acceptance Date', 'date')}
              {renderField(form, 'phyAtStatus', 'Physical AT Status')}
              {renderField(form, 'bothAtStatus', 'Both AT Status')}
            </CardContent>
          </Card>

          {/* PRI & Other */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Issue & Other Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'priIssueCategory', 'PRI Issue Category')}
              {renderField(form, 'priSiteId', 'PRI Site ID')}
              {renderField(form, 'priOpenDate', 'PRI Open Date', 'date')}
              {renderField(form, 'priCloseDate', 'PRI Close Date', 'date')}
              {renderField(form, 'priHistory', 'PRI History')}
              {renderField(form, 'rfiSurveyAllocationDate', 'RFI Survey Allocation Date', 'date')}
              {renderField(form, 'descope', 'Descope')}
              {renderField(form, 'reasonOfExtraVisit', 'Reason of Extra Visit')}
            </CardContent>
          </Card>

          {/* WCC Status */}
          <Card>
            <CardHeader>
              <CardTitle>WCC Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-4">
              {renderField(form, 'wccReceived80Percent', 'WCC Received 80%')}
              {renderField(form, 'wccReceivedDate80Percent', 'WCC Received Date 80%', 'date')}
              {renderField(form, 'wccReceived20Percent', 'WCC Received 20%')}
              {renderField(form, 'wccReceivedDate20Percent', 'WCC Received Date 20%', 'date')}
              {renderField(form, 'wccReceivedDate100Percent', 'WCC Received Date 100%', 'date')}
            </CardContent>
          </Card>

          {/* Survey */}
          <Card>
            <CardHeader>
              <CardTitle>Survey Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {renderField(form, 'survey', 'Survey')}
              {renderField(form, 'finalPartnerSurvey', 'Final Partner Survey')}
              {renderField(form, 'surveyDate', 'Survey Date', 'date')}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" size="lg">
              Update Site
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
