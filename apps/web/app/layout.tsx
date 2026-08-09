import type { Metadata } from "next";
import "./globals.css";
import { ColdStartProvider } from "@/components/ColdStartProvider";

export const metadata: Metadata = {
  title: "Triage AI - Automated Incident Triage & Root Cause Analysis",
  description:
    "AI-powered incident triage platform. Ingest GitHub webhooks, classify stack traces with Gemini AI, run vector search with pgvector, and dispatch background queues with BullMQ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#060913] text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
        <ColdStartProvider>
          {children}
        </ColdStartProvider>
      </body>
    </html>
  );
}
