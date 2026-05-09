import type { Metadata } from "next";
import "./globals.css";
import { ChatAssistant } from "@/components/ChatAssistant";

export const metadata: Metadata = {
  title: "Wellora",
  description: "Wellora health and wellness platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatAssistant />
      </body>
    </html>
  );
}
