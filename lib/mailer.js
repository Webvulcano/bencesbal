import "server-only";
import nodemailer from "nodemailer";
import { EVENT } from "@/lib/constants";

const transports = {};

// Created on first use, not at import: builds must not need the SMTP credentials.
function getTransport(name) {
  if (name === "gmail") {
    transports.gmail ??= nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    return transports.gmail;
  }
  const port = Number(process.env.SMTP_PORT) || 465;
  transports.smtp ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transports.smtp;
}

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// Hotmail/Outlook silently drops mail from the noreply mailbox (shared hosting IP), so only Gmail recipients get it
// from there; everyone else gets it from the Gmail fallback account. Without GMAIL_* set, everything uses SMTP.
export function pickSender(to, env = process.env) {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return "smtp";
  const domain = String(to).trim().split("@").pop().toLowerCase();
  return GMAIL_DOMAINS.has(domain) ? "smtp" : "gmail";
}

export async function sendMail({ to, bcc, subject, html, text, attachments }) {
  const sender = pickSender(to);
  const address = sender === "gmail" ? process.env.GMAIL_USER : process.env.SMTP_USER;
  const from = { name: process.env.MAIL_FROM_NAME || "Győri Bencés Bál", address };
  // Sender is a noreply / fallback mailbox: guests' replies go to the organisers' inbox instead.
  const replyTo = process.env.MAIL_REPLY_TO || EVENT.email;
  return getTransport(sender).sendMail({ from, replyTo, to, bcc, subject, html, text, attachments });
}
