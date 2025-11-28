import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { fetchWithLoader } from '@/lib/fetchWithLoader';
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
  circle: z.string().optional(),
  planId: z.string().optional(),
  siteAmount: z.string().optional(),
  vendorAmount: z.string().optional(),
  sno: z.string().optional(),
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

// All 81 fields organized in groups (matching PDF export layout)
const fieldGroups = [
  {
    title: 'Site Identification',
    fields: ['vendorId', 'siteId', 'zoneId', 'planId', 'circle', 'siteAmount', 'vendorAmount', 'sno']
  },
  {
    title: 'Project Information',
    fields: ['nominalAop', 'hopType', 'hopAB', 'hopBA', 'district', 'project']
  },
  {
    title: 'Site A Details',
    fields: ['siteAName', 'siteAAntDia', 'tocoVendorA', 'tocoIdA']
  },
  {
    title: 'Site B Details',
    fields: ['siteBName', 'siteBAntDia', 'tocoVendorB', 'tocoIdB', 'maxAntSize', 'mediaAvailabilityStatus']
  },
  {
    title: 'Service Readiness & Survey Dates',
    fields: ['srNoSiteA', 'srDateSiteA', 'srNoSiteB', 'srDateSiteB', 'hopSrDate']
  },
  {
    title: 'Service Planning & Sales Order',
    fields: ['spDateSiteA', 'spDateSiteB', 'hopSpDate', 'soReleasedDateSiteA', 'soReleasedDateSiteB', 'hopSoDate']
  },
  {
    title: 'RFAI & Partner Information',
    fields: ['rfaiOfferedDateSiteA', 'rfaiOfferedDateSiteB', 'actualHopRfaiOfferedDate', 'partnerName', 'rfaiSurveyCompletionDate']
  },
  {
    title: 'Material Orders',
    fields: ['moNumberSiteA', 'materialTypeSiteA', 'moDateSiteA', 'moNumberSiteB', 'materialTypeSiteB', 'moDateSiteB', 'srnRmoNumber', 'srnRmoDate', 'hopMoDate']
  },
  {
    title: 'Material Delivery & Status',
    fields: ['hopMaterialDispatchDate', 'hopMaterialDeliveryDate', 'materialDeliveryStatus']
  },
  {
    title: 'Site A Installation',
    fields: ['siteAInstallationDate', 'ptwNumberSiteA', 'ptwStatusA']
  },
  {
    title: 'Site B Installation',
    fields: ['siteBInstallationDate', 'ptwNumberSiteB', 'ptwStatusB']
  },
  {
    title: 'Installation & Commissioning',
    fields: ['hopIcDate', 'alignmentDate', 'hopInstallationRemarks']
  },
  {
    title: 'NMS Visibility',
    fields: ['visibleInNms', 'nmsVisibleDate']
  },
  {
    title: 'Acceptance Testing (AT)',
    fields: ['softAtOfferDate', 'softAtAcceptanceDate', 'softAtStatus', 'phyAtOfferDate', 'phyAtAcceptanceDate', 'phyAtStatus', 'bothAtStatus']
  },
  {
    title: 'PRI & Survey',
    fields: ['priIssueCategory', 'priSiteId', 'priOpenDate', 'priCloseDate', 'priHistory', 'rfiSurveyAllocationDate', 'descope', 'reasonOfExtraVisit']
  },
  {
    title: 'WCC Information',
    fields: ['wccReceived80Percent', 'wccReceivedDate80Percent', 'wccReceived20Percent', 'wccReceivedDate20Percent', 'wccReceivedDate100Percent']
  },
  {
    title: 'Survey Details',
    fields: ['survey', 'finalPartnerSurvey', 'surveyDate']
  }
];

