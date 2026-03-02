import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SearchKit — Search-as-a-Service for indie SaaS',
  description:
    'Drop-in search API + 5KB JS widget powered by PostgreSQL full-text search. Algolia, but $9/mo.',
  keywords: ['search', 'saas', 'full-text search', 'postgresql', 'api'],
  authors: [{ name: 'ThreeStack', url: 'https://threestack.io' }],
  openGraph: {
    title: 'SearchKit — Search-as-a-Service for indie SaaS',
    description: 'Drop-in search API + 5KB JS widget powered by PostgreSQL full-text search.',
    url: 'https://searchkit.threestack.io',
    siteName: 'SearchKit',
    type: 'website',
    images: [
      {
        url: 'https://searchkit.threestack.io/og.png',
        width: 1200,
        height: 630,
        alt: 'SearchKit — Search-as-a-Service',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SearchKit — Search-as-a-Service for indie SaaS',
    description: 'Drop-in search API + 5KB JS widget powered by PostgreSQL full-text search.',
    images: ['https://searchkit.threestack.io/og.png'],
  },
  metadataBase: new URL('https://searchkit.threestack.io'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
