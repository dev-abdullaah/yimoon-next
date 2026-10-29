// components/dashboard/AddressesSection.tsx
'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi, authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import DeleteIconMD from '@/components/Icons/DeleteIconMD';
import { Address, AddressFormState } from '@/types/account';
import {
    validateName,
    sanitizeName,
    validatePhoneNumber,
    sanitizePhoneNumber,
    normalizePhoneNumber,
    validateAddress,
    sanitizeAddress,
} from '@/utils/validators';

/**
 * The shopper's saved delivery addresses.
 *
 * Uses simple text fields with client-side validation (no select dropdowns).
 */

const emptyForm: AddressFormState = {
    label: '',
    recipient_name: '',
    phone_number: '',
    line1: '',
    line2: '',
    area: '',
    city: '',
    postal_code: '',
    is_default: false,
};

// Marks "adding" as opposed to "editing", without colliding with a real id.
const NEW = 'new-address-symbol';

export default function AddressesSection() {
    const queryClient = useQueryClient();
    const { applyUser } = useAuth();

    // `null` for closed, NEW for adding, or the address id being edited.
    const [editing, setEditing] = useState<number | string | null>(null);
    const [form, setForm] = useState<AddressFormState>(emptyForm);
    const [touched, setTouched] = useState<{
        recipient_name: boolean;
        phone_number: boolean;
        line1: boolean;
    }>({
        recipient_name: false,
        phone_number: false,
        line1: false,
    });
    const [fieldErrors, setFieldErrors] = useState<{
        recipient_name?: string | null;
        phone_number?: string | null;
        line1?: string | null;
    }>({});

    const addressesQuery = useQuery({
        queryKey: ['addresses'],
        queryFn: () => accountApi.getAddresses(),
    });

    const addresses: Address[] = addressesQuery.data?.data ?? [];

    // Refresh both cached queries and AuthContext user so checkout auto-populates immediately
    const refresh = async () => {
        queryClient.invalidateQueries({ queryKey: ['addresses'] });
        queryClient.invalidateQueries({ queryKey: ['account'] });
        try {
            const meData = await authApi.me();
            if (meData?.data || meData?.id) {
                applyUser(meData.data || meData);
            }
        } catch {
            // ignore background refresh error
        }
    };

    const save = useMutation({
        mutationFn: (payload: { id?: number | string; data: any }) =>
            payload.id
                ? accountApi.updateAddress(payload.id, payload.data)
                : accountApi.addAddress(payload.data),
        onSuccess: async () => {
            await refresh();
            closeForm();
            toast.success('Address saved.');
        },
        onError: (error: any) => toast.error(firstFieldError(error) ?? 'Could not save that address'),
    });

    const remove = useMutation({
        mutationFn: (id: number | string) => accountApi.deleteAddress(id),
        onSuccess: async () => {
            await refresh();
            toast.success('Address removed.');
        },
        onError: (error: any) => toast.error(error?.message || 'Could not remove that address'),
    });

    const makeDefault = useMutation({
        mutationFn: (address: Address) =>
            accountApi.updateAddress(address.id, {
                recipient_name: address.recipient_name,
                phone_number: address.phone_number,
                line1: address.line1,
                line2: address.line2,
                area: address.area,
                city: address.city,
                postal_code: address.postal_code,
                country: address.country ?? 'BD',
                is_default: true,
            }),
        onSuccess: async () => {
            await refresh();
            toast.success('Default delivery address updated.');
        },
        onError: (error: any) => toast.error(error?.message || 'Could not update that address'),
    });

    const closeForm = () => {
        setEditing(null);
        setForm(emptyForm);
        setTouched({ recipient_name: false, phone_number: false, line1: false });
        setFieldErrors({});
    };

    const startEdit = (address: Address) => {
        setEditing(address.id);
        setForm({
            label: address.label ?? '',
            recipient_name: address.recipient_name ?? '',
            phone_number: address.phone_number ?? '',
            line1: address.line1 ?? '',
            line2: address.line2 ?? '',
            area: address.area ?? '',
            city: address.city ?? '',
            postal_code: address.postal_code ?? '',
            is_default: Boolean(address.is_default),
        });
        setTouched({ recipient_name: false, phone_number: false, line1: false });
        setFieldErrors({});
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setTouched({ recipient_name: true, phone_number: true, line1: true });

        const nextErrors: {
            recipient_name?: string | null;
            phone_number?: string | null;
            line1?: string | null;
        } = {};

        if (!validateName(form.recipient_name)) {
            nextErrors.recipient_name = 'Please enter a valid recipient name (at least 2 letters).';
        }
        if (!validatePhoneNumber(form.phone_number)) {
            nextErrors.phone_number = 'Please enter a valid 11-digit mobile number (e.g. 01712345678).';
        }
        if (!validateAddress(form.line1)) {
            nextErrors.line1 = 'Please enter a complete address (at least 5 characters).';
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            toast.error(Object.values(nextErrors)[0] as string);
            return;
        }

        const data = {
            label: form.label?.trim() || 'Home',
            recipient_name: form.recipient_name.trim(),
            phone_number: normalizePhoneNumber(form.phone_number.trim()),
            line1: form.line1.trim(),
            line2: form.line2?.trim() || null,
            area: form.area?.trim() || null,
            city: form.city?.trim() || null,
            postal_code: form.postal_code?.trim() || null,
            country: 'BD',
            is_default: form.is_default,
        };

        save.mutate(editing === NEW ? { data } : { id: editing!, data });
    };

    const nameError =
        fieldErrors.recipient_name ||
        (touched.recipient_name && !validateName(form.recipient_name)
            ? 'Please enter a valid recipient name (at least 2 letters).'
            : null);

    const phoneError =
        fieldErrors.phone_number ||
        (touched.phone_number && !validatePhoneNumber(form.phone_number)
            ? 'Please enter a valid 11-digit mobile number (e.g. 01712345678).'
            : null);

    const addressError =
        fieldErrors.line1 ||
        (touched.line1 && !validateAddress(form.line1)
            ? 'Please enter a complete address (at least 5 characters).'
            : null);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-dark text-xl font-semibold">Saved Addresses</h1>
                {editing === null && (
                    <button
                        type="button"
                        onClick={() => setEditing(NEW)}
                        className="bg-primary hover:bg-dark-primary rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer"
                    >
                        Add an address
                    </button>
                )}
            </div>

            {editing !== null && (
                <form onSubmit={submit} className="mt-4 rounded-md border border-light-white p-5" noValidate>
                    <h2 className="text-dark font-semibold mb-4">
                        {editing === NEW ? 'New address' : 'Edit address'}
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            id="addr-name"
                            label="Recipient name"
                            required
                            placeholder="Enter recipient's full name"
                            value={form.recipient_name}
                            onChange={(e) => {
                                const val = sanitizeName(e.target.value);
                                setForm((prev) => ({ ...prev, recipient_name: val }));
                                if (fieldErrors.recipient_name) {
                                    setFieldErrors((prev) => ({ ...prev, recipient_name: null }));
                                }
                            }}
                            onBlur={() => setTouched((prev) => ({ ...prev, recipient_name: true }))}
                            error={nameError}
                        />
                        <TextField
                            id="addr-phone"
                            label="Phone number"
                            type="tel"
                            required
                            placeholder="01712345678"
                            value={form.phone_number}
                            onChange={(e) => {
                                const val = sanitizePhoneNumber(e.target.value);
                                setForm((prev) => ({ ...prev, phone_number: val }));
                                if (fieldErrors.phone_number) {
                                    setFieldErrors((prev) => ({ ...prev, phone_number: null }));
                                }
                            }}
                            onBlur={() => setTouched((prev) => ({ ...prev, phone_number: true }))}
                            hint="A Bangladeshi mobile number, e.g. 01712345678"
                            error={phoneError}
                        />
                        <div className="sm:col-span-2">
                            <TextField
                                id="addr-line1"
                                label="Full Address"
                                required
                                maxLength={250}
                                placeholder="House/Building, Village/Area, Thana, District"
                                value={form.line1}
                                onChange={(e) => {
                                    const val = sanitizeAddress(e.target.value);
                                    setForm((prev) => ({ ...prev, line1: val }));
                                    if (fieldErrors.line1) {
                                        setFieldErrors((prev) => ({ ...prev, line1: null }));
                                    }
                                }}
                                onBlur={() => setTouched((prev) => ({ ...prev, line1: true }))}
                                error={addressError}
                            />
                        </div>
                        <TextField
                            id="addr-label"
                            label="Label (optional)"
                            value={form.label}
                            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                            placeholder="Home, Office…"
                        />
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_default}
                            onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                            className="accent-primary"
                        />
                        Use as my default delivery address
                    </label>

                    <div className="mt-4 flex gap-2">
                        <button
                            type="submit"
                            disabled={save.isPending}
                            className="bg-primary hover:bg-dark-primary rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                        >
                            {save.isPending ? 'Saving…' : 'Save address'}
                        </button>
                        <button
                            type="button"
                            onClick={closeForm}
                            className="rounded-md border border-gray-400 px-5 py-2 text-sm cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {addressesQuery.isLoading ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[0, 1].map((i) => (
                        <div key={i} className="h-40 w-full animate-pulse rounded-md bg-slate-200" />
                    ))}
                </div>
            ) : addresses.length === 0 ? (
                <p className="mt-8 text-gray">
                    You have no saved addresses yet. Adding one speeds up checkout.
                </p>
            ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {addresses.map((address) => (
                        <li key={address.id} className="rounded-md border border-light-white p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    {address.label && (
                                        <p className="text-xs font-semibold uppercase text-primary">
                                            {address.label}
                                        </p>
                                    )}
                                    <p className="text-dark font-semibold">{address.recipient_name}</p>
                                    <p className="text-sm text-gray">{address.phone_number}</p>
                                </div>
                                {address.is_default && (
                                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                                        Default
                                    </span>
                                )}
                            </div>

                            <address className="mt-2 text-sm text-gray not-italic">
                                {address.line1}
                                {address.line2 && <>, {address.line2}</>}
                                {address.area && <>, {address.area}</>}
                                {address.city && <>, {address.city}</>}
                                {address.postal_code && <>, {address.postal_code}</>}
                            </address>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => startEdit(address)}
                                    className="rounded border border-gray-400 px-3 py-1 text-sm cursor-pointer"
                                >
                                    Edit
                                </button>
                                {!address.is_default && (
                                    <button
                                        type="button"
                                        onClick={() => makeDefault.mutate(address)}
                                        className="rounded border border-gray-400 px-3 py-1 text-sm cursor-pointer"
                                    >
                                        Make default
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label={`Remove address for ${address.recipient_name}`}
                                    onClick={() => remove.mutate(address.id)}
                                    className="ml-auto cursor-pointer"
                                >
                                    <DeleteIconMD />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const firstFieldError = (error: any): string | null => {
    const fields = error?.errors ?? null;
    return fields ? (Object.values(fields).flat()[0] as string) : null;
};

interface TextFieldProps {
    id: string;
    label: string;
    type?: string;
    maxLength?: number;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    required?: boolean;
    hint?: string;
    error?: string | null;
    placeholder?: string;
}

const TextField: React.FC<TextFieldProps> = ({
    id,
    label,
    type = 'text',
    maxLength,
    value,
    onChange,
    onBlur,
    required,
    hint,
    error,
    placeholder,
}) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-dark mb-1">
            {label}
            {required && <span className="text-danger ml-1">*</span>}
        </label>
        <input
            id={id}
            type={type}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            placeholder={placeholder}
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
