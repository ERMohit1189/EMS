export type FaqItem = { q: string; a: string };

export const defaultVendorCredentialsFaqs: FaqItem[] = [
  { q: 'How do I generate a temporary password for a vendor?', a: 'Open Vendor Credentials, select a vendor, and click Generate. The temporary password is shown once—copy it immediately.' },
  { q: 'Can I reset a vendor password multiple times?', a: 'Yes. Each reset generates a new temporary password; previous temporary passwords are invalidated.' },
  { q: 'Where are passwords stored?', a: 'Passwords are stored server-side in hashed form; only temporary plaintext values are shown at generation time.' },
  { q: 'How do vendors log in for the first time?', a: 'Share the temporary password and ask them to change it after first login.' },
  { q: 'Who can access this feature?', a: 'Only admin users with appropriate permissions can generate/reset vendor credentials.' },
  { q: 'Can I bulk-generate passwords for many vendors?', a: 'Bulk password generation is not recommended; generate per-vendor to ensure secure sharing.' },
  { q: 'How do I securely share temporary passwords?', a: 'Use secure channels (encrypted email or internal comms) and avoid pasting in public chat.' },
  { q: 'Are temporary passwords subject to complexity rules?', a: 'Temporary passwords follow system complexity; you can enforce stronger rules in settings.' },
  { q: 'Can vendors change their temporary password?', a: 'Yes—vendors should change the password after first login using Change Password.' },
  { q: 'How do I audit credential generation events?', a: 'Credential generation events are logged with user, vendor and timestamp for audit.' }
];

export const defaultAllVendorsFaqs: FaqItem[] = [
  { q: 'How do I search vendors quickly?', a: 'Use the search box with vendor name or code; use filters for status and circle.' },
  { q: 'How is deletion handled?', a: 'Vendors are soft-deleted to preserve historical records; you can restore them from the deleted list.' },
  { q: 'Can I import vendors in bulk?', a: 'Yes—use the CSV import in Register Vendor for bulk creation.' },
  { q: 'How do I export the list?', a: 'Use the Export button to download the current view as CSV.' },
  { q: 'What fields are required for a vendor?', a: 'Name and vendor code are required; email and contact are recommended.' },
  { q: 'How do I filter by circle or region?', a: 'Use the Circle filter to narrow results by assigned circle or region.' },
  { q: 'Can I view vendor activity?', a: 'Open a vendor profile to view activity, logs and history.' },
  { q: 'Are vendor codes editable?', a: 'Vendor codes should remain stable; edits are allowed if necessary but avoid changing codes used externally.' },
  { q: 'How are inactive vendors handled?', a: 'Inactive vendors can be filtered out and reactivated if needed.' },
  { q: 'Can I save custom views?', a: 'Save filters and columns as a custom view for repeat use.' }
];

export const defaultRegisterVendorFaqs: FaqItem[] = [
  { q: 'What validations run on register?', a: 'Vendor code uniqueness and valid email format are validated on submit.' },
  { q: 'Can I register the same vendor twice?', a: 'No—vendor code must be unique. Use the edit flow for updates.' },
  { q: 'Is there a bulk import option?', a: 'Yes—CSV import is available for bulk vendor registration.' },
  { q: 'How do I set initial credentials?', a: 'Credentials are managed separately via Vendor Credentials; registration does not set a password.' },
  { q: 'Do vendors receive a notification?', a: 'By default no; you can email credentials manually or integrate notifications if configured.' },
  { q: 'How do I attach documents during registration?', a: 'Use the attachments field to upload vendor documents like GST or certificates.' },
  { q: 'Can I assign a circle during registration?', a: 'Yes—assign the vendor to a circle during registration or edit later.' },
  { q: 'Are custom fields supported?', a: 'Custom fields can be enabled in settings and will appear on the registration form.' },
  { q: 'What if the vendor already exists in another branch?', a: 'Check vendor code and merge or create a separate record as per business rules.' },
  { q: 'Can I require additional approvals?', a: 'Set up approval workflows if new vendor registration requires verification.' }
];

