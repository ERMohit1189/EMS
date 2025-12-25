import nodemailer from 'nodemailer';

import { storage } from "../storage";

const FROM_EMAIL_FALLBACK = process.env.FROM_EMAIL || 'no-reply@example.com';

export type SendOtpResult = {
  info?: any;
  preview: {
    subject: string;
    text: string;
    html: string;
  };
  settingsUsed: {
    host?: string | null;
    port?: number | null;
    user?: string | null;
    from?: string;
    fromName?: string | null;
    secure?: boolean;
  };
} | null;

export async function sendOtpEmail(to: string, otp: string, expiresInMinutes = 10): Promise<SendOtpResult> {
  // Get SMTP configuration from app settings (superadmin can edit these)
  try {
    const settings = await storage.getAppSettings();
    const exportHeader = await storage.getExportHeader();

    const host = settings?.smtpHost || process.env.SMTP_HOST || null;
    const port = settings?.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined) || null;
    const user = settings?.smtpUser || process.env.SMTP_USER || null;
    const pass = settings?.smtpPass || process.env.SMTP_PASS || null;
    const secure = typeof settings?.smtpSecure === 'boolean' ? settings?.smtpSecure : (port === 465);
    const from = settings?.fromEmail || exportHeader?.contactEmail || FROM_EMAIL_FALLBACK;
    const fromName = settings?.fromName || exportHeader?.companyName || null;

    const subject = `${fromName ? `${fromName} — ` : ''}Your One‑Time Password (OTP)`;
    const companyLine = exportHeader?.companyName ? `${exportHeader.companyName}` : '';
    const contactLine = exportHeader?.contactEmail || exportHeader?.contactPhone ? `Contact: ${exportHeader?.contactEmail || ''}${exportHeader?.contactPhone ? ` • ${exportHeader?.contactPhone}` : ''}` : '';

    const text = `Hello,\n\nYour one-time password (OTP) is: ${otp}\nIt will expire in ${expiresInMinutes} minutes.\n\n${companyLine}${contactLine ? '\n' + contactLine : ''}\n\nIf you didn't request this, please ignore this email or contact support.\n\nRegards,\n${fromName || from}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
          <h2 style="margin:0 0 10px 0;">${fromName ? fromName : 'Support'}</h2>
          <p style="margin:0 0 20px 0;color:#555;">You've requested a one-time password to reset your password. Use the code below within <strong>${expiresInMinutes} minutes</strong>.</p>
          <div style="text-align:center;margin:20px 0;">
            <span style="display:inline-block;padding:14px 20px;font-size:20px;letter-spacing:4px;background:#f4f4f6;border-radius:6px;border:1px solid #e6e6ea;"><strong>${otp}</strong></span>
          </div>
          <p style="color:#666;font-size:13px;line-height:1.4;">For your security, do not share this code with anyone. If you did not request this, please ignore this message or contact us.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <div style="font-size:12px;color:#888;">
            <div><strong>${exportHeader?.companyName || ''}</strong></div>
            ${exportHeader?.address ? `<div>${exportHeader.address}</div>` : ''}
            ${exportHeader?.website ? `<div><a href="${exportHeader.website}">${exportHeader.website}</a></div>` : ''}
            ${exportHeader?.contactEmail || exportHeader?.contactPhone ? `<div>${contactLine}</div>` : ''}
            <div style="margin-top:8px;">This message was sent from <strong>${from}</strong>${fromName ? ` on behalf of ${fromName}` : ''}.</div>
          </div>
        </div>
      </div>
    `;

    const preview = { subject, text, html };
    const settingsUsed = { host, port, user, from, fromName, secure };
    const company = {
      companyName: exportHeader?.companyName || null,
      address: exportHeader?.address || null,
      website: exportHeader?.website || null,
      contactEmail: exportHeader?.contactEmail || null,
      contactPhone: exportHeader?.contactPhone || null,
    };

    if (host && port && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Boolean(secure),
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from: fromName ? `${fromName} <${from}>` : from,
        to,
        subject,
        text,
        html,
      });

      console.log('[Email] Sent OTP to', to, 'messageId:', info.messageId, 'via', host, port);
      return { info, preview, settingsUsed };
    } else {
      console.log('[Email] SMTP not configured, falling back to log-based OTP output');
      console.log(`[Email-Fallback] OTP for ${to}: ${otp} (no SMTP configured or send failed)`);
      return { preview, settingsUsed };
    }
  } catch (err: any) {
    console.error('[Email] Error while trying to send OTP:', err?.message || err);
    // Write detailed error to a temporary log file for debugging
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const out = `[${new Date().toISOString()}] Error sending email to ${to}: ${err?.message || String(err)}\n${err?.stack || ''}\n`;
      fs.appendFileSync(path.join(dir, 'email_errors.log'), out);
    } catch (e) {
      console.error('[Email] Failed to write debug log:', e);
    }
  }

  return null;
}
