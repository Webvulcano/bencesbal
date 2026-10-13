import "server-only";
import nodemailer from "nodemailer";

let transport;

// Created on first use, not at import: builds must not need the Gmail credentials.
function getTransport() {
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transport;
}

export async function sendMail({ to, subject, html, text, attachments }) {
  const from = { name: process.env.MAIL_FROM_NAME || "Győri Bencés Bál", address: process.env.GMAIL_USER };
  return getTransport().sendMail({ from, to, subject, html, text, attachments });
}
