import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Calm OS | AI Priority Operating System",
  description:
    "An AI-powered operating layer that filters noise, summarizes what matters, and protects focus across every digital platform.",
  applicationName: "Digital Calm OS",
  keywords: [
    "AI productivity",
    "digital wellbeing",
    "focus mode",
    "notification management",
    "priority inbox"
  ],
  openGraph: {
    title: "Digital Calm OS",
    description:
      "A premium AI command center for reducing information overload.",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
