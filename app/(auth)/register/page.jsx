// app/(auth)/register/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { deviceName } from '@/utils/deviceName';
import EyeIcon from '@/components/Icons/EyeIcon';
import EyeSlashIcon from '@/components/Icons/EyeSlashIcon';

/**
 * Create an account.
 *
 * One page rather than the previous two-step "check your details, then finish"
 * flow. That first step asked a separate endpoint whether the email or number
 * was already taken, and there is no such endpoint here — uniqueness is only
 * knowable by attempting the registration. Splitting the form would have meant a
 * step that could pass and then still be refused, so the check happens where it
 * can: on the field, after the real attempt.
 *
 * The password rules are shown live rather than only on submit. They mirror the
 * API's — at least eight characters with a letter, a capital and a digit — so a
 * shopper is not told the requirements only after the server rejects them.
 * Nothing is enforced here beyond "these boxes are filled": the server decides
 * what an acceptable password is.
 */

const RULES = [
    { key: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
    { key: 'letter', label: 'Contains a letter', test: (value) => /[a-z]/i.test(value) },
    { key: 'case', label: 'Contains a capital letter', test: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { key: 'number', label: 'Contains a number', test: (value) => /\d/.test(value) },
];

export default function RegisterPage() {
    const router = useRouter();
    const { register, isAuthenticated, loading: authLoading } = useAuth();

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone_number: '',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [show, setShow] = useState({ password: false, password_confirmation: false });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace('/');
        }
    }, [authLoading, isAuthenticated, router]);

    const met = useMemo(
        () => RULES.filter((rule) => rule.test(form.password)).map((rule) => rule.key),
        [form.password]
    );

    const update = (key) => (event) => {
        setForm((prev) => ({ ...prev, [key]: event.target.value }));
        // Clearing on edit means a uniqueness error does not sit next to a box
        // the shopper has already corrected.
        setErrors((prev) => (prev[key] ? { ...prev, [key]: null } : prev));
    };

    const submit = async (event) => {
        event.preventDefault();
        setErrors({});

        if (form.password !== form.password_confirmation) {
            setErrors({ password_confirmation: 'The two passwords do not match.' });
            return;
        }

        setSubmitting(true);

        try {
            await register({
                name: form.name.trim(),
                email: form.email.trim(),
                phone_number: form.phone_number.trim(),
                password: form.password,
                password_confirmation: form.password_confirmation,
                // The first session on the account is created here, so it gets
                // the same device label a login would — otherwise the shopper's
                // own device is the one row in their device list they cannot
                // identify.
                device_name: deviceName(),
            });

            toast.success('Welcome to Yi Moon — your account is ready.');

            // A full navigation, because the session was just written to
            // localStorage and the page ahead reads it on its first render.
            window.location.href = '/';
        } catch (err) {
            // Per-field messages are put back on the boxes they belong to, so
            // "an account already exists with this email address" appears beside
            // the email field rather than as a banner the shopper has to match up
            // themselves.
            if (err.errors) {
                setErrors({
                    name: err.errors.name?.[0],
                    email: err.errors.email?.[0],
                    phone_number: err.errors.phone_number?.[0],
                    password: err.errors.password?.[0],
                });
            }

            toast.error(err.message || 'Could not create your account');
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
                    <Link
                        href="/login"
                        className="border-dark-ash text-dark-ash min-h-[40px] w-full max-w-[120px] rounded-md border-2 px-3 py-1 text-center text-xl font-semibold md:max-w-[180px] md:min-h-[48px] md:text-2xl"
                    >
                        Login
                    </Link>
                    <span className="bg-primary min-h-[40px] w-full max-w-[120px] rounded-md px-3 py-2 text-center text-xl font-semibold text-white md:max-w-[180px] md:min-h-[48px] md:text-2xl">
                        Register
                    </span>
                </div>

                <hr className="border-primary my-5 border-t" />

                <form onSubmit={submit} className="mx-auto flex flex-col gap-5 text-[15px]">
                    <Field
                        id="name"
                        label="Full name"
                        value={form.name}
                        onChange={update('name')}
                        error={errors.name}
                        autoComplete="name"
                    />

                    <Field
                        id="email"
                        label="Email address"
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        error={errors.email}
                        autoComplete="email"
                    />

                    <Field
                        id="phone_number"
                        label="Mobile number"
                        type="tel"
                        value={form.phone_number}
                        onChange={update('phone_number')}
                        error={errors.phone_number}
                        hint="A Bangladeshi mobile number, e.g. 01712345678"
                        autoComplete="tel"
                    />

                    <div>
                        <label className="pb-[3px] font-medium" htmlFor="password">
                            Password<span className="text-danger ml-1">*</span>
                        </label>
                        <PasswordInput
                            id="password"
                            value={form.password}
                            onChange={update('password')}
                            autoComplete="new-password"
                            shown={show.password}
                            onToggle={() => setShow((prev) => ({ ...prev, password: !prev.password }))}
                        />
                        {errors.password && <p className="text-danger mt-1 text-sm">{errors.password}</p>}

                        <ul className="mt-2 space-y-0.5">
                            {RULES.map((rule) => (
                                <li
                                    key={rule.key}
                                    className={`text-xs ${
                                        met.includes(rule.key) ? 'text-success' : 'text-gray'
                                    }`}
                                >
                                    {rule.label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <label className="pb-[3px] font-medium" htmlFor="password_confirmation">
                            Confirm password<span className="text-danger ml-1">*</span>
                        </label>
                        <PasswordInput
                            id="password_confirmation"
                            value={form.password_confirmation}
                            onChange={update('password_confirmation')}
                            autoComplete="new-password"
                            shown={show.password_confirmation}
                            onToggle={() =>
                                setShow((prev) => ({ ...prev, password_confirmation: !prev.password_confirmation }))
                            }
                        />
                        {errors.password_confirmation && (
                            <p className="text-danger mt-1 text-sm">{errors.password_confirmation}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-primary hover:bg-dark-primary rounded-md py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {submitting ? 'Creating your account…' : 'Create account'}
                    </button>

                    <p className="text-gray text-center text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}

const Field = ({ id, label, value, onChange, error, hint, type = 'text', autoComplete }) => (
    <div className="flex flex-col">
        <label className="pb-[3px] font-medium" htmlFor={id}>
            {label}<span className="text-danger ml-1">*</span>
        </label>
        <div
            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 ${
                error ? 'border-danger' : 'border-light-ash hover:border-primary'
            }`}
        >
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                className="text-dark-ash w-full outline-0"
                autoComplete={autoComplete}
                required
                aria-invalid={error ? 'true' : undefined}
            />
        </div>
        {error ? (
            <p className="text-danger mt-1 text-sm">{error}</p>
        ) : hint ? (
            <p className="text-gray mt-1 text-xs">{hint}</p>
        ) : null}
    </div>
);

const PasswordInput = ({ id, value, onChange, shown, onToggle, autoComplete }) => (
    <div className="border-light-ash hover:border-primary flex gap-4 rounded-md border bg-white px-2.5 py-1.5">
        <input
            id={id}
            type={shown ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            className="text-dark-ash w-full outline-0"
            autoComplete={autoComplete}
            required
        />
        <button
            type="button"
            aria-label={shown ? `Hide ${id.replace('_', ' ')}` : `Show ${id.replace('_', ' ')}`}
            onClick={onToggle}
        >
            {shown ? <EyeIcon /> : <EyeSlashIcon />}
        </button>
    </div>
);
