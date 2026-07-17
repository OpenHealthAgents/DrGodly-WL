import type { Metadata } from "next";
import "./globals.css";
import { ChatAssistant } from "@/components/ChatAssistant";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "DrGodly",
  description: "DrGodly health and wellness platform",
  metadataBase: new URL(getSiteUrl()),
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
        </ThemeProvider>
      </body>
    </html>
  );
}
