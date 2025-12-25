import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function PrintSalary() {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('printSalaryData');
      if (!raw) {
        document.body.innerHTML = '<div style="padding:40px; font-family: Arial;">No printable data found.</div>';
        return;
      }
      const data = JSON.parse(raw);
      const { userProfile, salarySlip, exportHeader } = data;

      const container = document.createElement('div');
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
      container.style.padding = '20px';
      const companyName = (exportHeader && exportHeader.companyName) || 'Enterprise Operations Management System (EOMS)';
      const companyAddress = (exportHeader && exportHeader.address) || '';
      const logoUrl = (exportHeader && (exportHeader as any).logoUrl) || '';

      container.innerHTML = `
        <div style="max-width:800px; margin:0 auto;">
          <div style="text-align:center; margin-bottom:8px;">
            <div style="height:8px; background:linear-gradient(90deg,#e0f7ff,#bae6fd); border-radius:4px; margin-bottom:12px;"></div>
            <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:8px;">
              ${logoUrl ? `<img src="${logoUrl}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;" />` : `<div style="width:56px;height:56px;border-radius:8px;background:#0ea5e9;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px">${companyName.charAt(0)}</div>`}
              <div>
                <div style="font-size:18px;font-weight:700;color:#0f172a;">${companyName}</div>
                  <div style="color:#475569;font-size:12px;">${companyAddress}</div>
                  <div style="color:#475569;font-size:12px;">${exportHeader?.contactEmail || ''}${exportHeader?.contactPhone ? ` | ${exportHeader.contactPhone}` : ''}</div>
              </div>
            </div>
          </div>
          <div style="text-align:center; margin-bottom:16px; border-bottom:3px solid #0ea5a4; padding-bottom:8px;">
            <h1 style="margin:0; color:#0f172a;">Salary Slip</h1>
            <div style="color:#475569;">Month: ${salarySlip.month}/${salarySlip.year}</div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
            <div>
              <div style="font-size:12px; color:#64748b;">Employee Name</div>
              <div style="font-weight:600;">${userProfile?.name || ''}</div>
            </div>
            <div>
              <div style="font-size:12px; color:#64748b;">Employee Code</div>
              <div style="font-weight:600;">${userProfile?.emp_code || userProfile?.id || ''}</div>
            </div>
            <div>
              <div style="font-size:12px; color:#64748b;">Designation</div>
              <div style="font-weight:600;">${userProfile?.designation || ''}</div>
            </div>
            <div>
              <div style="font-size:12px; color:#64748b;">Department</div>
              <div style="font-weight:600;">${userProfile?.department || ''}</div>
            </div>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            <thead>
              <tr style="background:#0ea5a4; color:white;">
                <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Earnings</th>
                <th style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Amount</th>
                <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Deductions</th>
                <th style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px; border:1px solid #e2e8f0;">Basic Wage</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.basicSalary).toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #e2e8f0;">EPF</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.pf).toLocaleString()}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:8px; border:1px solid #e2e8f0;">HRA</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.hra).toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #e2e8f0;">ESI / Health Insurance</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.esic).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #e2e8f0;">Conveyance Allowances</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.conveyance).toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #e2e8f0;">Professional Tax</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.professionalTax).toLocaleString()}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:8px; border:1px solid #e2e8f0;">Medical Allowances</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.medical).toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #e2e8f0;">Loan Recovery</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs 0</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #e2e8f0;">Other Allowances</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.otherBenefits).toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #e2e8f0;"></td>
                <td style="padding:8px; border:1px solid #e2e8f0;"></td>
              </tr>
              <tr style="background:#0ea5a4; color:white; font-weight:700;">
                <td style="padding:8px; border:1px solid #e2e8f0;">Total Earnings</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.grossSalary).toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #e2e8f0;">Total Deductions</td>
                <td style="padding:8px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.totalDeductions).toLocaleString()}</td>
              </tr>
              <tr style="background:#094c4c; color:white; font-weight:800; font-size:16px;">
                <td style="padding:10px; border:1px solid #e2e8f0;" colSpan={3}>Net Salary</td>
                <td style="padding:10px; text-align:right; border:1px solid #e2e8f0;">Rs ${Number(salarySlip.netSalary).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top:24px; text-align:center; color:#64748b; font-size:12px;">This is a computer-generated salary slip and does not require a signature.</div>
        </div>
      `;

      document.body.innerHTML = '';
      document.body.appendChild(container);

      // Wait for images to load (logo) before printing to avoid missing header
      const waitForImages = () => {
        const imgs = Array.from(document.images);
        return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; })));
      };

      waitForImages().then(() => {
        try {
          window.print();
        } catch (err) {
          console.error('Auto print failed', err);
        }
      }).catch((err) => {
        console.warn('Image load wait failed, proceeding to print', err);
        try { window.print(); } catch (e) { console.error('Auto print failed', e); }
      });
      // Close the print window after print finishes (best-effort)
      try {
        if ('onafterprint' in window) {
          window.onafterprint = () => {
            try { window.close(); } catch (e) { /* ignore */ }
          };
        } else {
          // Fallback: close after a delay (user may cancel print)
          setTimeout(() => {
            try { window.close(); } catch (e) { /* ignore */ }
          }, 3000);
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      document.body.innerHTML = '<div style="padding:40px; font-family: Arial;">Error preparing printable content.</div>';
      console.error(e);
    }
  }, []);

  return (<div />);
}
