import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rolex — Perpetual 3D Horology Showcase',
  description:
    'Interactive 3D Rolex timepiece atelier featuring live mechanical calibers, custom alloys and dials, exploded view, and curated collection.',
  openGraph: {
    title: 'Rolex — Perpetual 3D Horology Showcase',
    description:
      'Interactive 3D Rolex timepiece atelier featuring live mechanical calibers, custom alloys and dials, exploded view, and curated collection.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rolex — Perpetual 3D Horology Showcase',
    description:
      'Interactive 3D Rolex timepiece atelier featuring live mechanical calibers, custom alloys and dials, exploded view, and curated collection.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body suppressHydrationWarning className="bg-[#0A0D0C] text-[#F4F2ED] antialiased selection:bg-[#006039] selection:text-white">
        {children}
      </body>
    </html>
  );
}
