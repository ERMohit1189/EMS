import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function VendorPrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy - Vendor Portal</h1>
          <p className="text-muted-foreground mt-2">Last updated: November 28, 2024</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            This Privacy Policy explains how the Enterprise Management System (EMS) Vendor Portal collects, uses, and protects your business and personal information. We are committed to safeguarding your data and ensuring transparent business practices.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <div>
            <h4 className="font-semibold mb-2">Business Information:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Vendor name and business registration details</li>
              <li>Business address, contact details, and postal code</li>
              <li>GSTIN, PAN, and other tax identification numbers</li>
              <li>Bank account and payment information</li>
              <li>Memorandum of Association (MOA) and business documents</li>
              <li>Vendor category and classification</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Personal Information:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Contact person name and email address</li>
              <li>Phone number and communication preferences</li>
              <li>Aadhar and PAN details of authorized signatories</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Transaction Data:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Purchase orders and invoice information</li>
              <li>Payment history and transaction records</li>
              <li>Site management and project data</li>
              <li>Performance metrics and compliance records</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. How We Use Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <ul className="list-disc pl-5 space-y-2">
            <li>To establish and maintain vendor accounts</li>
            <li>To process purchase orders and invoice payments</li>
            <li>To manage site operations and project deliverables</li>
            <li>To verify vendor compliance and audit requirements</li>
            <li>To calculate GST and ensure regulatory compliance</li>
            <li>To communicate regarding orders, payments, and performance</li>
            <li>To analyze vendor performance and generate reports</li>
            <li>To prevent fraudulent activities and ensure system security</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Data Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We implement comprehensive security measures to protect your business information:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Encrypted transmission of sensitive financial data</li>
            <li>Secure authentication with email-based login credentials</li>
            <li>Password hashing and cryptographic storage methods</li>
            <li>Role-based access controls and data segregation</li>
            <li>Regular security audits and penetration testing</li>
            <li>Restricted access to financial and tax documents</li>
            <li>Automated logging of all data access and modifications</li>
          </ul>
          <p className="mt-4">
            You are responsible for maintaining the confidentiality of your login credentials and notifying us immediately of any unauthorized access.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Data Sharing and Disclosure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We do not sell or trade vendor information. However, your data may be shared with:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Internal procurement and finance departments</li>
            <li>Project managers and site coordinators</li>
            <li>Government agencies for GST and tax compliance</li>
            <li>Auditors and compliance officers as required</li>
            <li>Third-party vendors with signed data protection agreements</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. GST and Tax Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            Your GSTIN, PAN, and other tax details are used exclusively for:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Calculating IGST (interstate) and CGST+SGST (intrastate) taxes</li>
            <li>Generating tax-compliant invoices</li>
            <li>Filing government tax returns and GST documentation</li>
            <li>Verifying vendor tax compliance status</li>
          </ul>
          <p className="mt-4">
            We maintain the accuracy of tax information and comply with all applicable Indian tax regulations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            As a vendor, you have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access your vendor profile and transaction history</li>
            <li>Request corrections to your business information</li>
            <li>Request deletion of data after contract termination (subject to legal requirements)</li>
            <li>Receive copies of your documents upon request</li>
            <li>Appeal vendor status decisions through the procurement department</li>
            <li>File complaints regarding data misuse</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Data Retention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We retain vendor information for the duration of the business relationship and as required by Indian accounting standards and tax regulations. After contract termination:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Financial records are retained for 7 years as per GST guidelines</li>
            <li>Tax documents are maintained as per legal requirements</li>
            <li>Personal contact information may be retained for communication purposes</li>
            <li>Deletion requests are honored subject to legal compliance</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Contact and Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            For privacy concerns, data access requests, or to report security issues:
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p><strong>Procurement Department</strong></p>
            <p>Email: procurement@company.com</p>
            <p><strong>Data Protection Officer</strong></p>
            <p>Email: dpo@company.com</p>
            <p>Response time: 5-7 business days</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>9. Policy Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We may update this Privacy Policy to reflect regulatory changes or business practices. Vendors will be notified of material changes via email. Continued use of the portal after updates indicates acceptance of the revised policy.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>10. Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            This Privacy Policy complies with:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Information Technology Act, 2000</li>
            <li>GST Law and Tax Regulations</li>
            <li>RBI Guidelines for Financial Data Protection</li>
            <li>Industry best practices for data security</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
