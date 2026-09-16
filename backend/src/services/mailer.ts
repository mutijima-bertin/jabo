import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  // Single source of truth — env.smtpConfigured requires a usable SMTP config
  // (host/user/pass present AND host length >= 5), so placeholder/garbage
  // creds are treated as unconfigured and never attempted.
  if (!env.smtpConfigured) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      // Hard bounds on SMTP connect/socket so backgrounded sends can never
      // accumulate on a slow/hung mail server.
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
    });
  }
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ sent: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    return { sent: false, error: "SMTP not configured" };
  }
  try {
    await t.sendMail({
      from: env.mailFrom,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}
