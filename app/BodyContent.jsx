// app/BodyContent.jsx
'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import CartProviderWrapper from '@/components/Providers';
import { SearchProvider } from '@/context/SearchContext';
import FbPixelTracker from '@/components/FbPixelTracker';
import { initFacebookPixel } from '@/utils/fbpixel';
import { getOrFetchToken } from '@/utils/tokenService';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="container text-center py-5" role="alert">
      <div className="alert alert-danger">
        <h2>Something went wrong</h2>
        <pre className="text-start">{error.message}</pre>
        <button className="btn btn-primary mt-3" onClick={resetErrorBoundary}>
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function BodyContent({ children }) {
  const queryClient = new QueryClient();

  useEffect(() => {
    // Pre-fetch token when app loads for better performance
    getOrFetchToken().catch(error => {
      console.error('Failed to pre-fetch token:', error);
    });

    // Initialize Facebook Pixel
    initFacebookPixel();
  }, []);

  return (
    <>
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

      <QueryClientProvider client={queryClient}>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
          onError={(error, info) => {
            console.error('ErrorBoundary caught an error:', error, info);
          }}
        >
          <AuthProvider>
            <CartProviderWrapper>
              <SearchProvider>
                <FbPixelTracker />
                <Toaster
                  containerStyle={{
                    position: 'fixed',
                    top: '5%',
                    left: '50%',
                    transform: 'translate(-50%)',
                    zIndex: 9999,
                  }}
                  toastOptions={{
                    style: {
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '15px',
                      minWidth: '300px',
                      textAlign: 'center',
                    },
                    success: { style: { background: '#28a745' } },
                    error: { style: { background: '#ff4f00' } },
                  }}
                />
                {children}
              </SearchProvider>
            </CartProviderWrapper>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>

      {/* Optional: Custom script */}
      <script src="/resources/js/script.js" async></script>
    </>
  );
}