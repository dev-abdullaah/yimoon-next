// app/(auth)/login/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { safeRedirect } from '@/utils/urlHelper';
import { deviceName } from '@/utils/deviceName';
import EyeIcon from '@/components/Icons/EyeIcon';
import EyeSlashIcon from '@/components/Icons/EyeSlashIcon';

/**
 * Sign in.
 *
 * One field takes either the email address or the mobile number, and the API
 * decides which by looking at what was typed. Mirroring that on the client too
 * would only duplicate the rule, and the two would drift — the API accepts any
 * bounded string and reports the mismatch itself, so the only check worth doing
 * here is that the field is not empty.
 *
 * Passwords are never checked, hashed or compared in the browser. The API does
 * the one comparison that matters, against a real hash, in constant time, and
 * rate-limited on the submitted login.
 */

/**
 * Where to go after signing in.
 *
 * Read from the query string and filtered by `safeRedirect`, so a link cannot
 * use the sign-in form to bounce a shopper off the site carrying their new
 * session.
 */
export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isAuthenticated, loading: authLoading } = useAuth();

    const [login_, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const from = safeRedirect(searchParams.get('redirect') ?? searchParams.get('from'));


    // Someone who is already signed in has no business on this form. Sent on
    // rather than hidden, so a stale tab left open from an earlier session does
    // not sit there offering to sign in again on top of a live one.
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace(from);
        }
    }, [authLoading, isAuthenticated, from, router]);

    const submit = async (event) => {
        event.preventDefault();
        setError('');

        if (!login_.trim() || !password) {
            setError('Enter your email address or phone number, and your password.');
            return;
        }

        setSubmitting(true);

        try {
            await login({
                login: login_.trim(),
                password,
                // Named after the actual device, so the account's device list can
                // tell this one from the others. A constant would make every row
                // identical and the list useless for its one job.
                device_name: deviceName(),
            });

            // A full navigation rather than a client-side push: the session
            // lives in localStorage, and the pages ahead of this one read it
            // during their first render.
            window.location.href = from;
        } catch (err) {
            // The API distinguishes an unverified address from a wrong
            // password, and the two need different things from the shopper, so
            // the flag on the error is read rather than the message alone.
            if (err.errors?.email_not_verified) {
                setError('Please verify your email address before signing in. Check your inbox for the link.');
            } else if (err.errors?.login) {
                setError(err.errors.login[0]);
            } else {
                setError(err.message || 'Could not sign you in. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-[70vh] flex-col items-center px-5 py-10">
            <Link href="/" className="mb-6 flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/resources/images/logo.png"
                    alt="Yi Moon"
                    width={180}
                    height={60}
                    style={{ borderRadius: 10 }}
                />
            </Link>

            <div className="shadow-custom w-full max-w-lg rounded-xl px-5 py-6">
                <div className="flex justify-center gap-3 sm:gap-7">
                    <span className="bg-primary min-h-[40px] w-full max-w-[120px] rounded-md px-3 py-2 text-center text-xl font-semibold text-white md:max-w-[180px] md:min-h-[48px] md:text-2xl">
                        Login
                    </span>
                    <Link
                        href="/register"
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
                        <div className="border-light-ash hover:border-primary flex gap-4 rounded-md border bg-white px-2.5 py-1.5">
                            <input
                                id="login"
                                placeholder="Enter your email address or phone number"
                                className="text-dark-ash w-full outline-0"
                                type="text"
                                value={login_}
                                onChange={(event) => setLogin(event.target.value)}
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
                        <div className="border-light-ash hover:border-primary flex gap-4 rounded-md border bg-white px-2.5 py-1.5">
                            <input
                                id="password"
                                placeholder="Enter your password"
                                className="text-dark-ash w-full outline-0"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
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
                                {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
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
                        <p role="alert" className="text-danger text-sm">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-primary hover:bg-dark-primary rounded-md py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </main>
    );
}
