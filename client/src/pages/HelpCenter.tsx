import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import FaqBox from "@/components/FaqBox";
import {
  defaultFaqsMap,
  defaultVendorCredentialsFaqs,
  defaultAllVendorsFaqs,
  defaultRegisterVendorFaqs,
  defaultPOGenerationFaqs,
  defaultInvoiceGenerationFaqs,
  defaultPaymentMasterFaqs,
} from '@/lib/defaultFaqs';

interface HelpNavItem {
  key: string;
  title: string;
  descKey?: string;
}

interface HelpNavGroup {
  group: string;
  items: HelpNavItem[];
}

const helpNav: HelpNavGroup[] = [
  {
    group: "Vendor Management",
    items: [
      { key: 'vendor-credentials', title: 'Vendor Credentials', descKey: 'vendorCredentials' },
      { key: 'all-vendors', title: 'All Vendors', descKey: 'vendor_all' },
      { key: 'register-vendor', title: 'Register Vendor', descKey: 'vendor_register' },
      { key: 'circle-master', title: 'Circle Master' },
    ],
  },
  {
    group: "Site & PO Management",
    items: [
      { key: 'po-generation', title: 'PO Generation', descKey: 'poGeneration' },
      { key: 'invoice-generation', title: 'Invoice Generation', descKey: 'invoiceGeneration' },
      { key: 'payment-master', title: 'Payment Master', descKey: 'paymentMaster' },
    ],
  },
  {
    group: "Employee & Payroll",
    items: [
      { key: 'all-employees', title: 'All Employees' },
      { key: 'register-employee', title: 'Register Employee' },
      { key: 'employee-credentials', title: 'Employee Credentials' },
      { key: 'holiday-master', title: 'Holiday Master' },
      { key: 'leave-allotment', title: 'Leave Allotment' },
      { key: 'monthly-attendance', title: 'Monthly Attendance' },
      { key: 'salary-structure', title: 'Salary Structure' },
      { key: 'generate-salary', title: 'Generate Salaries' },
    ],
  },
  {
    group: "Admin & Reports",
    items: [
      { key: 'reports-dashboard', title: 'Reports Dashboard' },
      { key: 'database-status', title: 'Database Status' },
      { key: 'help-center', title: 'Help Center' },
    ],
  },
];

