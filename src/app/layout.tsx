import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Shell } from '@/components/layout/Shell';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'ApplyIQ - AI-Powered Job Application Intelligence',
  description: 'Your job search, analysed rather than merely tracked.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans">
        <AppProvider>
          <Shell>{children}</Shell>
          <Analytics />
          <SpeedInsights />
        </AppProvider>
      </body>
    </html>
  );
}
