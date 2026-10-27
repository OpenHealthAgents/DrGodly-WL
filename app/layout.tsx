import type { Metadata } from "next";
import "./globals.css";
import { ChatAssistant } from "@/components/ChatAssistant";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "Doctor-Guided GLP-1 Weight Loss Treatment | DrGodly",
    template: "%s | DrGodly",
  },
  description: "Personalized, doctor-guided GLP-1 weight loss care with eligibility screening, treatment plans, and ongoing support.",
  metadataBase: new URL(getSiteUrl()),
  openGraph: {
    siteName: "DrGodly",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/Before-After1.png",
        width: 2816,
        height: 1536,
        alt: "Before and after weight-loss progress example",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/Before-After1.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/drgodly-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/drgodly-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ChatAssistant />
          <WhatsAppWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
