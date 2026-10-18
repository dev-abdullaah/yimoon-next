// app/(auth)/register/page.jsx
'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { deviceName } from '@/utils/deviceName';
import { safeRedirect } from '@/utils/urlHelper';
import {
    validateName,
    sanitizeName,
    validatePhoneNumber,
    sanitizePhoneNumber,
    normalizePhoneNumber,
    validateEmail,
} from '@/utils/validators';
import EyeIconMD from '@/components/Icons/EyeIconMD';
import EyeSlashIconMD from '@/components/Icons/EyeSlashIconMD';

/**
 * Password strength rules mirroring server expectations.
 */
const RULES = [
    { key: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
    { key: 'letter', label: 'Contains a letter', test: (value) => /[a-z]/i.test(value) },
    { key: 'case', label: 'Contains uppercase and lowercase letters', test: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { key: 'number', label: 'Contains a number', test: (value) => /\d/.test(value) },
];

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register, isAuthenticated, loading: authLoading } = useAuth();

    const from = safeRedirect(searchParams?.get('redirect') ?? searchParams?.get('from'), '/dashboard');

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone_number: '',
        password: '',
        password_confirmation: '',
    });
    const [touched, setTouched] = useState({
        name: false,
        email: false,
        phone_number: false,
        password: false,
        password_confirmation: false,
    });
    const [errors, setErrors] = useState({});
    const [show, setShow] = useState({ password: false, password_confirmation: false });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace(from);
        }
    }, [authLoading, isAuthenticated, from, router]);

    const met = useMemo(
        () => RULES.filter((rule) => rule.test(form.password)).map((rule) => rule.key),
        [form.password]
    );

    const isPasswordValid = useMemo(
        () => RULES.every((rule) => rule.test(form.password)),
        [form.password]
    );

    const passwordsMatch = useMemo(
        () => form.password.length > 0 && form.password === form.password_confirmation,
        [form.password, form.password_confirmation]
    );

    const isFormValid = useMemo(() => {
        return (
            validateName(form.name) &&
            validateEmail(form.email) &&
            validatePhoneNumber(form.phone_number) &&
            isPasswordValid &&
            passwordsMatch
        );
    }, [form.name, form.email, form.phone_number, isPasswordValid, passwordsMatch]);

    const handleBlur = (field) => () => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setErrors({});

        // Mark all fields touched on submit
        setTouched({
            name: true,
            email: true,
            phone_number: true,
            password: true,
            password_confirmation: true,
        });

        if (!validateName(form.name)) {
            setErrors({ name: 'Name must be at least 2 characters' });
            return;
        }

        if (!validateEmail(form.email)) {
            setErrors({ email: 'Please enter a valid email address (e.g. name@example.com)' });
            return;
        }

        if (!validatePhoneNumber(form.phone_number)) {
            setErrors({ phone_number: 'Please enter a valid 11-digit mobile number (e.g. 01712345678)' });
            return;
        }

        if (!isPasswordValid) {
            setErrors({ password: 'Password does not meet all the required criteria.' });
            return;
        }

        if (form.password !== form.password_confirmation) {
            setErrors({ password_confirmation: 'The two passwords do not match.' });
            return;
        }

        setSubmitting(true);

        try {
            await register({
                name: form.name.trim(),
                email: form.email.trim(),
                phone_number: normalizePhoneNumber(form.phone_number.trim()),
                password: form.password,
                password_confirmation: form.password_confirmation,
                device_name: deviceName(),
            });

            toast.success('Welcome to Yi Moon — your account is ready.');

            window.location.href = from;
        } catch (err) {
            if (err.errors) {
                setErrors({
                    name: err.errors.name?.[0],
                    email: err.errors.email?.[0],
                    phone_number: err.errors.phone_number?.[0],
                    password: err.errors.password?.[0],
                    password_confirmation: err.errors.password_confirmation?.[0],
                });
            }

            toast.error(err.message || 'Could not create your account');
        } finally {
            setSubmitting(false);
        }
    };

    const nameError = errors.name || (touched.name && form.name && !validateName(form.name) ? 'Name must be at least 2 characters' : null);
    const emailError = errors.email || (touched.email && form.email && !validateEmail(form.email) ? 'Please enter a valid email address (e.g. name@example.com)' : null);
    const phoneError = errors.phone_number || (touched.phone_number && form.phone_number && !validatePhoneNumber(form.phone_number) ? 'Please enter a valid 11-digit mobile number (e.g. 01712345678)' : null);
    const passwordConfirmError = errors.password_confirmation || (touched.password_confirmation && form.password_confirmation && form.password !== form.password_confirmation ? 'The two passwords do not match.' : null);

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
                        href={`/login${from !== '/' ? `?redirect=${encodeURIComponent(from)}` : ''}`}
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
                    {/* Full Name */}
                    <div className="flex flex-col">
                        <label className="pb-[3px] font-medium" htmlFor="name">
                            Full name<span className="text-danger ml-1">*</span>
                        </label>
                        <div
                            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                                nameError ? 'border-danger' : 'border-light-ash hover:border-primary'
                            }`}
                        >
                            <input
                                id="name"
                                type="text"
                                value={form.name}
                                onChange={(e) => {
                                    const value = sanitizeName(e.target.value);
                                    setForm((prev) => ({ ...prev, name: value }));
                                    setErrors((prev) => (prev.name ? { ...prev, name: null } : prev));
                                }}
                                onBlur={handleBlur('name')}
                                placeholder="Recipient's Name"
                                className="text-dark-ash w-full outline-0"
                                autoComplete="name"
                                minLength={2}
                                maxLength={50}
                                required
                            />
                        </div>
                        {nameError && (
                            <p className="text-danger mt-1 text-xs">{nameError}</p>
                        )}
                    </div>

                    {/* Email address */}
                    <div className="flex flex-col">
                        <label className="pb-[3px] font-medium" htmlFor="email">
                            Email address<span className="text-danger ml-1">*</span>
                        </label>
                        <div
                            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                                emailError ? 'border-danger' : 'border-light-ash hover:border-primary'
                            }`}
                        >
                            <input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => {
                                    const value = e.target.value.trim();
                                    setForm((prev) => ({ ...prev, email: value }));
                                    setErrors((prev) => (prev.email ? { ...prev, email: null } : prev));
                                }}
                                onBlur={handleBlur('email')}
                                placeholder="e.g. name@example.com"
                                className="text-dark-ash w-full outline-0"
                                autoComplete="email"
                                required
                            />
                        </div>
                        {emailError && (
                            <p className="text-danger mt-1 text-xs">{emailError}</p>
                        )}
                    </div>

                    {/* Mobile number */}
                    <div className="flex flex-col">
                        <label className="pb-[3px] font-medium" htmlFor="phone_number">
                            Mobile number<span className="text-danger ml-1">*</span>
                        </label>
                        <div
                            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                                phoneError ? 'border-danger' : 'border-light-ash hover:border-primary'
                            }`}
                        >
                            <input
                                id="phone_number"
                                type="tel"
                                value={form.phone_number}
                                onChange={(e) => {
                                    const value = sanitizePhoneNumber(e.target.value);
                                    setForm((prev) => ({ ...prev, phone_number: value }));
                                    setErrors((prev) => (prev.phone_number ? { ...prev, phone_number: null } : prev));
                                }}
                                onBlur={handleBlur('phone_number')}
                                placeholder="e.g. 01712345678"
                                className="text-dark-ash w-full outline-0"
                                autoComplete="tel"
                                maxLength={11}
                                required
                            />
                        </div>
                        {phoneError ? (
                            <p className="text-danger mt-1 text-xs">{phoneError}</p>
                        ) : (
                            <p className="text-gray mt-1 text-xs">A Bangladeshi mobile number, e.g. 01712345678</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="pb-[3px] font-medium" htmlFor="password">
                            Password<span className="text-danger ml-1">*</span>
                        </label>
                        <div
                            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                                errors.password ? 'border-danger' : 'border-light-ash hover:border-primary'
                            }`}
                        >
                            <input
                                id="password"
                                type={show.password ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) => {
                                    setForm((prev) => ({ ...prev, password: e.target.value }));
                                    setErrors((prev) => (prev.password ? { ...prev, password: null } : prev));
                                }}
                                onBlur={handleBlur('password')}
                                placeholder="Create a strong password"
                                className="text-dark-ash w-full outline-0"
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                aria-label={show.password ? 'Hide password' : 'Show password'}
                                onClick={() => setShow((prev) => ({ ...prev, password: !prev.password }))}
                            >
                                {show.password ? <EyeIconMD /> : <EyeSlashIconMD />}
                            </button>
                        </div>
                        {errors.password && <p className="text-danger mt-1 text-xs">{errors.password}</p>}

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

                    {/* Confirm password */}
                    <div>
                        <label className="pb-[3px] font-medium" htmlFor="password_confirmation">
                            Confirm password<span className="text-danger ml-1">*</span>
                        </label>
                        <div
                            className={`flex gap-4 rounded-md border bg-white px-2.5 py-1.5 transition-colors ${
                                passwordConfirmError ? 'border-danger' : 'border-light-ash hover:border-primary'
                            }`}
                        >
                            <input
                                id="password_confirmation"
                                type={show.password_confirmation ? 'text' : 'password'}
                                value={form.password_confirmation}
                                onChange={(e) => {
                                    setForm((prev) => ({ ...prev, password_confirmation: e.target.value }));
                                    setErrors((prev) =>
                                        prev.password_confirmation ? { ...prev, password_confirmation: null } : prev
                                    );
                                }}
                                onBlur={handleBlur('password_confirmation')}
                                placeholder="Re-enter your password"
                                className="text-dark-ash w-full outline-0"
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                aria-label={
                                    show.password_confirmation
                                        ? 'Hide password confirmation'
                                        : 'Show password confirmation'
                                }
                                onClick={() =>
                                    setShow((prev) => ({
                                        ...prev,
                                        password_confirmation: !prev.password_confirmation,
                                    }))
                                }
                            >
                                {show.password_confirmation ? <EyeIconMD /> : <EyeSlashIconMD />}
                            </button>
                        </div>
                        {passwordConfirmError && (
                            <p className="text-danger mt-1 text-xs">{passwordConfirmError}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || !isFormValid}
                        className="bg-primary hover:bg-dark-primary rounded-md py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {submitting ? 'Creating your account…' : 'Create account'}
                    </button>

                    <p className="text-gray text-center text-sm">
                        Already have an account?{' '}
                        <Link
                            href={`/login${from !== '/' ? `?redirect=${encodeURIComponent(from)}` : ''}`}
                            className="text-primary hover:underline font-semibold"
                        >
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<main className="flex min-h-[70vh] items-center justify-center"><p className="text-gray">Loading...</p></main>}>
            <RegisterForm />
        </Suspense>
    );
}
