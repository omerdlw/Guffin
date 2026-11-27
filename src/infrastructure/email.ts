import "server-only";

import { report, trimToNull } from "@omerdlw/base-framework/utils";
import { createHash } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

interface Message {
  idempotencyKey?: string;
  subject: string;
  text: string;
  to: string;
}

const DEFAULT_FROM = "Guffin <onboarding@resend.dev>";

let resend: Resend | null = null;
let smtp: Transporter | null = null;

function sender(): string {
  return trimToNull(process.env.EMAIL_FROM) ?? DEFAULT_FROM;
}

async function sendWithResend(key: string, message: Message): Promise<void> {
  resend ??= new Resend(key);
  const { error } = await resend.emails.send(
    {
      from: sender(),
      subject: message.subject,
      text: message.text,
      to: message.to,
    },
    message.idempotencyKey
      ? { idempotencyKey: message.idempotencyKey }
      : undefined,
  );
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
}

async function sendWithSmtp(url: string, message: Message): Promise<void> {
  smtp ??= nodemailer.createTransport(url);
  await smtp.sendMail({
    from: sender(),
    subject: message.subject,
    text: message.text,
    to: message.to,
  });
}

export async function sendEmail(message: Message): Promise<void> {
  const key = trimToNull(process.env.RESEND_API_KEY);
  const url = trimToNull(process.env.SMTP_URL);
  try {
    if (key) return await sendWithResend(key, message);
    if (url) return await sendWithSmtp(url, message);
  } catch (error) {
    report("Send email", error);
    throw error;
  }
  if (process.env.NODE_ENV === "development") {
    console.info(
      `[email] to ${message.to}: ${message.subject}\n${message.text}`,
    );
    return;
  }
  throw new Error(
    "No mail transport: set RESEND_API_KEY (or SMTP_URL locally)",
  );
}

export function otpEmail(
  to: string,
  otp: string,
  type: "sign-in" | "email-verification" | "change-email" | "forget-password",
): Message {
  const purpose =
    type === "change-email"
      ? "confirm your new email address"
      : "sign in to Guffin";
  return {
    idempotencyKey: `otp/${createHash("sha256").update(`${type}:${to}:${otp}`).digest("hex")}`,
    subject: `${otp} is your Guffin code`,
    text: `Use this code to ${purpose}:\n\n${otp}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
    to,
  };
}
