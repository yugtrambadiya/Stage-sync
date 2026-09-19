import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Anchor — AI Stage Copilot",
  description: "Real-time AI-powered event and stage management."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
