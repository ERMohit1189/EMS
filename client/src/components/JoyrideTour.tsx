import React, { useCallback, useEffect, useState } from 'react';
import Joyride, { CallBackProps, Step, STATUS } from 'react-joyride';
import { useLocation } from 'wouter';
import DraggableTooltip from './DraggableTooltip';

const defaultSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to the EOMS Portal! This comprehensive tour will guide you through all 16 main features. Click Next to begin!',
    placement: 'center',
    title: 'Welcome to EOMS Portal'
  },
  {
    target: '[data-testid="nav-link-register-vendor"]',
    content: 'Register new vendors in the system. Enter vendor details including name, code, email, and contact information.',
    placement: 'right',
    title: '1. Register Vendor'
  },
  {
    target: '[data-testid="nav-link-all-vendors"]',
    content: 'View and manage all vendor records. Search, filter, edit, or delete vendors from this centralized list.',
    placement: 'right',
    title: '2. All Vendors'
  },
  {
    target: '[data-testid="nav-link-vendor-credentials"]',
    content: 'Manage vendor login credentials securely. Generate or reset passwords for vendors and copy credentials easily.',
    placement: 'right',
    title: '3. Vendor Credentials'
  },
  {
    target: '[data-testid="nav-link-excel-upload"]',
    content: 'Import bulk data via Excel files. Upload site information, vendor details, or other bulk data quickly.',
    placement: 'right',
    title: '4. Excel Upload'
  },
  {
    target: '[data-testid="nav-link-site-list"]',
    content: 'View all registered sites. Manage site details, assign vendors, and track site status.',
    placement: 'right',
    title: '5. Site List'
  },
  {
    target: '[data-testid="nav-link-site-status"]',
    content: 'Monitor site status and progress. Track SOFT-AT, PHY-AT, and other site milestones.',
    placement: 'right',
    title: '6. Site Status'
  },
  {
    target: '[data-testid="nav-link-payment-master"]',
    content: 'Track and reconcile vendor payments. Record payment details, match with invoices, and manage payment methods.',
    placement: 'right',
    title: '7. Payment Master'
  },
  {
    target: '[data-testid="nav-link-po-generation"]',
    content: 'Create Purchase Orders in bulk for approved sites. Select multiple sites and generate POs efficiently with GST calculation.',
    placement: 'right',
    title: '8. PO Generation'
  },
  {
    target: '[data-testid="nav-link-invoice-generation"]',
    content: 'Generate invoices from Purchase Orders. Export invoices to PDF and send them to vendors.',
    placement: 'right',
    title: '9. Invoice Generation'
  },
  {
    target: '[data-testid="nav-link-register-employee"]',
    content: 'Register new employees in the system. Enter employee details, assign roles, and set up departments.',
    placement: 'right',
    title: '10. Register Employee'
  },
  {
    target: '[data-testid="nav-link-employee-credentials"]',
    content: 'Manage employee login credentials. Generate passwords, reset accounts, and view employee access status.',
    placement: 'right',
    title: '11. Employee Credentials'
  },
  {
    target: '[data-testid="nav-link-teams"]',
    content: 'Organize employees into teams. Assign team leaders and manage reporting structures.',
    placement: 'right',
    title: '12. Teams'
  },
  {
    target: '[data-testid="nav-link-monthly-attendance"]',
    content: 'Track employee attendance monthly. Mark attendance, view reports, and manage leave records.',
    placement: 'right',
    title: '13. Monthly Attendance'
  },
  {
    target: '[data-testid="nav-link-salary-structure"]',
    content: 'Define employee salary structures. Set up basic pay, allowances, deductions, and calculate CTC.',
    placement: 'right',
    title: '14. Salary Structure'
  },
  {
    target: '[data-testid="nav-link-generate-salaries"]',
    content: 'Generate monthly salaries for employees. Process payroll, calculate deductions, and generate salary slips.',
    placement: 'right',
    title: '15. Generate Salaries'
  },
  {
    target: '[data-testid="nav-link-allowance-approvals"]',
    content: 'Approve or reject employee allowance requests. Review pending approvals and maintain approval history.',
    placement: 'right',
    title: '16. Allowance Approval'
  },
  {
    target: '[data-testid="button-settings"]',
    content: 'Configure application settings. Manage invoice windows, export headers, and system preferences.',
    placement: 'left',
    title: '17. App Settings'
  },
  {
    target: 'body',
    content: 'Congratulations! You have completed the full tour of all 17 features. You can now explore the EOMS Portal with confidence. Click the Quick Guide button anytime to restart the tour.',
    placement: 'center',
    title: 'Tour Complete! 🎉'
  },
];

