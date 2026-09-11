import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/constants";
import { I18nProvider } from "@/lib/i18n";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: `${BRAND} — Photography, Videography & Livestreaming in Kigali`,
  description: `${BRAND} is a Kigali-based media production company by video journalist Nkurunziza Jabo — photography, videography, livestreaming and aerial coverage for events, media houses, and institutions including FAO, The New Times and Kigali Today.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="flex min-h-full flex-col bg-cream font-sans text-ink">
        <I18nProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppFab />
        </I18nProvider>
      </body>
    </html>
  );
}
