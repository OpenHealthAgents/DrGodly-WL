import type { Metadata } from "next";
import "./globals.css";
import { ChatAssistant } from "@/components/ChatAssistant";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Wellora",
  description: "Wellora health and wellness platform",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/wellora-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/wellora-mark.svg",
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