export default function JoyrideTour() {
  const [, setLocation] = useLocation();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>(defaultSteps);
  const [tourKey, setTourKey] = useState(0);

  // Handle tour start event
  useEffect(() => {
    const handler = (e: any) => {
      const provided: Step[] | undefined = e?.detail?.steps;

      // Reset tour completely
      setRun(false);

      setTimeout(() => {
        if (provided && Array.isArray(provided)) {
          setSteps(provided as Step[]);
        }

        // Force remount by changing key
        setTourKey(prev => prev + 1);

        // Expand all sidebar groups for visibility
        try {
          window.dispatchEvent(new CustomEvent('ensure-sidebar-groups', {
            detail: {
              groups: [
                'Vendor Management',
                'Site Management',
                'Vendor Transactions',
                'Employee Management',
                'Attendance & Leave',
                'Payroll & Salary',
                'Allowances & Approvals',
                'Settings'
              ]
            }
          }));
        } catch (err) { /* ignore */ }

        console.log('[JoyrideTour] Starting tour');
        // Start the tour
        setRun(true);
      }, 100);
    };

    window.addEventListener('start-joyride', handler as EventListener);
    return () => window.removeEventListener('start-joyride', handler as EventListener);
  }, []);

  // Handle tour callbacks
  const callback = useCallback((data: CallBackProps) => {
    const { index, type, status, action } = data;

    console.log('[JoyrideTour]', { step: index + 1, type, status, action });

    // Reset and remount on each step to prevent overlapping tooltips
    if (type === 'step:after' && action === 'next') {
      setRun(false);
      setTimeout(() => setRun(true), 50);
    }

    // Expand all sidebar groups on every step
    try {
      window.dispatchEvent(new CustomEvent('ensure-sidebar-groups', {
        detail: {
          groups: [
            'Vendor Management',
            'Site Management',
            'Vendor Transactions',
            'Employee Management',
            'Attendance & Leave',
            'Payroll & Salary',
            'Allowances & Approvals',
            'Settings'
          ]
        }
      }));
    } catch (err) { /* ignore */ }

    // Handle tour completion
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('[JoyrideTour] Tour ended:', status);
      setRun(false);
    }
  }, []);

  return (
    <Joyride
      key={tourKey}
      steps={steps}
      run={run}
      callback={callback}
      tooltipComponent={DraggableTooltip}
      continuous={true}
      showProgress={false}
      showSkipButton={true}
      scrollToFirstStep={true}
      scrollDuration={400}
      disableCloseOnEsc={false}
      disableOverlay={false}
      disableScrolling={false}
      spotlightClicks={false}
      hideBackButton={false}
      disableBeacon={true}
      hideCloseButton={true}
      styles={{
        options: {
          zIndex: 99999,
          primaryColor: '#2563eb',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          width: 450
        },
        tooltip: {
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: 20,
          backgroundColor: '#ffffff'
        },
        tooltipTitle: {
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 12,
          color: '#1f2937'
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: '1.6',
          color: '#4b5563'
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          fontSize: 14,
          padding: '8px 20px',
          borderRadius: 4,
          color: '#ffffff'
        },
        buttonBack: {
          color: '#2563eb',
          fontSize: 14,
          marginRight: 12
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: 14
        }
      }}
      locale={{ back: 'Back', close: 'Close', last: 'Finish', next: 'Next', skip: 'Skip' }}
    />
  );
}
