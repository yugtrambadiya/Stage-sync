import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StageSync — Live Stage Coordination',
  description:
    'Realtime stage management for live events. Agenda sync, AI-generated scripts, and delay recovery — all in one broadcast control room.',
  keywords: ['live event', 'stage management', 'agenda sync', 'realtime', 'AI scripts'],
};

import { ThemeProvider } from '../components/ThemeProvider';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
