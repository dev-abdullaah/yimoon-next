// app/(auth)/reset-password/page.jsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import EyeIconMD from '@/components/Icons/EyeIconMD';
import EyeSlashIconMD from '@/components/Icons/EyeSlashIconMD';

/**
 * Set a new password from a reset link.
 *
 * The token and the address it belongs to arrive in the query string, which is
 * how Laravel builds the emailed link and how the SMS code is entered by hand.
 * The address is therefore sometimes absent — a code the shopper typed in has
 * no link behind it — so it is an editable field rather than a hidden value.
 *
 * Both are sent with the request and never stored client-side. A reset token is
 * a one-shot bearer secret for the account; keeping it anywhere longer than the
 * submission would leave a working credential in storage.
 *
 * Resetting revokes every existing token on the server side, so any other signed
 * in device is signed out. That is why the shopper is sent back to the login form
 * rather than straight into their account — the session they would be given here
 * no longer exists.
 */

const RULES = [
    { key: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
    { key: 'letter', label: 'Contains a letter', test: (value) => /[a-z]/i.test(value) },
    { key: 'case', label: 'Contains a capital letter', test: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { key: 'number', label: 'Contains a number', test: (value) => /\d/.test(value) },
];

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();

    const [token, setToken] = useState(searchParams.get('token') ?? '');
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [phoneNumber, setPhoneNumber] = useState(searchParams.get('phone_number') ?? '');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // A link is email-only and always carries the address; a code is typed in by
    // hand, so the channel has to be asked for.
    const needsChannel = !email && !phoneNumber;

    const met = useMemo(
        () => RULES.filter((rule) => rule.test(password)).map((rule) => rule.key),
        [password]
    );

    const submit = async (event) => {
        event.preventDefault();
        setError('');

        if (!token.trim()) {
            setError('Enter the reset code from your email or message.');
            return;
        }

        if (password !== confirmation) {
            setError('The two passwords do not match.');
            return;
        }

        setSubmitting(true);

        try {
            await authApi.resetPassword({
                token: token.trim(),
                ...(email.trim() ? { email: email.trim() } : { phone_number: phoneNumber.trim() }),
                password,
                password_confirmation: confirmation,
            });

            setDone(true);
        } catch (err) {
            const fields = err.errors ?? null;

            if (fields?.token) {
                // Shown as the API words it. It is deliberately the same message
                // for an expired token, an already-used one and an address with no
                // account, so appending "and try again" here would either
                // duplicate the sentence or over-promise what a re-request can
                // fix.
                setError(fields.token[0]);
            } else if (fields?.password) {
                // Password rules are specific and actionable, and they are not
                // about the account's existence, so they are safe to show in full.
                setError(fields.password[0]);
            } else {
                setError(err.message || 'Could not reset your password.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        return (
            <Shell title="Password changed">
                <p className="text-gray text-center">
                    Your password has been reset. For your security, every device that was signed in
                    has been signed out.
                </p>
                <Link
                    href="/login"
                    className="bg-primary hover:bg-dark-primary mt-5 block rounded-md px-4 py-3 text-center text-base font-semibold text-white"
                >
                    Sign in
                </Link>
            </Shell>
        );
    }

    return (
        <Shell title="Choose a new password">
            <form onSubmit={submit} className="flex flex-col gap-5 text-[15px]">
                <div className="flex flex-col">
                    <label className="pb-[3px] font-medium" htmlFor="token">
                        Reset code<span className="text-danger ml-1">*</span>
                    </label>
                    <div className="border-light-ash hover:border-primary rounded-md border bg-white px-2.5 py-1.5">
                        <input
                            id="token"
                            type="text"
                            value={token}
                            onChange={(event) => setToken(event.target.value)}
                            className="text-dark-ash w-full outline-0"
                            required
                        />
                    </div>
                </div>

                {needsChannel && (
                    <>
                        <div className="flex flex-col">
                            <label className="pb-[3px] font-medium" htmlFor="email">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="border-light-ash hover:border-primary text-dark-ash w-full rounded-md border bg-white px-2.5 py-1.5 outline-0"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="pb-[3px] font-medium" htmlFor="phone_number">
                                …or mobile number
                            </label>
                            <input
                                id="phone_number"
                                type="tel"
                                value={phoneNumber}
                                onChange={(event) => setPhoneNumber(event.target.value)}
                                className="border-light-ash hover:border-primary text-dark-ash w-full rounded-md border bg-white px-2.5 py-1.5 outline-0"
                            />
                        </div>
                    </>
                )}

                <div className="flex flex-col">
                    <label className="pb-[3px] font-medium" htmlFor="password">
                        New password<span className="text-danger ml-1">*</span>
                    </label>
                    <div className="border-light-ash hover:border-primary flex gap-4 rounded-md border bg-white px-2.5 py-1.5">
                        <input
                            id="password"
                            type={show ? 'text' : 'password'}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="text-dark-ash w-full outline-0"
                            autoComplete="new-password"
                            required
                        />
                        <button
                            type="button"
                            aria-label={show ? 'Hide password' : 'Show password'}
                            onClick={() => setShow((shown) => !shown)}
                        >
                            {show ? <EyeIconMD /> : <EyeSlashIconMD />}
                        </button>
                    </div>

                    <ul className="mt-2 space-y-0.5">
                        {RULES.map((rule) => (
                            <li
                                key={rule.key}
                                className={`text-xs ${met.includes(rule.key) ? 'text-success' : 'text-gray'}`}
                            >
                                {rule.label}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col">
                    <label className="pb-[3px] font-medium" htmlFor="password_confirmation">
                        Confirm new password<span className="text-danger ml-1">*</span>
                    </label>
                    <input
                        id="password_confirmation"
                        type={show ? 'text' : 'password'}
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        className="border-light-ash hover:border-primary text-dark-ash w-full rounded-md border bg-white px-2.5 py-1.5 outline-0"
                        autoComplete="new-password"
                        required
                    />
                </div>

                {error && (
                    <p role="alert" className="text-danger text-sm">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-dark-primary rounded-md py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    {submitting ? 'Saving…' : 'Set new password'}
                </button>

                <p className="text-gray text-center text-sm">
                    Did not get a code?{' '}
                    <Link href="/forgot-password" className="text-primary hover:underline">
                        Request a new one
                    </Link>
                </p>
            </form>
        </Shell>
    );
}

const Shell = ({ title, children }) => (
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
            <h1 className="mb-5 text-center text-xl font-semibold">{title}</h1>
            {children}
        </div>
    </main>
);
