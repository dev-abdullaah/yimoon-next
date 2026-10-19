// components/Providers.tsx
'use client';

import React, { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SearchProvider } from '@/context/SearchContext';

export interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps): React.JSX.Element {
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
                <CartProvider>
                    <SearchProvider>
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
                </CartProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
