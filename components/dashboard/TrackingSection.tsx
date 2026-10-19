// components/dashboard/TrackingSection.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { orderTrackingApi, formatCurrency, getProductImageUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderItem, OrderTimelineEvent } from '@/types/account';

/**
 * Track an order by its number and the phone number it was placed with.
 *
 * Open to guests as well as signed-in shoppers: someone who checked out without
 * an account has no order list to click through, and a guest is exactly who
 * most needs to check on a parcel.
 *
 * Both fields are required because the phone number is what stops the order
 * number from being an oracle — an order number alone would let anyone walk the
 * space and read other people's addresses.
 */

interface Step {
    status: string;
    label: string;
}

const STEPS: Step[] = [
    { status: 'pending', label: 'Order placed' },
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'delivered', label: 'Delivered' },
];

const STATUS_INDEX: Record<string, number> = Object.fromEntries(
    STEPS.map((step, index) => [step.status, index])
);

/** The progress bar for an order's current status. */
function Progress({ status }: { status: string }) {
    // A cancelled order never reaches the steps above, so it is called out
    // rather than drawn as a partly-filled bar that implies it is progressing.
    if (status === 'cancelled') {
        return (
            <p className="rounded-md border border-danger bg-red-50 p-3 text-sm font-semibold text-danger">
                This order was cancelled.
            </p>
        );
    }

    const current = STATUS_INDEX[status] ?? 0;

    return (
        <ol className="flex items-center gap-2">
            {STEPS.map((step, index) => {
                const done = index <= current;

                return (
                    <li key={step.status} className="flex flex-1 flex-col items-center gap-1">
                        <span
                            className={`h-3 w-3 rounded-full ${done ? 'bg-primary' : 'bg-slate-300'}`}
                            aria-hidden="true"
                        />
                        <span className={`text-xs ${done ? 'font-semibold text-dark' : 'text-gray'}`}>
                            {step.label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

interface TrackFormData {
    order_number: string;
    phone: string;
}

export default function TrackingSection() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const queryOrderNumber = searchParams?.get('order_number') || '';

    const [form, setForm] = useState<TrackFormData>({
        order_number: queryOrderNumber,
        phone: user?.phone_number || '',
    });

    const track = useMutation({
        mutationFn: (searchData?: TrackFormData) => orderTrackingApi.track(searchData || form),
        // Tracking is a lookup, not a cache: the answer changes as the parcel
        // moves, so a repeat search must not be served from a stale result.
        gcTime: 0,
        retry: false,
    });

    // Populate phone if user is loaded later or if order_number was in URL
    useEffect(() => {
        setForm((prev) => {
            const nextOrder = queryOrderNumber || prev.order_number;
            const nextPhone = prev.phone || user?.phone_number || '';
            return { order_number: nextOrder, phone: nextPhone };
        });

        if (queryOrderNumber && (user?.phone_number || form.phone)) {
            track.mutate({
                order_number: queryOrderNumber,
                phone: user?.phone_number || form.phone,
            });
        }
    }, [queryOrderNumber, user?.phone_number]);

    const order: Order | null = track.data?.data ?? null;

    const update = (key: keyof TrackFormData) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: event.target.value }));

    return (
        <div>
            <h1 className="text-dark text-xl font-semibold">Track an Order</h1>
            <p className="mt-1 text-gray text-sm">
                Enter the order number from your confirmation and the phone number you ordered with.
            </p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    track.mutate(form);
                }}
                className="mt-4 grid gap-3 rounded-md border border-light-white p-5 sm:grid-cols-[2fr_2fr_auto]"
            >
                <div>
                    <label htmlFor="track-order" className="block text-sm font-medium text-gray mb-1">
                        Order number
                    </label>
                    <input
                        id="track-order"
                        type="text"
                        required
                        value={form.order_number}
                        onChange={update('order_number')}
                        placeholder="e.g. JUL-14-592 or 26-JUL-14-592"
                        className="w-full rounded-md border border-light-ash px-3 py-2 text-sm outline-0 focus:border-primary"
                    />
                </div>

                <div>
                    <label htmlFor="track-phone" className="block text-sm font-medium text-gray mb-1">
                        Phone number
                    </label>
                    <input
                        id="track-phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={update('phone')}
                        placeholder="01712345678"
                        className="w-full rounded-md border border-light-ash px-3 py-2 text-sm outline-0 focus:border-primary"
                    />
                </div>

                <button
                    type="submit"
                    disabled={track.isPending}
                    className="bg-primary self-end rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                >
                    {track.isPending ? 'Looking…' : 'Track'}
                </button>

                {track.isError && (
                    <p role="alert" className="sm:col-span-3 text-sm text-danger">
                        {(track.error as any)?.message}
                    </p>
                )}
            </form>

            {order && (
                <section className="mt-6 rounded-md border border-light-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-dark font-semibold">
                                #{order.order_number_short ?? order.order_number}
                            </p>
                            <p className="text-sm text-gray">
                                {order.shipping?.recipient_name} · {order.shipping?.phone_number}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold">
                                {order.status_label ?? order.status}
                            </p>
                            <p className="text-sm text-gray">
                                {formatCurrency(order.totals?.total ?? 0)}
                            </p>
                        </div>
                    </div>

                    <address className="mt-3 text-sm text-gray not-italic">
                        {order.shipping?.address}
                    </address>

                    <div className="mt-5">
                        <Progress status={order.status} />
                    </div>

                    {order.items && order.items.length > 0 && (
                        <div className="mt-5 border-t border-light-white pt-4">
                            <h2 className="text-sm font-semibold text-dark mb-3">Order Items</h2>
                            <ul className="space-y-2">
                                {order.items.map((item: OrderItem) => (
                                    <li key={item.id} className="flex items-center gap-3">
                                        {item.image && (
                                            <img
                                                src={getProductImageUrl(item.image)}
                                                alt=""
                                                width="40"
                                                height="40"
                                                className="h-10 w-10 rounded object-cover"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-dark font-medium truncate">{item.name}</p>
                                            <p className="text-xs text-gray">
                                                Qty {item.quantity} × {formatCurrency(item.unit_price ?? 0)}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-dark">
                                            {formatCurrency(item.line_total ?? 0)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {(order.timeline || []).length > 0 && (
                        <ol className="mt-5 space-y-2 border-t border-light-white pt-4">
                            {order.timeline!.map((event: OrderTimelineEvent) => (
                                <li key={event.id} className="flex gap-3 text-sm">
                                    <span className="shrink-0 text-gray">
                                        {event.occurred_at
                                            ? new Date(event.occurred_at).toLocaleDateString('en-GB')
                                            : ''}
                                    </span>
                                    <span className="text-dark">
                                        {event.description ?? event.to_status}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}

                    <Link href="/dashboard?section=orders" className="text-primary mt-5 inline-block text-sm font-medium hover:underline">
                        See all your orders
                    </Link>
                </section>
            )}
        </div>
    );
}
