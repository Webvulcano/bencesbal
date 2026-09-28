import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Jelentkezés — Győri Bencés Bál",
  description: "Jelentkezés a Győri Bencés Bálra",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu" className={`${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
