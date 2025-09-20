// components/Providers.jsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SearchProvider } from '@/context/SearchContext';

// This component must be inside the AuthProvider to use useAuth
function CartProviderWrapper({ children }) {
  const { isAuthenticated } = useAuth();
  
  return (
    <CartProvider isAuthenticated={isAuthenticated}>
      {children}
    </CartProvider>
  );
}

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProviderWrapper>
          <SearchProvider>
            {children}
          </SearchProvider>
        </CartProviderWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}