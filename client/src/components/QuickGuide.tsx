import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const items = [
  { title: 'Vendor Credentials', href: '/vendor/credentials', desc: 'Generate or reset vendor login passwords, copy credentials.' },
  { title: 'All Vendors', href: '/vendor/list', desc: 'Search, filter and bulk-manage vendor records.' },
  { title: 'Register Vendor', href: '/vendor/register', desc: 'Create new vendor records with validations.' },
  { title: 'PO Generation', href: '/vendor/po', desc: 'Bulk-generate Purchase Orders for approved sites.' },
  { title: 'Invoice Generation', href: '/vendor/invoices', desc: 'Create invoices from POs and export PDFs.' },
  { title: 'Payment Master', href: '/vendor/payment-master', desc: 'Record and reconcile payments against invoices.' },
];

export default function QuickGuide() {
  // Quick Guide disabled until implementation is stable. Returning null prevents UI and localStorage side-effects.
  return null;

  // Original implementation commented out for future rework.
  // const [, setLocation] = useLocation();
  // const [open, setOpen] = useState(false);
  // const [dontShow, setDontShow] = useState(false);
  // ...
}
