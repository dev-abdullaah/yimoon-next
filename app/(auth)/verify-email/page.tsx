// app/(auth)/verify-email/page.tsx
'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

/**
 * Complete an email verification from the link in the inbox.
 *
 * The link arrives as four parameters: the account id, a hash of the address, the
 * link's expiry and a signature over the pair. This page rebuilds the API call
 * from them and makes it once.
 *
 * Two things it deliberately does not do:
 *
 *  - **Verify anything itself.** The signature is a keyed hash the storefront has
 *    no key to compute or check. It is forwarded verbatim to the endpoint that
 *    can, and that endpoint is the only thing whose answer counts.
 *  - **Retry.** A refused signature means a tampered or expired link, and asking
 *    again would only earn another refusal. The shopper is told to request a new
 *    one instead, which is a thing they can actually do.
 *
 * The `optionalAuth` call is unauthenticated by nature — the shopper has no
 * session on a machine that never signed in — so a 401 here is the API refusing
 * the link, not an expired session, and must not bounce them to the login form.
 */

function VerifyEmailForm() {
    const searchParams = useSearchParams();

    const [status, setStatus] = useState<'working' | 'done' | 'failed'>('working');
    const [message, setMessage] = useState<string>('Verifying your email address…');

    // `useEffect` runs twice in React's strict-mode development build, and a
    // verification is a one-shot state change. Without this, the second run
    // would arrive after the first had already succeeded and be told the address
    // was "already verified" — a worse message for the same correct outcome.
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        const getParam = (key: string): string | null => {
            const val = searchParams?.get(key) || searchParams?.get(`amp;${key}`) || searchParams?.get(`amp%3B${key}`);
            if (val) return val;
            if (typeof window !== 'undefined') {
                const cleanedParams = new URLSearchParams(window.location.search.replace(/&amp;/g, '&'));
                return cleanedParams.get(key);
            }
            return null;
        };

        const id = getParam('id');
        const hash = getParam('hash');
        const expires = getParam('expires');
        const signature = getParam('signature');

        if (!id || !hash || !expires || !signature) {
            setStatus('failed');
            setMessage('This link is incomplete. Please request a new one.');
            return;
        }

        authApi
            .verifyEmail(id, hash, { expires, signature })
            .then((response: any) => {
                setStatus('done');
                setMessage(response?.message ?? 'Your email address is verified.');
            })
            .catch((error: any) => {
                setStatus('failed');
                setMessage(error?.message || 'This verification link is no longer valid.');
            });
    }, [searchParams]);

    return (
        <Shell>
            {status === 'working' && (
                <div className="flex flex-col items-center gap-3 py-6">
                    <span
                        aria-hidden="true"
                        className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary"
                    />
                    <p className="text-gray text-sm">{message}</p>
                </div>
            )}

            {status === 'done' && (
                <>
                    <p className="text-gray text-center">{message}</p>
                    <Link
                        href="/"
                        className="bg-primary hover:bg-dark-primary mt-5 block rounded-md px-4 py-3 text-center text-base font-semibold text-white"
                    >
                        Continue shopping
                    </Link>
                </>
            )}

            {status === 'failed' && (
                <>
                    <p className="text-danger text-center">{message}</p>
                    <Link
                        href="/dashboard?section=profile"
                        className="border-primary text-primary mt-5 block rounded-md border px-4 py-3 text-center text-base font-semibold"
                    >
                        Request a new link
                    </Link>
                    <Link
                        href="/login"
                        className="text-gray mt-3 block text-center text-sm hover:underline"
                    >
                        Back to login
                    </Link>
                </>
            )}
        </Shell>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<Shell><p className="text-gray text-center">Loading…</p></Shell>}>
            <VerifyEmailForm />
        </Suspense>
    );
}

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <main className="flex min-h-[70vh] flex-col items-center px-5 py-10">
        <Link href="/" className="mb-6 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/resources/images/logo.png"
                alt="King Queen"
                width={180}
                height={60}
                style={{ borderRadius: 10 }}
            />
        </Link>

        <div className="shadow-custom w-full max-w-lg rounded-xl px-5 py-6">
            <h1 className="mb-4 text-center text-xl font-semibold">Email verification</h1>
            {children}
        </div>
    </main>
);
