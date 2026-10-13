import type { Metadata } from "next";
import "./globals.css";

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
      <body className="h-full bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
