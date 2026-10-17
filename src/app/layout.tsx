import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FluxDesk - Multi-Tenant Zendesk Helpdesk",
  description: "Modern Zendesk-style 3-column agent desk with public replies and yellow internal notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full font-sans antialiased selection:bg-zinc-900 selection:text-white bg-zinc-50/50 text-zinc-900`}>
        {children}
      </body>
    </html>
  );
}
