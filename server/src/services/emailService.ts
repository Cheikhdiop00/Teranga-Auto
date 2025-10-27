import { getMailTransporter, getDefaultFrom } from '../config/mail.js';

export type SendMailParams = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

export async function sendMail({ to, subject, text, html, from }: SendMailParams) {
  const transporter = getMailTransporter();
  const mailFrom = from || getDefaultFrom();

  // Ensure at least one body format
  const body: { text?: string; html?: string } = {};
  if (html) body.html = html;
  if (text || !html) body.text = text || subject;

  const info = await transporter.sendMail({
    from: mailFrom,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    ...body,
  });

  return info;
}