export default function HelpCenter() {
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<string>(helpNav[0]?.items[0]?.key || 'vendor-credentials');
  const [content, setContent] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState(false);
   const [editingPage, setEditingPage] = useState(false);
   const [pageDraftSummary, setPageDraftSummary] = useState('');
   const [pageDraftDetail, setPageDraftDetail] = useState('');
  const [overviewDraft, setOverviewDraft] = useState('');
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const getSummaryFor = (key: string, fallback: string) => {
    return content[key] || fallback;
  };

  const getContentFor = (key: string, fallback: React.ReactNode) => {
    return content[key] || fallback;
  };

  const findDescKey = (pageKey: string) => {
    const item = helpNav.flatMap(g => g.items).find(i => i.key === pageKey);
    return item?.descKey || pageKey;
  };

  // Default FAQ collections are in src/lib/defaultFaqs and can be overridden by server via /api/help JSON

  const getFaqs = (key: string, fallback: any[]) => {
    const v = content[key];
    return Array.isArray(v) && v.length > 0 ? v : fallback;
  };

  // Additional FAQ collections requested
  const defaultExcelUploadFaqs = [
    { q: 'What file formats are supported?', a: 'Excel (.xlsx) and CSV formats are supported for bulk imports.' },
    { q: 'How should columns be ordered?', a: 'Use the provided template or match column headers exactly for reliable import.' },
    { q: 'What happens on validation errors?', a: 'Rows with validation errors are rejected and listed in an error report for correction.' },
    { q: 'Can I preview before importing?', a: 'Yes—use the Preview step to inspect parsed rows and mappings.' },
    { q: 'Is there a row limit?', a: 'Large files are supported but consider splitting very large imports to avoid timeouts.' },
    { q: 'How are duplicates handled?', a: 'Duplicates are detected by key columns (e.g., vendorCode) and either skipped or merged based on settings.' },
    { q: 'Can I map custom columns?', a: 'The importer allows column mapping during preview to match your file to system fields.' },
    { q: 'Who can perform imports?', a: 'Users with import privileges; check your role permissions.' },
    { q: 'Are imports auditable?', a: 'Yes—imports generate logs with user, timestamp and summary of imported/failed rows.' },
    { q: 'How do I fix failed rows?', a: 'Download the error report, fix rows locally, and re-upload the corrected file.' }
  ];

  const defaultSiteListFaqs = [
    { q: 'How do I filter sites?', a: 'Use the filter bar to filter by vendor, circle, status, or plan.' },
    { q: 'Can I export site lists?', a: 'Yes—export the current view to CSV for reporting.' },
    { q: 'How do I bulk edit sites?', a: 'Use the Excel Upload import to update many sites at once.' },
    { q: 'What site statuses exist?', a: 'Statuses include Pending, Approved, Installed, Operational and Archived.' },
    { q: 'How do I assign vendors to sites?', a: 'Use the site edit form to assign or change the vendor for a site.' },
    { q: 'Can I view site history?', a: 'Yes—open a site and view its audit/history panel for changes.' },
    { q: 'Are geolocation fields supported?', a: 'Yes—latitude/longitude and address fields are stored per site.' },
    { q: 'How are duplicate sites detected?', a: 'Duplicate detection uses site code and address normalization during import.' },
    { q: 'Can I bulk change circle assignments?', a: 'Use bulk actions or CSV import to reassign circles.' },
    { q: 'How do I search by site attributes?', a: 'Use the advanced search to query by plan id, antenna type, or other attributes.' }
  ];

  const defaultSiteStatusFaqs = [
    { q: 'What does each status mean?', a: 'Statuses indicate lifecycle stage: Pending, Ready, Installed, Operational, etc.' },
    { q: 'How is status updated?', a: 'Status is updated via workflow actions or site edits by authorized users.' },
    { q: 'Can status changes be reverted?', a: 'Yes—edit the site and change status back; audit logs will record the change.' },
    { q: 'Are notifications sent on status change?', a: 'Optional notifications can be configured for key status transitions.' },
    { q: 'How do I filter by status?', a: 'Use the status filter in the site list to view sites in a particular state.' },
    { q: 'What is SOFT-AT / PHY-AT?', a: 'They are operational indicators—see Site Status documentation for definitions.' },
    { q: 'Can I bulk-update statuses?', a: 'Bulk status updates are supported via CSV import or batch actions.' },
    { q: 'Are there automated status rules?', a: 'Workflows can automatically transition statuses based on validations or checks.' },
    { q: 'How do statuses affect PO/Invoice flows?', a: 'Only Approved/Ready sites are eligible for PO generation.' },
    { q: 'Who can change statuses?', a: 'Users with site management privileges can change site statuses.' }
  ];

  const defaultRegisterEmployeeFaqs = [
    { q: 'What fields are required?', a: 'Name, email and role are required; additional HR fields can be set later.' },
    { q: 'How do I assign to a team?', a: 'Use the Team selector on the registration form to set team membership.' },
    { q: 'Can I bulk-import employees?', a: 'Yes—use the Excel import template for employee creation.' },
    { q: 'What validations run?', a: 'Email uniqueness and basic identity fields are validated.' },
    { q: 'How to set initial salary?', a: 'Set salary structure after registration or include pay-related fields in import.' },
    { q: 'Do employees get an email?', a: 'Notification sending depends on configured email templates; currently optional.' },
    { q: 'Can I add custom fields?', a: 'Custom fields are configurable in Settings; they can appear on the registration form.' },
    { q: 'How to correct mistakes?', a: 'Edit the employee record and save changes; audit logs are kept.' },
    { q: 'Can I deactivate an employee?', a: 'Yes—set status to inactive to prevent logins and access.' },
    { q: 'Is there role-based access?', a: 'Yes—roles control what pages and actions an employee can perform.'
  }];

  const defaultEmployeeCredentialsFaqs = [
    { q: 'How are employee credentials managed?', a: 'Admins can generate/reset credentials, similar to vendor credentials.' },
    { q: 'How to reset a password?', a: 'Use Employee Credentials page to reset and share a temporary password securely.' },
    { q: 'Can employees change their own password?', a: 'Yes—from the My Profile > Change Password page.' },
    { q: 'How long is a temporary password valid?', a: 'Temporary passwords are intended for immediate use; they should be changed on first login.' },
    { q: 'Are credential changes audited?', a: 'Yes—credential generation and resets are logged for audit purposes.' },
    { q: 'Can I force password rotation?', a: 'Use system policies in Settings to require periodic password changes.' },
    { q: 'Do employees receive credential emails automatically?', a: 'Only if email notifications are enabled for that action.' },
    { q: 'How to lock/unlock an account?', a: 'Set account status to locked or unlocked via admin controls.' },
    { q: 'Can I bulk-reset passwords?', a: 'Bulk actions are subject to audit; check the admin toolbox for supported bulk operations.' },
    { q: 'Who can see unencrypted passwords?', a: 'No one—plaintext is only shown once when generating; it is not stored in plaintext.' }
  ];

  const defaultTeamsFaqs = [
    { q: 'How do I create a team?', a: 'Use the Teams page, click Create Team and set members and owners.' },
    { q: 'Can teams have multiple owners?', a: 'Yes—assign multiple owners for redundancy.' },
    { q: 'How to move employees between teams?', a: 'Edit team membership on the Team or Employee edit pages.' },
    { q: 'Are teams used for permissions?', a: 'Teams simplify grouping for approvals and dashboards; use roles + teams for access control.' },
    { q: 'Can I nest teams?', a: 'Currently nested teams are not supported; use tags or departments instead.' },
    { q: 'How to delete a team?', a: 'Remove members and delete the team via the action menu.' },
    { q: 'Can teams be used in approval workflows?', a: 'Yes—team owners can be approvers in some workflows.' },
    { q: 'Is there an audit log for teams?', a: 'Team membership changes are logged for auditing.' },
    { q: 'Can teams be exported?', a: 'Yes—export team lists for reporting.' },
    { q: 'How to assign team leads?', a: 'Set the owner or lead field when creating or editing a team.' }
  ];

  const defaultMonthlyAttendanceFaqs = [
    { q: 'How is monthly attendance calculated?', a: 'Attendance is aggregated from daily marks and adjusted for holidays and leaves.' },
    { q: 'How to correct an attendance entry?', a: 'Use the daily attendance editor or request an adjustment via HR workflow.' },
    { q: 'Are late marks counted?', a: 'Late marks are recorded and configurable in attendance policies.' },
    { q: 'How do holidays affect attendance?', a: 'Holidays are exempt from attendance counts and can be configured in Holiday Master.' },
    { q: 'Can I export attendance reports?', a: 'Yes—export monthly reports to CSV or PDF.' },
    { q: 'How to mark attendance for multiple employees?', a: 'Use the bulk attendance marking feature for large updates.' },
    { q: 'Are attendance corrections auditable?', a: 'Yes—corrections and approvals are stored in the audit log.' },
    { q: 'How to view attendance summary?', a: 'Monthly summary is available on the Monthly Attendance page with filters.' },
    { q: 'Does PTO affect attendance?', a: 'Approved leaves reduce attendance counts where applicable.' },
    { q: 'Can I set custom attendance rules?', a: 'Advanced policies are configured in settings for shift and overtime rules.' }
  ];

  const defaultSalaryStructureFaqs = [
    { q: 'What are salary components?', a: 'Components include basic, allowances, deductions and statutory contributions.' },
    { q: 'How to create a structure?', a: 'Use Salary Structure page to compose components and percentage/flat values.' },
    { q: 'Can I assign structures to employees?', a: 'Yes—assign a salary structure when editing employee records.' },
    { q: 'How to handle tax calculations?', a: 'Tax is calculated according to configured tax rules on the structure or payroll run.' },
    { q: 'Can structures be versioned?', a: 'Create new versions to preserve historical structures for prior payrolls.' },
    { q: 'How to preview gross/net?', a: 'Use the preview function to calculate gross and net salary for a sample employee.' },
    { q: 'Are component limits enforceable?', a: 'Validation rules can enforce min/max component values.' },
    { q: 'Can I copy structures between branches?', a: 'Use export/import to duplicate structures across branches.' },
    { q: 'How do allowances differ from reimbursements?', a: 'Allowances are recurring; reimbursements are per-event and often require proofs.' },
    { q: 'How to apply one-time adjustments?', a: 'Use adjustment fields during a payroll run for ad-hoc entries.' }
  ];

  const defaultGenerateSalaryFaqs = [
    { q: 'When to run salary generation?', a: 'Run after attendance is finalized and all approvals are complete for the period.' },
    { q: 'Can I preview salary runs?', a: 'Yes—preview the run to inspect payslips before finalizing.' },
    { q: 'How to handle one-time bonuses?', a: 'Include bonuses as adjustments in the payroll run or as separate payouts.' },
    { q: 'Can runs be reprocessed?', a: 'Yes—reprocess runs if corrections are needed; keep track of versions.' },
    { q: 'How are statutory deductions applied?', a: 'Deductions follow configured statutory rules per employee and structure.' },
    { q: 'How to export payslips?', a: 'Export PDFs or bulk-download payslips for distribution.' },
    { q: 'Can I restrict access to payslips?', a: 'Yes—only authorized roles can view or download payslips.' },
    { q: 'How to reverse an incorrect run?', a: 'Use reversal procedures to nullify an incorrect run and re-generate.' },
    { q: 'Do salary runs integrate with bank transfers?', a: 'Yes—generate bank files for payroll transfers where supported.' },
    { q: 'How to audit salary runs?', a: 'Run logs and approvals are stored for auditing and compliance.' }
  ];

  const defaultAllowanceApprovalFaqs = [
    { q: 'What is allowance approval?', a: 'An approval workflow to verify and approve allowances before payout.' },
    { q: 'How to submit an allowance?', a: 'Submit allowance requests with receipts; route them to approvers.' },
    { q: 'Can approvers delegate?', a: 'Delegation is supported in team and approval settings.' },
    { q: 'How are approvals recorded?', a: 'Approval records are logged with approver, time and notes.' },
    { q: 'Can I batch approve multiple requests?', a: 'Yes—batch approval is available on the approvals dashboard.' },
    { q: 'How to reject with comments?', a: 'Reject and include a reason to notify the requester.' },
    { q: 'Are receipts stored?', a: 'Receipts are stored alongside the request for audit.' },
    { q: 'How to export approval history?', a: 'Export approval logs for reporting and compliance.' },
    { q: 'Can allowances be auto-approved?', a: 'Auto-approval rules are configurable for low-value claims.' },
    { q: 'Who sees pending approvals?', a: 'Approvers and admins can view pending approvals assigned to them.' }
  ];

  const defaultAppSettingsFaqs = [
    { q: 'Where are app settings located?', a: 'Open Settings from the sidebar to configure company, email and integrations.' },
    { q: 'How to configure notifications?', a: 'Notification templates and triggers are set in App Settings.' },
    { q: 'How to manage user roles?', a: 'Use the Users/Roles section to add roles and set permissions.' },
    { q: 'How to configure approval workflows?', a: 'Approval settings let you define approvers and escalation rules.' },
    { q: 'How to set currency and locale?', a: 'Company preferences include currency, date format and locale.' },
    { q: 'Can I integrate with banks or gateways?', a: 'Settings include integration configuration for payment gateways and bank exports.' },
    { q: 'How to backup settings?', a: 'Export settings or use the backup facility in admin tools.' },
    { q: 'Are there audit settings?', a: 'Audit logging can be toggled and configured for retention periods.' },
    { q: 'How to limit access to settings?', a: 'Only admin roles should have access—adjust role permissions.' },
    { q: 'Can I customize templates?', a: 'Yes—email and document templates are editable in Settings.' }
  ];

  const getDetailedContent = useCallback((key: string) => {
    switch (key) {
      case 'vendor-credentials':
        return getContentFor('vendorCredentials', (
          <div>
            <h4>Vendor Credentials (Detailed)</h4>
            <p className="mb-2">Generate or reset vendor login passwords, view status, and copy credentials. Designed for admins to provision access securely and quickly.</p>

            <h5>Purpose</h5>
            <p className="mb-2">Manage vendor authentication: generate temporary passwords, audit reset events, and share credentials securely.</p>

            <h5>Fields</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Vendor Name</strong>: Display name and vendor code.</li>
              <li><strong>Email (Username)</strong>: Login email (copyable).</li>
              <li><strong>Status</strong>: Indicates if password is set or recently generated.</li>
              <li><strong>Generated Password</strong>: Temporary password shown once after generation.</li>
            </ul>

            <h5>Primary Actions</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Generate / Reset</strong>: Calls <code>POST /api/vendors/:id/generate-password</code>.</li>
              <li><strong>Copy</strong>: Copies email or temp password to clipboard for sharing.</li>
              <li><strong>Search</strong>: Smart suggestions via minimal listing plus fast id lookup.</li>
            </ul>

            <h5>Examples</h5>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`POST /api/vendors/:id/generate-password
Response: { success: true, tempPassword: 'xyz123' }`}</code></pre>
            <FaqBox items={getFaqs('vendorCredentials_faqs', defaultVendorCredentialsFaqs)} />
          </div>
        ));

      case 'all-vendors':
        return (
          <div>
            <h4>All Vendors (Detailed)</h4>
            <p className="mb-2">Comprehensive listing of vendor records with filtering, sorting and bulk actions for administrative workflows.</p>
            <h5>Visible Columns</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Name / Code</strong>: Click to view or edit a vendor.</li>
              <li><strong>Email</strong>: Primary contact/login.</li>
              <li><strong>Contact</strong>: Phone.</li>
              <li><strong>Status</strong>: Active/Inactive.</li>
            </ul>
            <h5>APIs</h5>
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Fetch paginated vendors</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`GET /api/vendors?page=1&pageSize=25
Response: { vendors: [{ id: 'v1', name: 'ACME', vendorCode: 'ACM001', email: 'ops@acme' }], total: 120 }`}</code></pre>
            </div>

            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Search suggestions (lightweight)</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`GET /api/vendors/all?minimal=true
Response: [{ id: 'v1', name: 'ACME', vendorCode: 'ACM001' }, ...]`}</code></pre>
            </div>

            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-1">Delete (soft)</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`DELETE /api/vendors/:id
Response: { success: true }`}</code></pre>
            </div>
            <FaqBox items={getFaqs('vendor_all_faqs', defaultAllVendorsFaqs)} />
          </div>
        );

      case 'register-vendor':
        return (
          <div>
            <h4>Register Vendor (Detailed)</h4>
            <p className="mb-2">Form to add a new vendor record (name, vendor code, optional contact info). Validations include unique vendor code and proper email format.</p>
            <h5>API</h5>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{'POST /api/vendors\nBody: { name: "ACME", vendorCode: "ACM001", email: "ops@acme" }\nResponse: { success: true, vendor: { id: "v1" } }'}</code></pre>
            <h5>Notes</h5>
            <ul className="list-disc pl-5 mb-2">
              <li>Show inline validation messages for missing or invalid fields.</li>
              <li>Offer a CSV import for bulk vendor creation.</li>
            </ul>
            <FaqBox items={getFaqs('vendor_register_faqs', defaultRegisterVendorFaqs)} />
          </div>
        );

      case 'circle-master':
        return (
          <div>
            <h4>Circle Master (Detailed)</h4>
            <p className="mb-2">Manage geographic circles used to categorize sites and assign vendors. Circles enable region-based filtering and settings.</p>
            <h5>Actions</h5>
            <ul className="list-disc pl-5 mb-2">
              <li>Create, edit and delete circles.</li>
              <li>Assign vendors to circles for regional ownership.</li>
            </ul>
            <h5>API</h5>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`GET /api/circles
Response: [{ id: 'c1', name: 'North', vendorId: 'v1' }, ...]
DELETE /api/circles/:id
Response: { success: true }`}</code></pre>
          </div>
        );

      // Other pages fall back to server content or a short built-in block
      case 'po-generation':
        return getContentFor('poGeneration', (
          <div>
            <h4>PO Generation (Detailed)</h4>
            <p className="mb-2">Create Purchase Orders (POs) in bulk for approved sites. PO Generation aggregates site/service rows into POs per vendor and supports pagination, select-all, and per-site overrides such as GST and quantities.</p>

            <h5>When to use</h5>
            <ul className="list-disc pl-5 mb-2">
              <li>Create POs after site readiness approvals are complete.</li>
              <li>Use bulk generation to issue POs for multiple sites belonging to the same vendor.</li>
              <li>Use filters to scope the generation by vendor, circle, or status.</li>
            </ul>

            <h5>Visible Columns / Fields</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Site ID / Name</strong>: Click to open site details.</li>
              <li><strong>Vendor</strong>: Vendor assigned to the site; groups POs per vendor during generation.</li>
              <li><strong>Planned Amount</strong>: Base amount before taxes and adjustments.</li>
              <li><strong>GST</strong>: Tax applied to the PO line — can be global or per-site override.</li>
              <li><strong>Quantity / Units</strong>: Editable when partial deliveries or multiples are supported.</li>
            </ul>

            <h5>Primary Actions</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Select / Deselect</strong>: Choose sites to include in PO generation.</li>
              <li><strong>Generate POs</strong>: Groups by vendor and calls the generation API.</li>
              <li><strong>Preview</strong>: Preview resulting PO documents before finalizing.</li>
              <li><strong>Print / Export</strong>: Export generated POs to PDF or initiate printing.</li>
            </ul>

            <h5>APIs & Examples</h5>
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Fetch eligible sites for PO generation</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`GET /api/sites/for-po-generation?page=1&pageSize=50&vendor=v1
Response: { sites: [{ id: 's1', vendorId: 'v1', amount: 12000, gst: 18 }], total: 42 }`}</code></pre>
            </div>

            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Generate POs (server groups by vendor)</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`POST /api/purchase-orders/generate
Body: { siteIds: ['s1','s2'], globalGst: 18 }
Response: { success: true, generated: [{ poId: 'po_123', vendorId: 'v1', total: 24000 }] }`}</code></pre>
            </div>

            <h5>Performance & Notes</h5>
            <ul className="list-disc pl-5 mb-2">
              <li>Generation is batched per vendor to avoid cross-vendor POs; for very large selections the server will chunk requests to avoid timeouts.</li>
              <li>Use filters and pagination to limit the payload; avoid selecting thousands of rows at once.</li>
              <li>PO numbers are generated atomically on the server to ensure uniqueness under concurrency.</li>
            </ul>

            <h5>Screenshots</h5>
            <img src="/help-images/po-generation-1.png" alt="PO Generation UI" className="rounded border mt-2" />
            <FaqBox items={getFaqs('poGeneration_faqs', defaultPOGenerationFaqs)} />
          </div>
        ));
      case 'invoice-generation':
        return getContentFor('invoiceGeneration', (
          <div>
            <h4>Invoice Generation (Detailed)</h4>
            <p className="mb-2">Create invoices from selected Purchase Orders (POs). This area supports bulk invoice generation, partial invoicing, PDF export, and invoice lifecycle management including statuses like Draft, Sent, Paid and Cancelled.</p>

            <h5>Common Flows</h5>
            <ul className="list-disc pl-5 mb-2">
              <li>Select one or more POs and click <strong>Generate Invoice</strong> to create invoice drafts.</li>
              <li>Open a draft to adjust line items, apply discounts, or add adjustments.</li>
              <li>Finalize and send invoices to vendors; use export or print for PDF delivery.</li>
            </ul>

            <h5>Visible Columns</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Invoice No.</strong>: System-generated unique id.</li>
              <li><strong>POs Included</strong>: Linked POs and their amounts.</li>
              <li><strong>Vendor</strong>: Payee information.</li>
              <li><strong>Total / Tax</strong>: Amounts with tax breakdown.</li>
              <li><strong>Status</strong>: Draft, Sent, Paid, Overdue.</li>
            </ul>

            <h5>APIs & Examples</h5>
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Generate invoices from selected POs</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`POST /api/invoices
Body: { poIds: ['po_1','po_2'], sendNotifications: true }
Response: { success: true, invoices: [{ id: 'inv_1', total: 30000 }] }`}</code></pre>
            </div>

            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Fetch invoices with details</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`GET /api/invoices?withDetails=true&page=1
Response: { invoices: [{ id: 'inv_1', status: 'Draft', poIds: ['po_1'] }], total: 20 }`}</code></pre>
            </div>

            <h5>Notes & Edge Cases</h5>
            <ul className="list-disc pl-5 mb-2">
              <li>Partial invoicing: you can invoice a subset of PO lines; the remaining lines stay open for future invoices.</li>
              <li>Payment reconciliation happens in the Payment Master; mark invoices as paid when payments are matched.</li>
              <li>PDF export uses a templated renderer; ensure company headers and bank details are configured in settings.</li>
              <li>Vendor users may have limited access — they often cannot generate invoices and may only view/download.</li>
            </ul>

            <h5>Screenshots</h5>
            <img src="/help-images/invoice-generation-1.png" alt="Invoice Generation UI" className="rounded border mt-2" />
            <FaqBox items={getFaqs('invoiceGeneration_faqs', defaultInvoiceGenerationFaqs)} />
          </div>
        ));

      case 'payment-master':
        return getContentFor('paymentMaster', (
          <div>
            <h4>Payment Master (Detailed)</h4>
            <p className="mb-2">Centralized area to record, reconcile and manage payments against invoices. Configure payment methods, view ledger entries, and run reconciliation reports.</p>

            <h5>Key Concepts</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Payment Methods</strong>: Bank transfer, NEFT, Cheque, or gateway transactions.</li>
              <li><strong>Ledger Entries</strong>: Each payment creates ledger entries for audit and reconciliation.</li>
              <li><strong>Reconciliation</strong>: Match bank statements or uploaded statements to invoices and payments.</li>
            </ul>

            <h5>Fields / Columns</h5>
            <ul className="list-disc pl-5 mb-2">
              <li><strong>Payment ID</strong>: Unique identifier.</li>
              <li><strong>Invoice(s)</strong>: Linked invoices that payment applies to.</li>
              <li><strong>Amount</strong>: Paid amount.</li>
              <li><strong>Method</strong>: Payment method.</li>
              <li><strong>Date</strong>: Payment date.</li>
              <li><strong>Status</strong>: Pending, Completed, Reconciled.</li>
            </ul>

            <h5>APIs & Examples</h5>
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Create a payment and apply to invoices</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`POST /api/payments
Body: { invoiceIds: ['inv_1'], amount: 30000, method: 'NEFT', reference: 'TXN123' }
Response: { success: true, payment: { id: 'pay_1', status: 'Completed' } }`}</code></pre>
            </div>

            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Reconcile via statement upload</div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto"><code>{`POST /api/payments/reconcile
Body: { file: <bank_statement.csv> }
Response: { matched: 12, unmatched: 3 }`}</code></pre>
            </div>

            <h5>Notes & Best Practices</h5>
            <ul className="list-disc pl-5 mb-2">
              <li>Keep payment references clear so automated reconcile rules can match them reliably.</li>
              <li>Use statement uploads or bank integration for high-volume reconciliation.</li>
              <li>Ensure users with access to Payment Master have appropriate audit-level permissions.</li>
            </ul>
            <FaqBox items={getFaqs('paymentMaster_faqs', defaultPaymentMasterFaqs)} />
          </div>
        ));
      default:
        return <div><p>No detailed content available yet for this page.</p></div>;
    }
  }, [content, getContentFor]);

  useEffect(() => {
    document.title = 'Help Center - EOMS';
    const load = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/help`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setContent(data);
          setOverviewDraft(data.overview || '');
        }
      } catch (err) {
        console.error('Failed to load help content', err);
      }
    };
    const check = async () => {
      try {
        const s = await fetch(`${getApiBaseUrl()}/api/session`, { credentials: 'include' });
        if (s.ok) {
          const d = await s.json();
          setIsSuperadmin((d.employeeRole || '').toLowerCase() === 'superadmin');
        }
      } catch (err) {
        console.error('Failed to check session', err);
      }
    };
    check();
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Help Center</h2>
        <p className="text-muted-foreground">Documentation and usage guide for application groups and pages.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>High level description of the application and its main modules.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-2">{content.overview || 'This portal manages vendors, sites, purchase orders (POs), invoices and employee payroll. Use the sidebar to navigate modules. Each module contains pages with create/edit/view workflows.'}</p>
          <p className="text-sm text-muted-foreground">If something is missing here or you want step-by-step screenshots, tell me which area and I'll add it.</p>
        </CardContent>
      </Card>

      {/* Edit controls for superadmin */}
      {isSuperadmin && (
        <div className="flex justify-end mb-4">
          {editing ? (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setOverviewDraft(content.overview || ''); }}>Cancel</Button>
              <Button size="sm" onClick={async () => {
                try {
                  const res = await fetch(`${getApiBaseUrl()}/api/help`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...content, overview: overviewDraft }) });
                  if (!res.ok) throw new Error('Failed to save');
                  const data = await res.json();
                  setContent({ ...content, overview: overviewDraft });
                  setEditing(false);
                  toast({ title: 'Saved', description: 'Help content updated' });
                } catch (err: any) {
                  console.error('Save failed', err);
                  toast({ title: 'Save failed', description: err?.message || 'Unable to save help content', variant: 'destructive' });
                }
              }}>Save</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)}>Edit Help</Button>
          )}
        </div>
      )}

      {/* Main responsive layout - sidebar on md+, mobile selector on small screens */}
      <div className="md:flex md:space-x-6">
        <aside className="hidden md:block w-1/4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Help Center</h2>
            <p className="text-sm text-muted-foreground">Documentation and usage guide for application groups and pages.</p>
          </div>

          <nav className="space-y-4">
            {helpNav.map((group) => (
              <div key={group.group}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{group.group}</h3>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <button
                        onClick={() => setSelectedKey(item.key)}
                        className={`w-full text-left px-3 py-2 rounded ${selectedKey === item.key ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-slate-50'}`}>
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile selector */}
        <div className="md:hidden mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Jump to</label>
          <select className="w-full border rounded p-2" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {helpNav.flatMap(g => g.items).map(i => (
              <option key={i.key} value={i.key}>{`${i.title} — ${helpNav.find(g => g.items.includes(i))?.group || ''}`}</option>
            ))}
          </select>
        </div>

        <main className="w-full md:w-3/4">
          {/* Detail panel */}
          <Card>
            <CardHeader>
              <CardTitle>{(() => {
                const found = helpNav.flatMap(g => g.items).find(i => i.key === selectedKey);
                return found ? found.title : 'Overview';
              })()}</CardTitle>
              <div className="flex items-center justify-between w-full">
                <CardDescription>Full description and usage notes.</CardDescription>
                {isSuperadmin && (
                  <div>
                    {!editingPage ? (
                      <Button size="sm" onClick={() => {
                        const descKey = findDescKey(selectedKey) ?? selectedKey;
                        setPageDraftSummary(content[`${descKey}_summary`] ?? '');
                        setPageDraftDetail(content[descKey] ?? '');
                        setEditingPage(true);
                      }}>Edit Page</Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingPage(false); setPageDraftSummary(''); setPageDraftDetail(''); }}>Cancel</Button>
                        <Button size="sm" onClick={async () => {
                          try {
                            const descKey = findDescKey(selectedKey) ?? selectedKey;
                            const payload = { ...content, [`${descKey}_summary`]: pageDraftSummary, [descKey]: pageDraftDetail };
                            const res = await fetch(`${getApiBaseUrl()}/api/help`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                            if (!res.ok) throw new Error('Save failed');
                            setContent(payload);
                            setEditingPage(false);
                            toast({ title: 'Saved', description: 'Page content updated' });
                          } catch (err: any) {
                            console.error('Save failed', err);
                            toast({ title: 'Save failed', description: err?.message || 'Unable to save content', variant: 'destructive' });
                          }
                        }}>Save</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Limited summary */}
              <div className="mb-4 p-3 bg-slate-50 rounded">
                <strong className="block mb-1">{(() => {
                  const found = helpNav.flatMap(g => g.items).find(i => i.key === selectedKey);
                  if (!found) return 'Summary';
                  return found.key === 'vendor-credentials' ? `${found.title} (Detailed)` : `${found.title} (Summary)`;
                })()}</strong>
                {editingPage ? (
                  <div className="space-y-2">
                    <textarea value={pageDraftSummary} onChange={(e) => setPageDraftSummary(e.target.value)} className="w-full border rounded p-2 text-sm" rows={3} />
                    <div className="text-xs text-muted-foreground">Edit the short summary shown above. Click <strong>Save</strong> to persist changes.</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{(() => {
                    const found = helpNav.flatMap(g => g.items).find(i => i.key === selectedKey);
                    if (!found) return content.overview || 'Short summary not available.';
                    const builtIn: Record<string, string> = {
                      vendorCredentials: 'Generate, reset and copy vendor login credentials. Use smart search for fast selection.',
                      poGeneration: 'Bulk-create Purchase Orders from approved sites. Use select-all on page and pagination for large lists.',
                      invoiceGeneration: 'Create invoices from selected POs; export to PDF and print.',
                      paymentMaster: 'Manage payments, reconcile invoices, and configure payment methods and ledgers.',
                      vendor_all: 'Paginated list of vendors with search and action menu.',
                      vendor_register: 'Form to register a new vendor with validation on submit.'
                    };
                    return getSummaryFor(found.descKey ?? found.key, builtIn[found.descKey ?? found.key] || 'Short summary not available.');
                  })()}</p>
                )}
              </div>
              <div className="prose max-w-none">
                {editingPage ? (
                  <div className="space-y-2">
                    <textarea value={pageDraftDetail} onChange={(e) => setPageDraftDetail(e.target.value)} className="w-full border rounded p-2 text-sm min-h-[200px]" rows={12} />
                    <div className="text-xs text-muted-foreground">Edit the detailed content for this page. HTML snippets are allowed but ensure proper escaping. Use the Save button in the header to persist.</div>
                  </div>
                ) : (
                  (() => {
                    const descKey = findDescKey(selectedKey);
                    return getContentFor(descKey, getDetailedContent(selectedKey));
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Management</CardTitle>
          <CardDescription>Pages and functionality related to vendors.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>All Vendors</strong>: Search, filter, and paginate vendors. Columns include name, email, contact, status and usage counts. Use the action menu to edit or delete a vendor.</li>
            <li><strong>Register Vendor</strong>: Create new vendor records. Required fields include name and vendor code. Validation runs on submit.</li>
            <li><strong>Vendor Credentials</strong>: Generate or reset vendor login passwords, copy credentials, and view status. Search supports suggestions and fast retrieval by vendor id.</li>
            <li><strong>Circle Master</strong>: Manage geographic circles used for site assignments.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Credentials (Detailed)</CardTitle>
          <CardDescription>Field descriptions, actions and APIs used by the page.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">Purpose</p>
          <p className="mb-2 text-sm text-muted-foreground">Generate, reset and copy login credentials for vendors. Intended for admins to manage vendor access.</p>

          <p className="font-semibold">Visible Columns / Fields</p>
          <ul className="list-disc pl-5 mb-2">
            <li><strong>Vendor Name</strong>: Display name and vendor code.</li>
            <li><strong>Email (Username)</strong>: Login email (copyable).</li>
            <li><strong>Role</strong>: Role label (Vendor).</li>
            <li><strong>Status</strong>: Password set / not set indicator.</li>
            <li><strong>Generated Password</strong>: Temporary password shown after generation.</li>
          </ul>

          <p className="font-semibold">Actions</p>
          <ul className="list-disc pl-5 mb-2">
            <li><strong>Generate / Reset</strong>: Calls API to create a temporary password and stores it (server-side hashed).</li>
            <li><strong>Copy</strong>: Copies email or generated password to clipboard for sharing securely.</li>
            <li><strong>Filter / Search</strong>: Smart search suggestions and vendor id lookup (fast fetch by id).</li>
          </ul>

          <p className="font-semibold">APIs</p>
          <ul className="list-disc pl-5 mb-2">
            <li><code>GET /api/vendors?page=&amp;pageSize=</code>: Paginated vendor list for table view.</li>
            <li><code>GET /api/vendors/:id</code>: Fetch single vendor by id (used when a vendor is selected to speed up search).</li>
            <li><code>GET /api/vendors/all?minimal=true</code>: Lightweight list for search suggestions.</li>
            <li><code>POST /api/vendors/:id/generate-password</code>: Generate/reset temporary password for vendor.</li>
          </ul>

          <p className="font-semibold">Performance Notes</p>
          <p className="text-sm text-muted-foreground">Use the lightweight endpoints for suggestions and fetch vendor by id for instant results. Avoid fetching the entire detailed list when filtering by a single vendor.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site & PO Management</CardTitle>
          <CardDescription>Site, PO and Invoice workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Site List / Site Status</strong>: Create and manage sites with fields like plan id, antennas, vendor assignment and statuses (SOFT-AT/PHY-AT).</li>
            <li><strong>PO Generation</strong>: Select approved sites to create Purchase Orders in bulk. Table on desktop and card view on mobile. Supports GST calculation and printing/export.</li>
            <li><strong>Invoice Generation</strong>: Select POs to create invoices. View all generated invoices, export to PDF, print, and delete. Vendor access is restricted to generation windows set in settings.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PO Generation (Detailed)</CardTitle>
          <CardDescription>How to use PO Generation and the underlying APIs.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">Purpose</p>
          <p className="mb-2 text-sm text-muted-foreground">Bulk-create Purchase Orders for approved sites. Supports filtering by vendor and pagination for large lists.</p>

          <p className="font-semibold">Key UI Details</p>
          <ul className="list-disc pl-5 mb-2">
            <li>Desktop: Table view with select-all on page, pagination controls, and column for action (print).</li>
            <li>Mobile: Card view with compact site/PO info and select checkbox; select-all on page is available.</li>
            <li>GST: Can be applied globally or per-PO and determined based on vendor/site states.</li>
          </ul>

          <p className="font-semibold">APIs</p>
          <ul className="list-disc pl-5 mb-2">
            <li><code>GET /api/sites/for-po-generation</code>: Returns sites eligible for PO generation (optimized payload).</li>
            <li><code>GET /api/purchase-orders?pageSize=&amp;withDetails=true</code>: Fetch POs (used to avoid POs with invoices).</li>
            <li><code>POST /api/purchase-orders</code>: Create a new PO (used when generating POs programmatically).</li>
          </ul>

          <p className="font-semibold">Notes</p>
          <p className="text-sm text-muted-foreground">PO generation performs server-side calculation for GST and totals; printing uses a dedicated print route per PO.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Generation (Detailed)</CardTitle>
          <CardDescription>How invoices are created and exported.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">Purpose</p>
          <p className="mb-2 text-sm text-muted-foreground">Create invoices from purchase orders, export to PDF, print, and manage statuses.</p>

          <p className="font-semibold">Key UI Details</p>
          <ul className="list-disc pl-5 mb-2">
            <li>Available POs are shown (filter by vendor), with selection to generate invoices in bulk.</li>
            <li>Generated invoices appear in a card grid; full list of invoices is shown below with export and delete actions.</li>
            <li>PDF export uses <code>jspdf</code> with a styled template (company header, item lines, taxes, totals).</li>
          </ul>

          <p className="font-semibold">APIs</p>
          <ul className="list-disc pl-5 mb-2">
            <li><code>GET /api/invoices?withDetails=true</code>: Loads invoices with PO/vendor/site details.</li>
            <li><code>POST /api/invoices</code>: Create invoice(s) for selected POs.</li>
            <li><code>DELETE /api/invoices/:id</code>: Delete invoice.</li>
          </ul>

          <p className="font-semibold">Notes</p>
          <p className="text-sm text-muted-foreground">Vendor users may be restricted to generate invoices only within a configured window of the month (app setting).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee & Payroll</CardTitle>
          <CardDescription>Employee management and salary pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Employee List / Register</strong>: CRUD operations for employees.</li>
            <li><strong>Salary Generation</strong>: Generate and view salary runs, reports and prints.</li>
            <li><strong>Attendance & Leave</strong>: Mark and report attendance, manage holidays, and allot leaves.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin & Reports</CardTitle>
          <CardDescription>Admin pages and diagnostic tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Teams & Approvals</strong>: Manage employee teams and approval history.</li>
            <li><strong>Reports Dashboard</strong>: Access vendor/site/PO/invoice reports and export options.</li>
            <li><strong>Database Status</strong>: Health checks and connection diagnostics for running services.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to contribute</CardTitle>
          <CardDescription>Where to add improvements and documentation.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-2">Documentation is stored alongside code. To extend Help Center, add a new section in <strong>client/src/pages/HelpCenter.tsx</strong> or centralize markdown files under <strong>docs/</strong> and render them in this page.</p>
          <p className="text-sm text-muted-foreground">If you want, I can automatically generate more detailed per-page docs (fields, API endpoints, example flows). Tell me which pages to prioritize.</p>
        </CardContent>
      </Card>
    </div>
  );
}
