// components/Providers.tsx
'use client';

import React, { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast, resolveValue } from 'react-hot-toast';
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
                            position="top-center"
                            gutter={10}
                            containerStyle={{
                                top: 24,
                                zIndex: 99999,
                            }}
                            toastOptions={{
                                duration: 3500,
                            }}
                        >
                            {(t) => {
                                const variant =
                                    t.type === 'success'
                                        ? 'success'
                                        : t.type === 'error'
                                        ? 'error'
                                        : 'default';

                                const title =
                                    variant === 'success'
                                        ? 'Success'
                                        : variant === 'error'
                                        ? 'Notice'
                                        : 'Info';

                                return (
                                    <div
                                        role="status"
                                        aria-live="polite"
                                        className={`kq-toast kq-toast--${variant} ${
                                            t.visible ? 'kq-toast--enter' : 'kq-toast--leave'
                                        }`}
                                    >
                                        <span className="kq-toast__icon" aria-hidden="true">
                                            {variant === 'success' && (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M20 6 9 17l-5-5" />
                                                </svg>
                                            )}
                                            {variant === 'error' && (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" x2="12" y1="8" y2="12" />
                                                    <line x1="12" x2="12.01" y1="16" y2="16" />
                                                </svg>
                                            )}
                                            {variant === 'default' && (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M12 16v-4" />
                                                    <path d="M12 8h.01" />
                                                </svg>
                                            )}
                                        </span>

                                        <div className="kq-toast__body">
                                            <span className="kq-toast__title">{title}</span>
                                            <div className="kq-toast__msg">
                                                {resolveValue(t.message, t)}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            aria-label="Close notification"
                                            onClick={() => toast.dismiss(t.id)}
                                            className="kq-toast__close"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="15"
                                                height="15"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                aria-hidden="true"
                                            >
                                                <path d="M18 6 6 18" />
                                                <path d="m6 6 12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            }}
                        </Toaster>
                        {children}
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
