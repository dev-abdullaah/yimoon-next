// app/(auth)/forgot-password/page.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { authApi } from '@/lib/api';
import {
    validateEmail,
    validatePhoneNumber,
    normalizePhoneNumber,
} from '@/utils/validators';
import EmailIconSM from '@/components/Icons/EmailIconSM';
import PhoneCallIconSM from '@/components/Icons/PhoneCallIconSM';

/**
 * Ask for a password reset link.
 *
 * One box takes either an email address or a mobile number, and which of the two
 * it was is decided by the shape of what was typed.
 */
export default function ForgotPasswordPage() {
    const [contact, setContact] = useState('');
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const trimmedContact = contact.trim();
    const isEmail = trimmedContact.includes('@');

    const submit = async (event) => {
        event.preventDefault();
        setError('');

        if (!trimmedContact) {
            setError('Enter your email address or mobile number.');
            return;
        }

        let payload = {};

        if (isEmail) {
            if (!validateEmail(trimmedContact)) {
                setError('Please enter a valid email address.');
                return;
            }
            payload = { email: trimmedContact };
        } else {
            const cleanPhone = normalizePhoneNumber(trimmedContact);
            if (!validatePhoneNumber(cleanPhone)) {
                setError('Please enter a valid 11-digit mobile number (e.g. 01712345678).');
                return;
            }
            payload = { phone_number: cleanPhone };
        }

        setSubmitting(true);

        try {
            await authApi.forgotPassword(payload);
            toast.success('Reset instruction sent.');
            setSent(true);
        } catch (err) {
            if (err.status === 422 || err.errors) {
                setError(err.errors?.email?.[0] || err.errors?.phone_number?.[0] || err.message || 'That does not look like a valid address.');
            } else {
                setError(err.message || 'Could not send a reset link. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const hasError = Boolean(error);

    if (sent) {
        return (
            <Shell>
                <div className="p-4 text-center">
                    <h2 className="mb-2 text-xl font-semibold">Check your messages</h2>
                    <p className="text-gray">
                        If an account exists for that {isEmail ? 'email address' : 'mobile number'}, a
                        reset {isEmail ? 'link' : 'code'} is on its way. It expires shortly, so use it
                        soon.
                    </p>
                    <Link
                        href="/login"
                        className="bg-primary hover:bg-dark-primary mt-4 inline-block rounded-md px-4 py-2 text-base font-semibold text-white transition-colors"
                    >
                        Back to login
                    </Link>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <form onSubmit={submit} className="mx-auto flex flex-col gap-5 text-[15px]">
                <div className="flex flex-col">
                    <label className="pb-[3px] font-medium" htmlFor="contact">
                        Email address or mobile number<span className="text-danger ml-1">*</span>
                    </label>
                    <div
                        className={`flex items-center gap-3 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                            hasError ? 'border-danger' : 'border-light-ash hover:border-primary'
                        }`}
                    >
                        {isEmail ? <EmailIconSM /> : <PhoneCallIconSM />}
                        <input
                            id="contact"
                            type="text"
                            value={contact}
                            onChange={(event) => {
                                setContact(event.target.value);
                                if (error) setError('');
                            }}
                            placeholder="e.g. 01712345678 or name@example.com"
                            className="text-dark-ash w-full outline-0"
                            autoComplete="username"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <p role="alert" className="text-danger text-sm">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting || !trimmedContact}
                    className="bg-primary hover:bg-dark-primary rounded-md py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    {submitting ? 'Sending…' : 'Send reset link'}
                </button>

                <p className="text-gray text-center text-sm">
                    Remembered it?{' '}
                    <Link href="/login" className="text-primary hover:underline font-semibold">
                        Sign in
                    </Link>
                </p>
            </form>
        </Shell>
    );
}

const Shell = ({ children }) => (
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
            <h1 className="mb-1 text-center text-xl font-semibold">Reset your password</h1>
            <p className="text-gray mb-5 text-center text-sm">
                Tell us how to reach you and we will send a way back in.
            </p>
            {children}
        </div>
    </main>
);
