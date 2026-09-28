// components/dashboard/ProfileSection.jsx
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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

    const [form, setForm] = useState({ name: '', email: '', phone_number: '' });
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

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
        mutationFn: () => accountApi.updateProfile(form),
        onSuccess: (response) => {
            const saved = response?.data ?? response;

            // The server's copy, not the submitted fields — see `applyUser`.
            if (saved?.name) applyUser(saved);
            queryClient.invalidateQueries({ queryKey: ['account'] });
            toast.success('Your details have been saved.');
        },
        onError: (error) => {
            // Field-level messages matter here: "email has already been taken"
            // tells the shopper which box to fix, a generic failure does not.
            const fields = error.errors ?? null;
            toast.error(
                fields
                    ? Object.values(fields).flat()[0]
                    : error.message || 'Could not save your details'
            );
        },
    });

    const changePassword = useMutation({
        mutationFn: () => accountApi.updatePassword(passwordForm),
        onSuccess: () => {
            setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
            toast.success('Password changed. Other devices have been signed out.');
        },
        onError: (error) => {
            const fields = error.errors ?? null;
            toast.error(
                fields
                    ? Object.values(fields).flat()[0]
                    : error.message || 'Could not change your password'
            );
        },
    });

    if (!user) return null;

    const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
    const updatePassword = (key) => (event) =>
        setPasswordForm((prev) => ({ ...prev, [key]: event.target.value }));

    const passwordsDiffer =
        passwordForm.password.length > 0 &&
        passwordForm.password !== passwordForm.password_confirmation;

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
                    <Field label="Full name" id="profile-name" value={form.name} onChange={update('name')} />
                    <Field
                        label="Email"
                        id="profile-email"
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                    />
                    <Field
                        label="Phone number"
                        id="profile-phone"
                        hint="A Bangladeshi mobile number, e.g. 01712345678"
                        value={form.phone_number}
                        onChange={update('phone_number')}
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
                    />
                    <Field
                        label="New password"
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={passwordForm.password}
                        onChange={updatePassword('password')}
                    />
                    <Field
                        label="Confirm new password"
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        error={passwordsDiffer ? 'The two passwords do not match.' : null}
                        value={passwordForm.password_confirmation}
                        onChange={updatePassword('password_confirmation')}
                    />

                    <p className="text-xs text-gray">
                        Changing your password signs you out on every other device.
                    </p>

                    <button
                        type="submit"
                        disabled={changePassword.isPending || passwordsDiffer}
                        className="bg-dark w-full rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {changePassword.isPending ? 'Changing…' : 'Change password'}
                    </button>
                </form>
            </section>
        </div>
    );
}

const Field = ({ label, id, type = 'text', value, onChange, hint, error, autoComplete }) => (
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
