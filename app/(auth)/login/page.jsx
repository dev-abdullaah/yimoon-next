// app/(auth)/login/page.jsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { safeRedirect } from '@/utils/urlHelper';
import { deviceName } from '@/utils/deviceName';
import {
    validateEmail,
    validatePhoneNumber,
    normalizePhoneNumber,
} from '@/utils/validators';
import EyeIconMD from '@/components/Icons/EyeIconMD';
import EyeSlashIconMD from '@/components/Icons/EyeSlashIconMD';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isAuthenticated, loading: authLoading } = useAuth();

    const [login_, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [unverifiedLogin, setUnverifiedLogin] = useState('');
    const [resending, setResending] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const from = safeRedirect(searchParams?.get('redirect') ?? searchParams?.get('from'), '/dashboard');

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace(from);
        }
    }, [authLoading, isAuthenticated, from, router]);

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setUnverifiedLogin('');

        const rawLogin = login_.trim();

        if (!rawLogin || !password) {
            setError('Enter your email address or phone number, and your password.');
            return;
        }

        let cleanLogin = rawLogin;
        if (rawLogin.includes('@')) {
            if (!validateEmail(rawLogin)) {
                setError('Please enter a valid email address.');
                return;
            }
        } else {
            cleanLogin = normalizePhoneNumber(rawLogin);
            if (!validatePhoneNumber(cleanLogin)) {
                setError('Please enter a valid 11-digit mobile number (e.g. 01712345678) or email address.');
                return;
            }
        }

        setSubmitting(true);

        try {
            await login({
                login: cleanLogin,
                password,
                device_name: deviceName(),
            });

            toast.success('Signed in successfully.');

            window.location.href = from;
        } catch (err) {
            if (err.errors?.email_not_verified) {
                setError('Please verify your email address before signing in. Check your inbox for the link.');
                setUnverifiedLogin(cleanLogin);
            } else if (err.errors?.login) {
                setError(err.errors.login[0]);
            } else {
                setError(err.message || 'Could not sign you in. Please check your credentials and try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        if (!unverifiedLogin) return;
        setResending(true);
        try {
            await authApi.resendVerification(unverifiedLogin);
            toast.success('Verification link sent! Check your email or laravel.log.');
        } catch (err) {
            toast.error(err.message || 'Could not resend verification email.');
        } finally {
            setResending(false);
        }
    };

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else if (from && from !== '/dashboard') {
            router.push(from);
        } else {
            router.push('/');
        }
    };

    const hasError = Boolean(error);

    return (
        <main className="flex min-h-[70vh] flex-col items-center px-5 py-10">
            <div className="w-full max-w-lg mb-6 relative flex items-center justify-center">
                <button
                    type="button"
                    onClick={handleBack}
                    className="auth-back-btn inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-white shadow-custom hover:shadow-md text-dark hover:text-primary font-semibold text-xs sm:text-sm transition-all cursor-pointer z-10"
                >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-dark-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Go Back</span>
                </button>

                <Link href="/" className="flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/resources/images/logo.png"
                        alt="King Queen"
                        className="auth-logo"
                    />
                </Link>
            </div>

            <div className="shadow-custom w-full max-w-lg rounded-xl px-5 py-6">
                <div className="flex justify-center gap-3 sm:gap-7">
                    <span className="bg-primary min-h-[40px] w-full max-w-[120px] rounded-md px-3 py-2 text-center text-xl font-semibold text-white md:max-w-[180px] md:min-h-[48px] md:text-2xl">
                        Login
                    </span>
                    <Link
                        href={`/register${from !== '/' ? `?redirect=${encodeURIComponent(from)}` : ''}`}
                        className="border-dark-ash text-dark-ash min-h-[40px] w-full max-w-[120px] rounded-md border-2 px-3 py-1 text-center text-xl font-semibold md:max-w-[180px] md:min-h-[48px] md:text-2xl"
                    >
                        Register
                    </Link>
                </div>

                <hr className="border-primary my-5 border-t" />

                <form onSubmit={submit} className="mx-auto flex flex-col gap-5 text-[15px]">
                    <div className="flex flex-col">
                        <label className="pb-[3px] font-medium" htmlFor="login">
                            E-mail / Phone number<span className="text-danger ml-1">*</span>
                        </label>
                        <div
                            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                                hasError ? 'border-danger' : 'border-light-ash hover:border-primary'
                            }`}
                        >
                            <input
                                id="login"
                                placeholder="e.g. 01712345678 or name@example.com"
                                className="text-dark-ash w-full outline-0"
                                type="text"
                                value={login_}
                                onChange={(event) => {
                                    setLogin(event.target.value);
                                    if (error) setError('');
                                    if (unverifiedLogin) setUnverifiedLogin('');
                                }}
                                disabled={submitting}
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="pb-[3px] font-medium" htmlFor="password">
                            Password<span className="text-danger ml-1">*</span>
                        </label>
                        <div
                            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                                hasError ? 'border-danger' : 'border-light-ash hover:border-primary'
                            }`}
                        >
                            <input
                                id="password"
                                placeholder="Enter your password"
                                className="text-dark-ash w-full outline-0"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    if (error) setError('');
                                }}
                                disabled={submitting}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                type="button"
                                onClick={() => setShowPassword((shown) => !shown)}
                                disabled={submitting}
                            >
                                {showPassword ? <EyeIconMD /> : <EyeSlashIconMD />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Link
                            href="/forgot-password"
                            className="text-danger hover:text-primary text-sm font-semibold"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {error && (
                        <div className="flex flex-col gap-1.5">
                            <p role="alert" className="text-danger text-sm">
                                {error}
                            </p>
                            {unverifiedLogin && (
                                <div>
                                    <button
                                        type="button"
                                        disabled={resending}
                                        onClick={handleResendVerification}
                                        className="text-primary hover:underline text-xs font-semibold inline-flex items-center gap-1"
                                    >
                                        {resending ? 'Sending verification link…' : '↻ Resend verification link'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !login_.trim() || !password}
                        className="bg-primary hover:bg-dark-primary rounded-md py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<main className="flex min-h-[70vh] items-center justify-center"><p className="text-gray">Loading...</p></main>}>
            <LoginForm />
        </Suspense>
    );
}
