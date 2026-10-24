import "server-only";
import nodemailer from "nodemailer";
import { EVENT } from "@/lib/constants";

let transport;

// Created on first use, not at import: builds must not need the SMTP credentials.
function getTransport() {
  const port = Number(process.env.SMTP_PORT) || 465;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

export async function sendMail({ to, bcc, subject, html, text, attachments }) {
  const from = { name: process.env.MAIL_FROM_NAME || "Győri Bencés Bál", address: process.env.SMTP_USER };
  // Sender is a noreply mailbox: guests' replies go to the organisers' inbox instead.
  const replyTo = process.env.MAIL_REPLY_TO || EVENT.email;
  return getTransport().sendMail({ from, replyTo, to, bcc, subject, html, text, attachments });
}
