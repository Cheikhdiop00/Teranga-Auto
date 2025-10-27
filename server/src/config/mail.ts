import nodemailer from 'nodemailer';

// Allow both SMTP_* and EMAIL_* env variable names
const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || '';
const RAW_PORT = process.env.SMTP_PORT || process.env.EMAIL_PORT;
const SMTP_PORT = RAW_PORT ? Number(RAW_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
// Infer secure from explicit flag or common SSL port 465
const EXPLICIT_SECURE = String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || '').toLowerCase();
const SMTP_SECURE = EXPLICIT_SECURE ? EXPLICIT_SECURE === 'true' : SMTP_PORT === 465;
const MAIL_FROM = process.env.MAIL_FROM || process.env.EMAIL_FROM || SMTP_USER || 'no-reply@example.com';

// Create and cache transporter
let transporter: nodemailer.Transporter | null = null;

export function getMailTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, // true for 465, false for other ports
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return transporter;
}

export function getDefaultFrom() {
  return MAIL_FROM;
}