export const defaultPOGenerationFaqs: FaqItem[] = [
  { q: 'How are POs grouped?', a: 'POs are grouped automatically by vendor when generating from multiple sites.' },
  { q: 'Can I override GST per site?', a: 'Yes—each site line supports per-site GST override during generation.' },
  { q: 'What happens with very large selections?', a: 'The server batches generation to avoid timeouts; prefer paging for very large loads.' },
  { q: 'Can I preview POs before finalizing?', a: 'Yes—use the Preview action to inspect POs before creating them.' },
  { q: 'Are PO numbers unique?', a: 'PO numbers are generated atomically on the server to ensure uniqueness.' },
  { q: 'Can I cancel a generated PO?', a: 'Use the PO actions to cancel or void POs as per your approval policy.' },
  { q: 'How do I print POs?', a: 'Use the Print action which renders a styled PDF template for the PO.' },
  { q: 'Do POs include tax breakdowns?', a: 'Yes—tax lines (GST) and totals are shown on each PO.' },
  { q: 'Can I attach documents to a PO?', a: 'Yes—attach supporting documents like contracts or invoices.' },
  { q: 'How are PO revisions handled?', a: 'Create a revision or cancel and reissue to maintain a clear audit trail.' }
];

export const defaultInvoiceGenerationFaqs: FaqItem[] = [
  { q: 'Can I generate invoices from multiple POs?', a: 'Yes—you can select multiple POs and create invoices in bulk.' },
  { q: 'Does partial invoicing work?', a: 'Yes—invoice only selected lines from a PO and leave remaining lines open.' },
  { q: 'How do I export invoices?', a: 'Use the Export to PDF option to download invoices for sharing.' },
  { q: 'How are invoice numbers generated?', a: 'Invoice numbers are system-generated and unique per invoice.' },
  { q: 'How do I mark an invoice as paid?', a: 'Use the Payment Master to record payments and reconcile invoices.' },
  { q: 'Can I send invoices by email?', a: 'Yes—send invoices directly to vendors via the Send action if configured.' },
  { q: 'Are invoices versioned?', a: 'Drafts can be updated; finalized invoices are immutable for audit.' },
  { q: 'How do I add notes or references?', a: 'Add internal notes or customer reference fields during invoice edit.' },
  { q: 'Can invoices include multiple taxes?', a: 'Yes—invoice lines can have tax rules applied per item.' },
  { q: 'How to handle invoice disputes?', a: 'Create credit notes or adjustments and keep communication recorded.' }
];

export const defaultPaymentMasterFaqs: FaqItem[] = [
  { q: 'How do I create a payment?', a: 'Use Create Payment, specify invoices to apply payment to, and choose method and reference.' },
  { q: 'Can I upload bank statements for reconciliation?', a: 'Yes—use the Reconcile via statement upload option to match payments.' },
  { q: 'What payment methods are supported?', a: 'Bank transfer/NEFT, Cheque and gateway transactions are supported.' },
  { q: 'How do I correct a payment?', a: 'Create reversal entries and reapply corrected payments; maintain audit logs for tracking.' },
  { q: 'Who can reconcile payments?', a: 'Users with Payment Master permissions—ensure audit-level access is limited.' },
  { q: 'Does payment reconciliation support fuzzy matching?', a: 'Automated matching has configurable rules including reference and amount tolerances.' },
  { q: 'How do refunds work?', a: 'Create reversal payments or credit notes depending on the workflow.' },
  { q: 'Can I export reconciliation reports?', a: 'Yes—export matched and unmatched transaction reports for accounting.' },
  { q: 'Are payment references important?', a: 'Yes—clear references increase matching accuracy and reduce manual work.' },
  { q: 'How to handle multi-currency payments?', a: 'System supports base currency conversion and records original currency where configured.' }
];

export const defaultFaqsMap: Record<string, FaqItem[]> = {
  vendorCredentials_faqs: defaultVendorCredentialsFaqs,
  vendor_all_faqs: defaultAllVendorsFaqs,
  vendor_register_faqs: defaultRegisterVendorFaqs,
  poGeneration_faqs: defaultPOGenerationFaqs,
  invoiceGeneration_faqs: defaultInvoiceGenerationFaqs,
  paymentMaster_faqs: defaultPaymentMasterFaqs,
  overview_faqs: [
    { q: 'Where can I find more documentation?', a: 'Open the full Help Center at /help for detailed guides per module.' },
    { q: 'How do I report a bug?', a: 'Open an issue in the project tracker or contact your admin with steps to reproduce.' },
    { q: 'Who can edit Help Center content?', a: 'Users with superadmin role can edit the Help Center overview and page content.' },
    { q: 'Why are some FAQs missing?', a: 'Server-provided FAQ arrays can be empty; the app falls back to bundled defaults where available.' },
    { q: 'Can I request new FAQs?', a: 'Yes—ask your project maintainer to add more FAQs to the Help Center API content.' }
  ],
};

export default defaultFaqsMap;
