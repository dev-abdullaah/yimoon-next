// components/dashboard/ProfileSection.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
    validateName,
    sanitizeName,
    validatePhoneNumber,
    sanitizePhoneNumber,
    normalizePhoneNumber,
    validateAddress,
    sanitizeAddress,
    validateEmail,
} from '@/utils/validators';

interface ProfileFormData {
    name: string;
    phone_number: string;
    address: string;
    email: string;
}

interface PasswordFormData {
    current_password: string;
    password: string;
    password_confirmation: string;
}

/**
 * The shopper's own details (name, phone number, address, email), and the form for changing them.
 *
 * Edits are validated client-side and saved through the API so that what the
 * header and the checkout page auto-populate comes directly from the server's copy.
 */
export default function ProfileSection() {
    const { user, applyUser } = useAuth();
    const queryClient = useQueryClient();

    const [form, setForm] = useState<ProfileFormData>({
        name: '',
        phone_number: '',
        address: '',
        email: '',
    });
    const [touched, setTouched] = useState<Record<keyof ProfileFormData, boolean>>({
        name: false,
        phone_number: false,
        address: false,
        email: false,
    });
    const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [profileErrors, setProfileErrors] = useState<Record<string, string[] | null>>({});
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string[] | null>>({});

    // Seed from the signed-in shopper
    useEffect(() => {
        if (!user) return;

        const savedAddress =
            user.address ||
            user.default_address?.line1 ||
            user.addresses?.[0]?.line1 ||
            '';

        setForm({
            name: user.name ?? '',
            phone_number: user.phone_number ?? user.phone ?? '',
            address: savedAddress,
            email: user.email ?? '',
        });
    }, [user?.id, user?.address, user?.default_address?.line1]);

    const saveProfile = useMutation({
        mutationFn: () => {
            const payload: {
                name: string;
                phone_number: string;
                address: string;
                email?: string | null;
            } = {
                name: form.name.trim(),
                phone_number: normalizePhoneNumber(form.phone_number.trim()),
                address: form.address.trim(),
            };
            if (form.email && form.email.trim()) {
                payload.email = form.email.trim();
            } else {
                payload.email = null;
            }
            return accountApi.updateProfile(payload);
        },
        onSuccess: (response: any) => {
            const saved = response?.data ?? response;

            if (saved?.name) {
                applyUser(saved);
            }
            queryClient.invalidateQueries({ queryKey: ['account'] });
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            setProfileErrors({});
            toast.success('Your details have been saved.');
        },
        onError: (error: any) => {
            const fields = error?.errors ?? null;
            if (fields) {
                setProfileErrors(fields);
            }
            toast.error(
                fields
                    ? (Object.values(fields).flat()[0] as string)
                    : error?.message || 'Could not save your details'
            );
        },
    });

    const changePassword = useMutation({
        mutationFn: () => accountApi.updatePassword(passwordForm),
        onSuccess: () => {
            setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
            setPasswordErrors({});
            toast.success('Password changed. Other devices have been signed out.');
        },
        onError: (error: any) => {
            const fields = error?.errors ?? null;
            if (fields) {
                setPasswordErrors(fields);
            }
            toast.error(
                fields
                    ? (Object.values(fields).flat()[0] as string)
                    : error?.message || 'Could not change your password'
            );
        },
    });

    if (!user) return null;

    const handleBlur = (key: keyof ProfileFormData) => () => {
        setTouched((prev) => ({ ...prev, [key]: true }));
    };

    const updateName = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = sanitizeName(event.target.value);
        setForm((prev) => ({ ...prev, name: val }));
        if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: null }));
    };

    const updatePhone = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = sanitizePhoneNumber(event.target.value);
        setForm((prev) => ({ ...prev, phone_number: val }));
        if (profileErrors.phone_number) setProfileErrors((prev) => ({ ...prev, phone_number: null }));
    };

    const updateAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = sanitizeAddress(event.target.value);
        setForm((prev) => ({ ...prev, address: val }));
        if (profileErrors.address) setProfileErrors((prev) => ({ ...prev, address: null }));
    };

    const updateEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.target.value;
        setForm((prev) => ({ ...prev, email: val }));
        if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: null }));
    };

    const updatePassword = (key: keyof PasswordFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.target.value;
        setPasswordForm((prev) => ({ ...prev, [key]: val }));
        if (passwordErrors[key]) {
            setPasswordErrors((prev) => ({ ...prev, [key]: null }));
        }
    };

    // Client-side validation errors
    const nameClientError =
        touched.name && !validateName(form.name)
            ? 'Please enter a valid name (at least 2 letters).'
            : null;
    const phoneClientError =
        touched.phone_number && !validatePhoneNumber(form.phone_number)
            ? 'Please enter a valid 11-digit mobile number (e.g. 01712345678).'
            : null;
    const addressClientError =
        touched.address && !validateAddress(form.address)
            ? 'Please enter your complete address (at least 5 characters).'
            : null;
    const emailClientError =
        touched.email && form.email.trim().length > 0 && !validateEmail(form.email)
            ? 'Please enter a valid email address.'
            : null;

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({
            name: true,
            phone_number: true,
            address: true,
            email: true,
        });

        const nextErrors: Record<string, string[] | null> = {};
        if (!validateName(form.name)) {
            nextErrors.name = ['Please enter a valid name (at least 2 letters).'];
        }
        if (!validatePhoneNumber(form.phone_number)) {
            nextErrors.phone_number = ['Please enter a valid 11-digit mobile number (e.g. 01712345678).'];
        }
        if (!validateAddress(form.address)) {
            nextErrors.address = ['Please enter your complete address (at least 5 characters).'];
        }
        if (form.email.trim().length > 0 && !validateEmail(form.email)) {
            nextErrors.email = ['Please enter a valid email address.'];
        }

        if (Object.keys(nextErrors).length > 0) {
            setProfileErrors(nextErrors);
            toast.error(Object.values(nextErrors).flat()[0] as string);
            return;
        }

        saveProfile.mutate();
    };

    const passwordsDiffer =
        passwordForm.password.length > 0 &&
        passwordForm.password_confirmation.length > 0 &&
        passwordForm.password !== passwordForm.password_confirmation;

    const canSubmitPassword =
        passwordForm.current_password.length > 0 &&
        passwordForm.password.length > 0 &&
        passwordForm.password_confirmation.length > 0 &&
        !passwordsDiffer;

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <section>
                <h1 className="text-dark text-xl font-semibold mb-4">Your Details</h1>

                <form
                    onSubmit={handleProfileSubmit}
                    className="space-y-4 rounded-md border border-light-white p-5"
                    noValidate
                >
                    <Field
                        label="Full name"
                        id="profile-name"
                        required
                        placeholder="Enter your full name"
                        value={form.name}
                        onChange={updateName}
                        onBlur={handleBlur('name')}
                        error={profileErrors.name?.[0] || nameClientError}
                    />
                    <Field
                        label="Phone number"
                        id="profile-phone"
                        type="tel"
                        required
                        placeholder="01712345678"
                        hint="A Bangladeshi mobile number, e.g. 01712345678"
                        value={form.phone_number}
                        onChange={updatePhone}
                        onBlur={handleBlur('phone_number')}
                        error={profileErrors.phone_number?.[0] || phoneClientError}
                    />
                    <Field
                        label="Address"
                        id="profile-address"
                        required
                        placeholder="House/Building, Village/Area, Thana, District"
                        hint="Saved automatically for faster checkout"
                        value={form.address}
                        onChange={updateAddress}
                        onBlur={handleBlur('address')}
                        maxLength={250}
                        error={profileErrors.address?.[0] || addressClientError}
                    />
                    <Field
                        label="Email (optional)"
                        id="profile-email"
                        type="email"
                        placeholder="name@example.com"
                        value={form.email}
                        onChange={updateEmail}
                        onBlur={handleBlur('email')}
                        error={profileErrors.email?.[0] || emailClientError}
                    />

                    <button
                        type="submit"
                        disabled={saveProfile.isPending}
                        className="bg-primary hover:bg-dark-primary w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 cursor-pointer"
                    >
                        {saveProfile.isPending ? 'Saving…' : 'Save changes'}
                    </button>
                </form>
            </section>

            <section>
                <h2 className="text-dark text-xl font-semibold mb-4">Change Password</h2>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        changePassword.mutate();
                    }}
                    className="space-y-4 rounded-md border border-light-white p-5"
                >
                    <Field
                        label="Current password"
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={passwordForm.current_password}
                        onChange={updatePassword('current_password')}
                        error={passwordErrors.current_password?.[0]}
                    />
                    <Field
                        label="New password"
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        hint="Must be at least 8 characters with uppercase, lowercase, and a number"
                        value={passwordForm.password}
                        onChange={updatePassword('password')}
                        error={passwordErrors.password?.[0]}
                    />
                    <Field
                        label="Confirm new password"
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        error={passwordsDiffer ? 'The two passwords do not match.' : passwordErrors.password_confirmation?.[0]}
                        value={passwordForm.password_confirmation}
                        onChange={updatePassword('password_confirmation')}
                    />

                    <p className="text-xs text-gray">
                        Changing your password signs you out on every other device.
                    </p>

                    <button
                        type="submit"
                        disabled={changePassword.isPending || !canSubmitPassword}
                        className="bg-dark w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                    >
                        {changePassword.isPending ? 'Changing…' : 'Change password'}
                    </button>
                </form>
            </section>
        </div>
    );
}

interface FieldProps {
    label: string;
    id: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    hint?: string;
    error?: string | null;
    autoComplete?: string;
}

const Field: React.FC<FieldProps> = ({
    label,
    id,
    type = 'text',
    required,
    placeholder,
    maxLength,
    value,
    onChange,
    onBlur,
    hint,
    error,
    autoComplete,
}) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-dark mb-1">
            {label}
            {required && <span className="text-danger ml-1">*</span>}
        </label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            maxLength={maxLength}
            autoComplete={autoComplete}
            aria-invalid={error ? 'true' : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-0 transition-colors focus:border-primary ${
                error ? 'border-danger' : 'border-light-ash'
            }`}
        />
        {error ? (
            <p className="mt-1 text-xs text-danger">{error}</p>
        ) : hint ? (
            <p className="mt-1 text-xs text-gray">{hint}</p>
        ) : null}
    </div>
);
