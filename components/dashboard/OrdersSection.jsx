// components/dashboard/OrdersSection.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { accountApi, invoiceApi, formatCurrency, getProductImageUrl } from '@/lib/api';
import { getProductRelativeUrl } from '@/utils/urlHelper';

/**
 * A shopper's order history, with an expandable detail view per order.
 *
 * The list endpoint returns orders without their lines or their timeline, so
 * opening one fetches the full record. That keeps the list cheap — a shopper
 * with forty orders does not pay for forty sets of line items to look at the
 * list — at the cost of one request when they actually want to see something.
 */

// The statuses the order state machine can be in, from `Order::statusLabels`.
// Anything else falls back to a neutral tone rather than rendering unstyled.
const STATUS_TONES = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

const StatusBadge = ({ order }) => (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONES[order.status] ?? 'bg-slate-100 text-slate-700'}`}>
        {order.status_label ?? order.status}
    </span>
);

const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function OrdersSection() {
    const [page, setPage] = useState(1);
    const [openOrderId, setOpenOrderId] = useState(null);
    const [cancelling, setCancelling] = useState(false);

    const ordersQuery = useQuery({
        queryKey: ['orders', page],
        queryFn: () => accountApi.getOrders({ page, per_page: 10 }),
    });

    const orders = ordersQuery.data?.data ?? [];
    const meta = ordersQuery.data?.meta ?? null;

    const cancelOrder = async (order) => {
        const label = order.order_number_short ?? order.order_number;
        const reason = window.prompt(`Why are you cancelling order ${label}?`);

        // A null reason means the shopper dismissed the prompt, which is a
        // cancellation of the cancellation rather than a request to cancel.
        if (reason === null) return;

        // The API requires a reason, and an empty string is not a reason. Asked
        // again rather than sent blank, so the shopper gets a clear message
        // instead of a validation error naming a field they never saw.
        if (!reason.trim()) {
            toast.error('Please give a reason for cancelling.');
            return;
        }

        setCancelling(true);

        try {
            await accountApi.cancelOrder(order.id, reason.trim());
            toast.success('Your order has been cancelled.');
            ordersQuery.refetch();
        } catch (error) {
            toast.error(error.message || 'Could not cancel that order');
        } finally {
            setCancelling(false);
        }
    };

    if (ordersQuery.isLoading) {
        return (
            <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 w-full animate-pulse rounded-md bg-slate-200" />
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="py-16 text-center">
                <p className="text-lg font-semibold text-dark">No orders yet</p>
                <p className="mt-1 text-gray">When you place an order it will appear here.</p>
                <Link href="/catalog" className="bg-primary mt-6 inline-block rounded-md px-6 py-2 text-white font-medium">
                    Start shopping
                </Link>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-dark text-xl font-semibold">My Orders</h1>

            <ul className="mt-4 space-y-3">
                {orders.map((order) => (
                    <OrderRow
                        key={order.id}
                        order={order}
                        isOpen={openOrderId === order.id}
                        onToggle={() => setOpenOrderId(openOrderId === order.id ? null : order.id)}
                        onCancel={() => cancelOrder(order)}
                        cancelling={cancelling}
                    />
                ))}
            </ul>

            {meta && meta.last_page > 1 && (
                <nav aria-label="Order pages" className="mt-6 flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray">Page {page} of {meta.last_page}</span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                        disabled={page >= meta.last_page}
                        className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        Next
                    </button>
                </nav>
            )}
        </div>
    );
}

/** One order summary, with its detail fetched only once expanded. */
function OrderRow({ order, isOpen, onToggle, onCancel, cancelling }) {
    const canCancel = (order.allowed_transitions ?? []).includes('cancelled');

    return (
        <li className="rounded-md border border-light-white bg-white">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
            >
                <div>
                    <p className="text-dark font-semibold">#{order.order_number_short ?? order.order_number}</p>
                    <p className="text-xs text-gray">{formatDate(order.placed_at ?? order.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusBadge order={order} />
                    <span className="text-dark font-semibold">{formatCurrency(order.totals?.total ?? 0)}</span>
                    <span aria-hidden="true" className="text-gray">{isOpen ? '▲' : '▼'}</span>
                </div>
            </button>

            {isOpen && <OrderDetail order={order} canCancel={canCancel} onCancel={onCancel} cancelling={cancelling} />}
        </li>
    );
}

/** The full record for one order, fetched on demand. */
function OrderDetail({ order, canCancel, onCancel, cancelling }) {
    const detailQuery = useQuery({
        queryKey: ['order', order.id],
        queryFn: () => accountApi.getOrder(order.id),
        // Already loaded once expanded; keep it around so collapsing and
        // re-opening does not refetch.
        staleTime: 1000 * 60 * 5,
    });

    const full = detailQuery.data?.data ?? order;
    const items = full.items || [];
    const timeline = full.timeline || [];

    return (
        <div className="border-t border-light-white p-4">
            {detailQuery.isLoading ? (
                <div className="h-32 w-full animate-pulse rounded bg-slate-100" />
            ) : (
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <h2 className="text-sm font-semibold text-dark mb-2">
                            Items {full.item_count ? `(${full.item_count})` : ''}
                        </h2>
                        {items.length === 0 ? (
                            <p className="text-sm text-gray">
                                The line items for this order are no longer on record.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {items.map((item) => (
                                    <li key={item.id} className="flex items-center gap-3">
                                        {item.image && (
                                            <img
                                                src={getProductImageUrl(item.image)}
                                                alt=""
                                                width="48"
                                                height="48"
                                                className="h-12 w-12 rounded object-cover"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            {item.product_slug ? (
                                                <Link
                                                    href={getProductRelativeUrl({
                                                        id: item.product_id,
                                                        slug: item.product_slug,
                                                    })}
                                                    className="text-sm text-dark font-medium hover:text-primary"
                                                >
                                                    {item.name}
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-dark font-medium">{item.name}</span>
                                            )}
                                            <p className="text-xs text-gray">
                                                {item.variant_name ? `${item.variant_name} · ` : ''}
                                                Qty {item.quantity} × {formatCurrency(item.unit_price ?? 0)}
                                                {!item.product_exists && ' · no longer listed'}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-dark">
                                            {formatCurrency(item.line_total ?? 0)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {timeline.length > 0 && (
                            <>
                                <h2 className="text-sm font-semibold text-dark mt-6 mb-2">Progress</h2>
                                <ol className="space-y-2">
                                    {timeline.map((event) => (
                                        <li key={event.id} className="flex gap-3 text-sm">
                                            <span className="shrink-0 text-gray">{formatDate(event.occurred_at)}</span>
                                            <span className="text-dark">{event.description ?? event.to_status}</span>
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold text-dark mb-1">Delivering to</h2>
                            <address className="text-sm text-gray not-italic">
                                {full.shipping?.recipient_name}<br />
                                {full.shipping?.phone_number}<br />
                                {full.shipping?.address}
                            </address>
                        </div>

                        <div>
                            <h2 className="text-sm font-semibold text-dark mb-1">Payment</h2>
                            <p className="text-sm text-gray">
                                {full.payment?.method?.toUpperCase()} — {full.payment?.is_paid ? 'paid' : 'unpaid'}
                            </p>
                        </div>

                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray">Subtotal</span>
                                <span>{formatCurrency(full.totals?.subtotal ?? 0)}</span>
                            </div>
                            {(full.totals?.discount ?? 0) > 0 && (
                                <div className="flex justify-between text-success">
                                    <span>Discount</span>
                                    <span>- {formatCurrency(full.totals.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray">Delivery</span>
                                <span>{formatCurrency(full.totals?.shipping ?? 0)}</span>
                            </div>
                            <div className="flex justify-between font-semibold border-t border-light-white pt-1">
                                <span>Total</span>
                                <span>{formatCurrency(full.totals?.total ?? 0)}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            {canCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={cancelling}
                                    className="rounded border border-danger px-3 py-1.5 text-sm text-danger disabled:opacity-50"
                                >
                                    Cancel order
                                </button>
                            )}
                            <InvoiceButton order={order} />
                            <Link
                                href={`/dashboard?section=tracking&order_number=${encodeURIComponent(order.order_number_short ?? order.order_number)}`}
                                className="rounded border border-gray-400 px-3 py-1.5 text-sm hover:border-primary hover:text-primary transition-colors"
                            >
                                Track order
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Opens an order's invoice.
 *
 * Not an `<a href>`: the invoice endpoint requires the bearer token, and a
 * link opens a fresh navigation that carries no headers — so a plain link would
 * land the shopper on a 401 page. The PDF is fetched with the session and handed
 * to the browser as an object URL instead.
 *
 * The URL is revoked once the tab has opened. Without that, every invoice the
 * shopper ever looked at would stay pinned in memory for the life of the
 * document, since a blob URL is a live reference to its bytes.
 */
function InvoiceButton({ order }) {
    const [busy, setBusy] = useState(false);

    const open = async () => {
        setBusy(true);

        try {
            const url = await invoiceApi.pdfUrl(order.id);
            const tab = window.open(url, '_blank', 'noopener,noreferrer');

            if (!tab) {
                // A popup blocker stopped the tab, so the shopper would get no
                // feedback at all. Downloading instead still gets them the file.
                const downloadUrl = await invoiceApi.pdfUrl(order.id, { download: true });
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `invoice-${order.order_number ?? order.id}.pdf`;
                link.click();
                URL.revokeObjectURL(downloadUrl);
            }

            // Released on a delay so the newly opened tab has time to read the
            // bytes before the reference goes away.
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (error) {
            toast.error(error.message || 'Could not load that invoice');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={open}
            disabled={busy}
            className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:opacity-50"
        >
            {busy ? 'Loading…' : 'View invoice'}
        </button>
    );
}
