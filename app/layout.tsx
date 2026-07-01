import type { Metadata } from 'next';
import { Crimson_Pro } from 'next/font/google';
import './globals.css';

const crimson = Crimson_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Event Planner Retreat · Happy Valley Farms',
  description:
    'A private two-day gathering at Happy Valley Farms — Monday, August 3rd through Tuesday, August 4th.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={crimson.variable}>
      <body>{children}</body>
    </html>
  );
}