const fieldConfig: { [key: string]: { label: string; type: string; isSelect?: boolean; isTextarea?: boolean } } = {
  vendorId: { label: 'Vendor', type: 'select' },
  siteId: { label: 'Site ID', type: 'text' },
  zoneId: { label: 'Zone/Circle', type: 'select' },
  planId: { label: 'Plan ID', type: 'text' },
  circle: { label: 'Circle', type: 'text' },
  siteAmount: { label: 'Site Amount', type: 'number' },
  vendorAmount: { label: 'Vendor Amount', type: 'number' },
  sno: { label: 'S.No', type: 'number' },
  nominalAop: { label: 'Nominal AOP', type: 'text' },
  hopType: { label: 'HOP Type', type: 'text' },
  hopAB: { label: 'HOP A-B', type: 'text' },
  hopBA: { label: 'HOP B-A', type: 'text' },
  district: { label: 'District', type: 'text' },
  project: { label: 'Project', type: 'text' },
  siteAAntDia: { label: 'Site A Ant Diameter', type: 'text' },
  siteBAntDia: { label: 'Site B Ant Diameter', type: 'text' },
  maxAntSize: { label: 'Max Ant Size', type: 'text' },
  siteAName: { label: 'Site A Name', type: 'text' },
  tocoVendorA: { label: 'TOCO Vendor A', type: 'text' },
  tocoIdA: { label: 'TOCO ID A', type: 'text' },
  siteBName: { label: 'Site B Name', type: 'text' },
  tocoVendorB: { label: 'TOCO Vendor B', type: 'text' },
  tocoIdB: { label: 'TOCO ID B', type: 'text' },
  mediaAvailabilityStatus: { label: 'Media Availability', type: 'text' },
  srNoSiteA: { label: 'SR No Site A', type: 'text' },
  srDateSiteA: { label: 'SR Date Site A', type: 'date' },
  srNoSiteB: { label: 'SR No Site B', type: 'text' },
  srDateSiteB: { label: 'SR Date Site B', type: 'date' },
  hopSrDate: { label: 'HOP SR Date', type: 'date' },
  spDateSiteA: { label: 'SP Date Site A', type: 'date' },
  spDateSiteB: { label: 'SP Date Site B', type: 'date' },
  hopSpDate: { label: 'HOP SP Date', type: 'date' },
  soReleasedDateSiteA: { label: 'SO Released Date A', type: 'date' },
  soReleasedDateSiteB: { label: 'SO Released Date B', type: 'date' },
  hopSoDate: { label: 'HOP SO Date', type: 'date' },
  rfaiOfferedDateSiteA: { label: 'RFAI Offered Date A', type: 'date' },
  rfaiOfferedDateSiteB: { label: 'RFAI Offered Date B', type: 'date' },
  actualHopRfaiOfferedDate: { label: 'Actual HOP RFAI Date', type: 'date' },
  partnerName: { label: 'Partner Name', type: 'text' },
  rfaiSurveyCompletionDate: { label: 'RFAI Survey Completion', type: 'date' },
  moNumberSiteA: { label: 'MO Number Site A', type: 'text' },
  materialTypeSiteA: { label: 'Material Type Site A', type: 'text' },
  moDateSiteA: { label: 'MO Date Site A', type: 'date' },
  moNumberSiteB: { label: 'MO Number Site B', type: 'text' },
  materialTypeSiteB: { label: 'Material Type Site B', type: 'text' },
  moDateSiteB: { label: 'MO Date Site B', type: 'date' },
  srnRmoNumber: { label: 'SRN/RMO Number', type: 'text' },
  srnRmoDate: { label: 'SRN/RMO Date', type: 'date' },
  hopMoDate: { label: 'HOP MO Date', type: 'date' },
  hopMaterialDispatchDate: { label: 'HOP Material Dispatch', type: 'date' },
  hopMaterialDeliveryDate: { label: 'HOP Material Delivery', type: 'date' },
  materialDeliveryStatus: { label: 'Material Delivery Status', type: 'text' },
  siteAInstallationDate: { label: 'Site A Installation Date', type: 'date' },
  ptwNumberSiteA: { label: 'PTW Number Site A', type: 'text' },
  ptwStatusA: { label: 'PTW Status A', type: 'text' },
  siteBInstallationDate: { label: 'Site B Installation Date', type: 'date' },
  ptwNumberSiteB: { label: 'PTW Number Site B', type: 'text' },
  ptwStatusB: { label: 'PTW Status B', type: 'text' },
  hopIcDate: { label: 'HOP I&C Date', type: 'date' },
  alignmentDate: { label: 'Alignment Date', type: 'date' },
  hopInstallationRemarks: { label: 'Installation Remarks', type: 'text', isTextarea: true },
  visibleInNms: { label: 'Visible in NMS', type: 'text' },
  nmsVisibleDate: { label: 'NMS Visible Date', type: 'date' },
  softAtOfferDate: { label: 'SOFT-AT Offer Date', type: 'date' },
  softAtAcceptanceDate: { label: 'SOFT-AT Acceptance Date', type: 'date' },
  softAtStatus: { label: 'SOFT-AT Status', type: 'text' },
  phyAtOfferDate: { label: 'PHY-AT Offer Date', type: 'date' },
  phyAtAcceptanceDate: { label: 'PHY-AT Acceptance Date', type: 'date' },
  phyAtStatus: { label: 'PHY-AT Status', type: 'text' },
  bothAtStatus: { label: 'Both AT Status', type: 'text' },
  priIssueCategory: { label: 'PRI Issue Category', type: 'text' },
  priSiteId: { label: 'PRI Site ID', type: 'text' },
  priOpenDate: { label: 'PRI Open Date', type: 'date' },
  priCloseDate: { label: 'PRI Close Date', type: 'date' },
  priHistory: { label: 'PRI History', type: 'text', isTextarea: true },
  rfiSurveyAllocationDate: { label: 'RFI Survey Allocation Date', type: 'date' },
  descope: { label: 'Descope', type: 'text' },
  reasonOfExtraVisit: { label: 'Reason of Extra Visit', type: 'text', isTextarea: true },
  wccReceived80Percent: { label: 'WCC Received 80%', type: 'text' },
  wccReceivedDate80Percent: { label: 'WCC Date 80%', type: 'date' },
  wccReceived20Percent: { label: 'WCC Received 20%', type: 'text' },
  wccReceivedDate20Percent: { label: 'WCC Date 20%', type: 'date' },
  wccReceivedDate100Percent: { label: 'WCC Date 100%', type: 'date' },
  survey: { label: 'Survey', type: 'text' },
  finalPartnerSurvey: { label: 'Final Partner Survey', type: 'text' },
  surveyDate: { label: 'Survey Date', type: 'date' },
};

