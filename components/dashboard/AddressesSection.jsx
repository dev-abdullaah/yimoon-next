// components/dashboard/AddressesSection.jsx
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi, addressApi } from '@/lib/api';
import DeleteIcon from '@/components/Icons/DeleteIcon';

/**
 * The shopper's saved delivery addresses.
 *
 * The district is chosen from the Bangladesh administrative list the API
 * serves rather than typed, because that is what determines the shipping zone
 * and therefore the rate. `area` and `city` stay free text: the API does not
 * require a union, and a shopper's landmark or building name is what a courier
 * actually needs.
 *
 * The zone is displayed on each card because it is resolved server-side from
 * the district — showing it tells a shopper why one address may quote a
 * different delivery rate from another, without the client re-deriving the
 * rules.
 */

const ZONE_LABELS = {
    inside: 'Inside Dhaka',
    outside: 'Outside Dhaka',
    sub: 'Suburban',
    remote: 'Remote',
};

const emptyForm = {
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
const NEW = Symbol('new-address');

export default function AddressesSection() {
    const queryClient = useQueryClient();

    // `null` for closed, the string `NEW` for adding, or the address id being
    // edited. A separate flag for "adding" would have been a fourth state to
    // keep consistent; reusing one field keeps it impossible to be half-open.
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [districtId, setDistrictId] = useState('');

    const districtsQuery = useQuery({
        queryKey: ['bd-districts'],
        queryFn: () => addressApi.getDistricts(),
        staleTime: 1000 * 60 * 60,
    });

    const districts = districtsQuery.data?.data?.districts ?? [];

    const addressesQuery = useQuery({
        queryKey: ['addresses'],
        queryFn: () => accountApi.getAddresses(),
    });

    const addresses = addressesQuery.data?.data ?? [];

    // Invalidate on both keys so a saved address shows up in checkout's picker
    // without the shopper having to reload that page.
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['addresses'] });
        queryClient.invalidateQueries({ queryKey: ['account'] });
    };

    const save = useMutation({
        mutationFn: (payload) =>
            payload.id
                ? accountApi.updateAddress(payload.id, payload.data)
                : accountApi.addAddress(payload.data),
        onSuccess: () => {
            refresh();
            closeForm();
            toast.success('Address saved.');
        },
        onError: (error) => toast.error(firstFieldError(error) ?? 'Could not save that address'),
    });

    const remove = useMutation({
        mutationFn: (id) => accountApi.deleteAddress(id),
        onSuccess: () => {
            refresh();
            toast.success('Address removed.');
        },
        onError: (error) => toast.error(error.message || 'Could not remove that address'),
    });

    const makeDefault = useMutation({
        // Only the fields the endpoint validates are sent. Passing the whole
        // record back would echo server-owned keys like `shipping_zone`.
        mutationFn: (address) => accountApi.updateAddress(address.id, {
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
        onSuccess: () => {
            refresh();
            toast.success('Default delivery address updated.');
        },
        onError: (error) => toast.error(error.message || 'Could not update that address'),
    });

    const closeForm = () => {
        setEditing(null);
        setForm(emptyForm);
        setDistrictId('');
    };

    const startEdit = (address) => {
        setEditing(address.id);        setForm({
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
        // The stored address keeps the district only as a name, so the id is
        // matched back from the list on first paint.
        const match = districts.find((district) => district.name_en === address.city);
        setDistrictId(match ? String(match.id) : '');
    };

    // The form is submitted against the API's field names. The district is a
    // catalogue lookup rather than a stored column, so it is sent as `city` —
    // the name, not the id, which is what an address record can hold.
    const submit = (event) => {
        event.preventDefault();

        const district = districts.find((entry) => String(entry.id) === String(districtId));
        const data = {
            ...form,
            city: district?.name_en ?? form.city,
            country: 'BD',
        };

        save.mutate(editing === NEW ? { data } : { id: editing, data });
    };

    const update = (key) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-dark text-xl font-semibold">Saved Addresses</h1>
                {editing === null && (
                    <button
                        type="button"
                        onClick={() => setEditing(NEW)}
                        className="bg-primary rounded-md px-4 py-2 text-sm font-semibold text-white"
                    >
                        Add an address
                    </button>
                )}
            </div>

            {editing !== null && (
                <form onSubmit={submit} className="mt-4 rounded-md border border-light-white p-5">
                    <h2 className="text-dark font-semibold mb-4">
                        {editing === NEW ? 'New address' : 'Edit address'}
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField id="addr-label" label="Label (optional)" value={form.label} onChange={update('label')} placeholder="Home, Office…" />
                        <TextField id="addr-name" label="Recipient name" value={form.recipient_name} onChange={update('recipient_name')} required />
                        <TextField id="addr-phone" label="Phone number" value={form.phone_number} onChange={update('phone_number')} required hint="A Bangladeshi mobile number, e.g. 01712345678" />
                        <SelectField id="addr-district" label="District" value={districtId} onChange={(e) => setDistrictId(e.target.value)} required>
                            <option value="">Select a district…</option>
                            {districts.map((district) => (
                                <option key={district.id} value={district.id}>
                                    {district.name_en} ({district.division})
                                </option>
                            ))}
                        </SelectField>
                        <TextField id="addr-line1" label="Street / house" value={form.line1} onChange={update('line1')} required />
                        <TextField id="addr-line2" label="Apartment, floor (optional)" value={form.line2} onChange={update('line2')} />
                        <TextField id="addr-area" label="Area or landmark (optional)" value={form.area} onChange={update('area')} />
                        <TextField id="addr-postal" label="Postal code (optional)" value={form.postal_code} onChange={update('postal_code')} />
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.is_default}
                            onChange={update('is_default')}
                        />
                        Use as my default delivery address
                    </label>

                    <div className="mt-4 flex gap-2">
                        <button
                            type="submit"
                            disabled={save.isPending}
                            className="bg-primary rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {save.isPending ? 'Saving…' : 'Save address'}
                        </button>
                        <button
                            type="button"
                            onClick={closeForm}
                            className="rounded-md border border-gray-400 px-5 py-2 text-sm"
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

                            {address.shipping_zone && (
                                <p className="mt-2 text-xs text-gray">
                                    Delivery zone:{' '}
                                    {ZONE_LABELS[address.shipping_zone] ?? address.shipping_zone}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => startEdit(address)}
                                    className="rounded border border-gray-400 px-3 py-1 text-sm"
                                >
                                    Edit
                                </button>
                                {!address.is_default && (
                                    <button
                                        type="button"
                                        onClick={() => makeDefault.mutate(address)}
                                        className="rounded border border-gray-400 px-3 py-1 text-sm"
                                    >
                                        Make default
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label={`Remove address for ${address.recipient_name}`}
                                    onClick={() => remove.mutate(address.id)}
                                    className="ml-auto"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const firstFieldError = (error) => {
    const fields = error.errors ?? null;
    return fields ? Object.values(fields).flat()[0] : null;
};

const TextField = ({ id, label, value, onChange, required, hint, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray mb-1">
            {label}
        </label>
        <input
            id={id}
            type="text"
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full rounded-md border border-light-ash px-3 py-2 text-sm outline-0 focus:border-primary"
        />
        {hint && <p className="mt-1 text-xs text-gray">{hint}</p>}
    </div>
);

const SelectField = ({ id, label, value, onChange, required, children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray mb-1">
            {label}
        </label>
        <select
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full rounded-md border border-light-ash bg-white px-3 py-2 text-sm outline-0 focus:border-primary"
        >
            {children}
        </select>
    </div>
);
