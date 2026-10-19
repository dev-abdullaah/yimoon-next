// app/layout.tsx
import '@/styles/main.css';
import '@/styles/custom.css';
import React, { Suspense } from 'react';
import { Metadata, Viewport } from 'next';
import ConditionalLayout from './ConditionalLayout';
import Loading from '@/components/Loading';
import Providers from '@/components/Providers';

const inter = { className: 'font-sans' };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://kingqueenbd.com'),
  title: 'King Queen - Online Fashion & Lifestyle Store',
  description: 'Shop stylish, comfortable fashion and lifestyle essentials at King Queen. Discover curated scarves, clothing, innerwear, sunglasses, watches, jewelry, and accessories for everyday wear and special occasions.',
  keywords: 'King Queen, fashion store Bangladesh, online shopping BD, scarves, clothing, innerwear, lingerie, sunglasses, watches, jewelry, fashion accessories, lifestyle Bangladesh',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  referrer: 'strict-origin-when-cross-origin',
  openGraph: {
    type: 'website',
    title: 'King Queen - Online Fashion & Lifestyle Store',
    description: 'Shop stylish, comfortable fashion and lifestyle essentials at King Queen. Discover curated scarves, clothing, innerwear, sunglasses, watches, jewelry, and accessories.',
    images: [
      {
        url: '/resources/images/og-image-1200x630.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    siteName: 'King Queen',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'King Queen - Online Fashion & Lifestyle Store',
    description: 'Shop stylish, comfortable fashion and lifestyle essentials at King Queen. Discover curated scarves, clothing, innerwear, sunglasses, watches, jewelry, and accessories.',
    images: ['/resources/images/og-image-1200x630.png'],
  },
  icons: {
    icon: [
      { url: '/resources/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/resources/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/resources/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/resources/favicon/site.webmanifest',
  other: {
    'Cross-Origin-Opener-Policy': 'unsafe-none',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KKVBZJQR');`,
          }}
        />

        {/* Google Sign-In */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="common-home">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KKVBZJQR"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>

        {/* Facebook Pixel (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1177950201042712&ev=PageView&noscript=1"
          />
        </noscript>

        <Suspense fallback={<Loading />}>
          <Providers>
            <ConditionalLayout>{children}</ConditionalLayout>
          </Providers>
        </Suspense>

        {/* Optional: Custom script */}
        <script src="/resources/js/script.js" async></script>
      </body>
    </html>
  );
}
