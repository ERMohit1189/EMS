import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function EmployeePrivacyPolicy() {
  const [, setLocation] = useLocation();
  const [hrEmail, setHrEmail] = useState('hr@company.com');

  useEffect(() => {
    const stored = localStorage.getItem('hrContactEmail');
    if (stored) {
      setHrEmail(stored);
    }
  }, []);

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
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy - Employee Portal</h1>
          <p className="text-muted-foreground mt-2">Last updated: November 28, 2024</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            This Privacy Policy outlines how the Enterprise Operations Management System (EOMS) Employee Portal collects, uses, and protects your personal information. We are committed to maintaining your privacy and ensuring transparency in our data handling practices.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <div>
            <h4 className="font-semibold mb-2">Personal Information:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Full name, email address, and phone number</li>
              <li>Date of birth and marital status</li>
              <li>Address and identification details (Aadhar, PAN)</li>
              <li>Employment information (role, designation, department)</li>
              <li>Salary structure and financial information</li>
              <li>Attendance and leave records</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">System Information:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Login credentials and authentication data</li>
              <li>Session information and usage logs</li>
              <li>IP address and device information</li>
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
            <li>To authenticate and manage your account access</li>
            <li>To maintain employee records and payroll processing</li>
            <li>To track attendance, leave, and performance metrics</li>
            <li>To communicate important organizational information</li>
            <li>To comply with legal and regulatory requirements</li>
            <li>To generate reports and analyze organizational data</li>
            <li>To improve system functionality and security</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Data Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We implement industry-standard security measures to protect your personal information, including:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Encrypted data transmission using SSL/TLS protocols</li>
            <li>Secure password hashing and storage mechanisms</li>
            <li>Access controls and role-based permissions</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Restricted access to sensitive employee data</li>
          </ul>
          <p className="mt-4">
            Despite our security measures, no system is completely secure. You are responsible for maintaining the confidentiality of your login credentials.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Data Sharing and Disclosure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We do not sell, trade, or rent your personal information. However, your data may be shared with:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Authorized HR and management personnel within the organization</li>
            <li>Finance and accounting departments for payroll processing</li>
            <li>Government agencies as required by law</li>
            <li>Third-party service providers with appropriate confidentiality agreements</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            You have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access your personal information and request corrections</li>
            <li>Request deletion of non-essential data</li>
            <li>Opt-out of non-essential communications</li>
            <li>Appeal privacy concerns through the HR department</li>
            <li>File a complaint with relevant data protection authorities</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Data Retention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We retain your personal information for the duration of your employment and as required by applicable laws. After termination, records are maintained according to legal retention requirements. You may request data deletion subject to legal obligations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Contact and Complaints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            If you have concerns about your privacy or wish to exercise your rights, please contact:
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p><strong>HR Department</strong></p>
            <p data-testid="text-hr-email">Email: {hrEmail}</p>
            <p>You can also submit privacy-related requests through your employee dashboard.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Changes to This Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            We reserve the right to update this Privacy Policy at any time. Material changes will be notified to employees through email. Your continued use of the portal constitutes acceptance of the updated policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