export default function SiteManagement() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [zones, setZones] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof siteSchema>>({
    resolver: zodResolver(siteSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zonesRes, vendorsRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/zones?pageSize=10000`),
          fetch(`${getApiBaseUrl()}/api/vendors?pageSize=10000`),
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
        console.error('Failed to load data');
      }
    };
    fetchData();
  }, []);

  async function onSubmit(values: z.infer<typeof siteSchema>) {
    try {
      setSubmitting(true);
      const response = await fetchWithLoader(
        `${getApiBaseUrl()}/api/sites`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Site created successfully',
        });
        setLocation('/vendor/sites');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to create site',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create site',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const renderField = (name: string) => {
    const config = fieldConfig[name];
    if (!config) return null;

    if (config.type === 'select') {
      return (
        <FormField
          key={name}
          control={form.control}
          name={name as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{config.label}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid={`select-${name}`}>
                    <SelectValue placeholder={`Select ${config.label}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {name === 'vendorId' ? vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  )) : zones.map(z => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (config.isTextarea) {
      return (
        <FormField
          key={name}
          control={form.control}
          name={name as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{config.label}</FormLabel>
              <FormControl>
                <Textarea placeholder={config.label} {...field} data-testid={`textarea-${name}`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    return (
      <FormField
        key={name}
        control={form.control}
        name={name as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{config.label}</FormLabel>
            <FormControl>
              <Input 
                type={config.type} 
                placeholder={config.label} 
                {...field} 
                data-testid={`input-${name}`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Site Management</h2>
        <p className="text-muted-foreground">Create and manage HOP sites with all 81 fields organized vertically</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Render all field groups */}
          {fieldGroups.map((group, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-lg">{group.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.fields.map(fieldName => renderField(fieldName))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-4 sticky bottom-0 bg-background p-4 border-t rounded">
            <Button 
              type="submit" 
              size="lg" 
              disabled={submitting}
              data-testid="button-submit-site"
            >
              {submitting ? 'Creating...' : 'Create Site'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="lg" 
              onClick={() => setLocation('/vendor/sites')}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
