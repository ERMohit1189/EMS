import { useEffect, useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import FaqBox from './FaqBox';
import { getApiBaseUrl } from '@/lib/api';
import defaultFaqsMap from '@/lib/defaultFaqs';

function mapPathToKey(path: string) {
  if (path.startsWith('/vendor/credentials')) return 'vendorCredentials_faqs';
  if (path.startsWith('/vendor/list')) return 'vendor_all_faqs';
  if (path.startsWith('/vendor/register')) return 'vendor_register_faqs';
  if (path.startsWith('/vendor/po')) return 'poGeneration_faqs';
  if (path.startsWith('/vendor/invoices')) return 'invoiceGeneration_faqs';
  if (path.startsWith('/vendor/payment-master')) return 'paymentMaster_faqs';
  if (path.startsWith('/help')) return 'overview_faqs';
  return 'overview_faqs';
}

export default function FabFaq() {
  // Quick FAQs are temporarily disabled until the feature is stable.
  // Returning null prevents rendering/mounting and any network calls.
  return null;

  // const [location] = useLocation();
  // const [open, setOpen] = useState(false);
  // const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>([]);
  // const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   if (!open) return;
  //   const key = mapPathToKey(location || '/');

  //   // Immediately show bundled defaults for this page while we try to fetch server overrides
  //   setFaqs(defaultFaqsMap[key] ?? []);
  //   setLoading(true);

  //   (async () => {
  //     try {
  //       const res = await fetch(`${getApiBaseUrl()}/api/help`, { credentials: 'include' });
  //       if (res.ok) {
  //         const data = await res.json();
  //         let items = data[key];
  //         // Prefer non-empty server arrays; otherwise keep the bundled defaults
  //         if (Array.isArray(items) && items.length > 0) {
  //           setFaqs(items);
  //         }
  //       } else {
  //         // Non-ok response: leave bundled defaults in place and log
  //         console.warn('Help API returned non-ok response for FAQs', res.status);
  //       }
  //     } catch (err) {
  //       console.error('Failed to load FAQs', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, [open, location]);

  return (
    <div>
      <div className="fixed right-5 bottom-5 z-50">
        <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-full h-12 w-12 p-0 flex items-center justify-center">?
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Quick FAQs</DialogTitle>
              <DialogDescription>Short answers for this page. Open full Help Center for more details.</DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="p-4">Loading...</div>
            ) : faqs.length ? (
              <FaqBox items={faqs} />
            ) : (
              <div className="p-4 text-sm text-muted-foreground">No quick FAQs available for this page. Open Help Center for full docs.</div>
            )}

            <div className="mt-4 flex justify-end">
              <a href="/help" className="text-sm text-blue-600">Open Help Center</a>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
