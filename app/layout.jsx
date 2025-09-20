// app/layout.jsx
import '@/styles/custom.css';
import '@/styles/main.css';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import ConditionalLayout from './ConditionalLayout';
import Loading from '@/components/Loading';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Yi Moon - A Mini China Store in Bangladesh',
    template: '%s | Yi Moon',
  },
  description: 'Yi Moon - A Mini China Store in Bangladesh. Shop Baby Care, Toys, Stationery, Fashion & Lifestyle items imported from China at affordable prices!',
  keywords: 'Yi Moon, mini china store, online shopping Bangladesh, Chinese products BD, baby care, kids toys, stationery, fashion, girls dress, boys dress, kitchen items, lifestyle Bangladesh',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  referrer: 'strict-origin-when-cross-origin',
  openGraph: {
    type: 'website',
    siteName: 'Yi Moon',
  },
  icons: {
    icon: '/resources/images/favicon.ico',
  },
  other: {
    'Cross-Origin-Opener-Policy': 'unsafe-none',
  },
};

export default function RootLayout({ children }) {
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
        <script src="/resources/js/script.js" async strategy="afterInteractive"></script>
      </body>
    </html>
  );
}