// components/dashboard/ProfileSection.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface ProfileFormData {
    name: string;
    email: string;
    phone_number: string;
}

interface PasswordFormData {
    current_password: string;
    password: string;
    password_confirmation: string;
}

/**
 * The shopper's own details, and the form for changing them.
 *
 * Edits are saved through the API rather than into local state, so what the
 * header and the checkout show comes from the server's copy. The saved response
 * is fed back into the auth context because that is what the rest of the app
 * reads the shopper's name from.
 */
export default function ProfileSection() {
    const { user, applyUser } = useAuth();
    const queryClient = useQueryClient();

    const [form, setForm] = useState<ProfileFormData>({ name: '', email: '', phone_number: '' });
    const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [profileErrors, setProfileErrors] = useState<Record<string, string[] | null>>({});
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string[] | null>>({});

    // Seeded from the signed-in shopper once, rather than kept in sync: the
    // fields are the source of truth while the shopper is editing them, and
    // overwriting an in-progress edit on every render would be hostile.
    useEffect(() => {
        if (!user) return;

        setForm({
            name: user.name ?? '',
            email: user.email ?? '',
            phone_number: user.phone_number ?? '',
        });
    }, [user?.id]);

    const saveProfile = useMutation({
        mutationFn: () => {
            const payload: { name: string; phone_number: string; email?: string | null } = {
                name: form.name.trim(),
                phone_number: form.phone_number.trim(),
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

            // The server's copy, not the submitted fields — see `applyUser`.
            if (saved?.name) applyUser(saved);
            queryClient.invalidateQueries({ queryKey: ['account'] });
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

    const update = (key: keyof ProfileFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.target.value;
        setForm((prev) => ({ ...prev, [key]: val }));
        if (profileErrors[key]) {
            setProfileErrors((prev) => ({ ...prev, [key]: null }));
        }
    };

    const updatePassword = (key: keyof PasswordFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.target.value;
        setPasswordForm((prev) => ({ ...prev, [key]: val }));
        if (passwordErrors[key]) {
            setPasswordErrors((prev) => ({ ...prev, [key]: null }));
        }
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
                    onSubmit={(e) => {
                        e.preventDefault();
                        saveProfile.mutate();
                    }}
                    className="space-y-4 rounded-md border border-light-white p-5"
                >
                    <Field
                        label="Full name"
                        id="profile-name"
                        value={form.name}
                        onChange={update('name')}
                        error={profileErrors.name?.[0]}
                    />
                    <Field
                        label="Email"
                        id="profile-email"
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        error={profileErrors.email?.[0]}
                    />
                    <Field
                        label="Phone number"
                        id="profile-phone"
                        hint="A Bangladeshi mobile number, e.g. 01712345678"
                        value={form.phone_number}
                        onChange={update('phone_number')}
                        error={profileErrors.phone_number?.[0]}
                    />

                    <button
                        type="submit"
                        disabled={saveProfile.isPending}
                        className="bg-primary w-full rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
                        className="bg-dark w-full rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    hint?: string;
    error?: string | null;
    autoComplete?: string;
}

const Field: React.FC<FieldProps> = ({
    label,
    id,
    type = 'text',
    value,
    onChange,
    hint,
    error,
    autoComplete,
}) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray mb-1">
            {label}
        </label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            aria-invalid={error ? 'true' : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-0 focus:border-primary ${
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
