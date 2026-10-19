// app/(auth)/reset-password/page.jsx
'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authApi } from '@/lib/api';
import {
    validateEmail,
    validatePhoneNumber,
    normalizePhoneNumber,
} from '@/utils/validators';
import EyeIconMD from '@/components/Icons/EyeIconMD';
import EyeSlashIconMD from '@/components/Icons/EyeSlashIconMD';

const RULES = [
    { key: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
    { key: 'letter', label: 'Contains a letter', test: (value) => /[a-z]/i.test(value) },
    { key: 'case', label: 'Contains uppercase and lowercase letters', test: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { key: 'number', label: 'Contains a number', test: (value) => /\d/.test(value) },
];

function ResetPasswordForm() {
    const searchParams = useSearchParams();

    const getParam = (key) => {
        const val = searchParams?.get(key) || searchParams?.get(`amp;${key}`) || searchParams?.get(`amp%3B${key}`);
        if (val) return val;
        if (typeof window !== 'undefined') {
            const cleanedParams = new URLSearchParams(window.location.search.replace(/&amp;/g, '&'));
            return cleanedParams.get(key) || '';
        }
        return '';
    };

    const [token, setToken] = useState(getParam('token'));
    const [email, setEmail] = useState(getParam('email'));
    const [phoneNumber, setPhoneNumber] = useState(getParam('phone_number'));
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const needsChannel = !email && !phoneNumber;

    const met = useMemo(
        () => RULES.filter((rule) => rule.test(password)).map((rule) => rule.key),
        [password]
    );

    const isPasswordValid = useMemo(
        () => RULES.every((rule) => rule.test(password)),
        [password]
    );

    const passwordsMatch = useMemo(
        () => password.length > 0 && password === confirmation,
        [password, confirmation]
    );

    const submit = async (event) => {
        event.preventDefault();
        setError('');

        if (!token.trim()) {
            setError('Enter the reset code from your email or message.');
            return;
        }

        if (needsChannel) {
            if (!email.trim() && !phoneNumber.trim()) {
                setError('Please provide your email address or mobile number.');
                return;
            }
        }

        if (email.trim() && !validateEmail(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }

        if (phoneNumber.trim() && !validatePhoneNumber(normalizePhoneNumber(phoneNumber.trim()))) {
            setError('Please enter a valid 11-digit mobile number.');
            return;
        }

        if (!isPasswordValid) {
            setError('Password does not meet all the required criteria.');
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
                ...(email.trim()
                    ? { email: email.trim() }
                    : { phone_number: normalizePhoneNumber(phoneNumber.trim()) }),
                password,
                password_confirmation: confirmation,
            });

            toast.success('Your password has been reset.');
            setDone(true);
        } catch (err) {
            const fields = err.errors ?? null;

            if (fields?.token) {
                setError(fields.token[0]);
            } else if (fields?.password) {
                setError(fields.password[0]);
            } else if (fields?.email) {
                setError(fields.email[0]);
            } else if (fields?.phone_number) {
                setError(fields.phone_number[0]);
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
                    className="bg-primary hover:bg-dark-primary mt-5 block rounded-md px-4 py-3 text-center text-base font-semibold text-white transition-colors"
                >
                    Sign in
                </Link>
            </Shell>
        );
    }

    const hasMismatch = confirmation && password !== confirmation;

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
                            onChange={(event) => {
                                setToken(event.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Enter reset code"
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
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="e.g. name@example.com"
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
                                onChange={(event) => {
                                    setPhoneNumber(event.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="e.g. 01712345678"
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
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Create a new password"
                            className="text-dark-ash w-full outline-0"
                            autoComplete="new-password"
                            required
                        />
                        <button
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? <EyeIconMD /> : <EyeSlashIconMD />}
                        </button>
                    </div>

                    <ul className="mt-2 space-y-0.5">
                        {RULES.map((rule) => {
                            const isPassed = met.includes(rule.key);
                            return (
                                <li
                                    key={rule.key}
                                    className={`text-xs flex items-center gap-1.5 transition-colors ${
                                        isPassed ? 'text-success font-medium' : 'text-gray'
                                    }`}
                                >
                                    <span>{isPassed ? '✓' : '•'}</span>
                                    <span>{rule.label}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="flex flex-col">
                    <label className="pb-[3px] font-medium" htmlFor="password_confirmation">
                        Confirm new password<span className="text-danger ml-1">*</span>
                    </label>
                    <div
                        className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                            hasMismatch ? 'border-danger' : 'border-light-ash hover:border-primary'
                        }`}
                    >
                        <input
                            id="password_confirmation"
                            type={showConfirmation ? 'text' : 'password'}
                            value={confirmation}
                            onChange={(event) => {
                                setConfirmation(event.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Re-enter your new password"
                            className="text-dark-ash w-full outline-0"
                            autoComplete="new-password"
                            required
                        />
                        <button
                            type="button"
                            aria-label={
                                showConfirmation
                                    ? 'Hide password confirmation'
                                    : 'Show password confirmation'
                            }
                            onClick={() => setShowConfirmation((prev) => !prev)}
                        >
                            {showConfirmation ? <EyeIconMD /> : <EyeSlashIconMD />}
                        </button>
                    </div>
                    {hasMismatch && (
                        <p className="text-danger mt-1 text-xs">The two passwords do not match.</p>
                    )}
                </div>

                {error && (
                    <p role="alert" className="text-danger text-sm">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting || !token.trim() || !password || !passwordsMatch || !isPasswordValid}
                    className="bg-primary hover:bg-dark-primary rounded-md py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    {submitting ? 'Saving…' : 'Set new password'}
                </button>

                <p className="text-gray text-center text-sm">
                    Did not get a code?{' '}
                    <Link href="/forgot-password" className="text-primary hover:underline font-semibold">
                        Request a new one
                    </Link>
                </p>
            </form>
        </Shell>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<main className="flex min-h-[70vh] items-center justify-center"><p className="text-gray">Loading...</p></main>}>
            <ResetPasswordForm />
        </Suspense>
    );
}

const Shell = ({ title, children }) => (
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
            <h1 className="mb-5 text-center text-xl font-semibold">{title}</h1>
            {children}
        </div>
    </main>
);
