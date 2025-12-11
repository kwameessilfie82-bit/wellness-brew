import type { Metadata } from "next";


// import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";

import { SEO_CONFIG } from "@/app";
import "@/css/globals.css";
import { ConditionalLayout } from "@/ui/components/conditional-layout";
import { ThemeProvider } from "@/ui/components/theme-provider";
import { Toaster } from "@/ui/primitives/sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});


const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: `${SEO_CONFIG.description}`,
  title: `${SEO_CONFIG.fullName}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          min-h-screen bg-gradient-to-br from-white to-slate-100
          text-neutral-900 antialiased
          selection:bg-primary/80
          dark:from-neutral-950 dark:to-neutral-900 dark:text-neutral-100
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
            <ConditionalLayout>{children}</ConditionalLayout>
            <Toaster />
        </ThemeProvider>
        {/* <SpeedInsights /> */}
      </body>
    </html>
  );
}
