// components/dashboard/DashboardHome.jsx
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { accountApi, wishlistApi, formatCurrency } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * The account overview: a few counts and the most recent orders.
 *
 * The counts come from the order list's `meta.total` rather than from a
 * separate stats endpoint. Asking the list for one page and counting the result
 * would show "1 order" to a shopper with forty, and a dedicated count query
 * would be a second round trip for a number the first response already had.
 *
 * A shopper with no orders is greeted rather than shown an empty grid — an
 * empty dashboard is the normal state for a new account, not a problem to
 * report.
 */
export default function DashboardHome() {
    const { user } = useAuth();

    const ordersQuery = useQuery({
        queryKey: ['orders', 1],
        queryFn: () => accountApi.getOrders({ page: 1, per_page: 5 }),
    });

    const orders = ordersQuery.data?.data ?? [];
    const totalOrders = ordersQuery.data?.meta?.total ?? orders.length;

    const addressesQuery = useQuery({
        queryKey: ['addresses'],
        queryFn: () => accountApi.getAddresses(),
    });

    const wishlistQuery = useQuery({
        queryKey: ['wishlist'],
        queryFn: () => wishlistApi.getWishlist(),
    });

    const savedCount = wishlistQuery.data?.data?.items?.length ?? 0;



    return (
        <div>
            <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Orders placed" value={totalOrders} href="/dashboard?section=orders" />
                <Stat
                    label="Saved addresses"
                    value={addressesQuery.data?.data?.length ?? '—'}
                    href="/dashboard?section=addresses"
                />
                <Stat label="Saved products" value={savedCount} href="/dashboard?section=wishlist" />
            </div>

            <section className="mt-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-dark font-semibold">Recent orders</h2>
                    <Link
                        href="/dashboard?section=orders"
                        className="text-primary text-sm font-medium hover:underline"
                    >
                        View all
                    </Link>
                </div>

                {ordersQuery.isLoading ? (
                    <div className="mt-3 h-40 w-full animate-pulse rounded-md bg-slate-200" />
                ) : orders.length === 0 ? (
                    <div className="mt-3 rounded-md border border-light-white p-8 text-center">
                        <p className="text-dark font-medium">No orders yet</p>
                        <p className="mt-1 text-sm text-gray">
                            Your recent orders will appear here once you place one.
                        </p>
                        <Link
                            href="/catalog"
                            className="bg-primary mt-4 inline-block rounded-md px-5 py-2 text-sm font-semibold text-white"
                        >
                            Start shopping
                        </Link>
                    </div>
                ) : (
                    <ul className="mt-3 divide-y divide-light-white rounded-md border border-light-white">
                        {orders.map((order) => (
                            <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50 transition-colors">
                                <div>
                                    <Link
                                        href="/dashboard?section=orders"
                                        className="text-dark font-medium hover:text-primary hover:underline"
                                    >
                                        #{order.order_number_short ?? order.order_number}
                                    </Link>
                                    <p className="text-xs text-gray">
                                        {(order.placed_at || order.created_at)
                                            ? new Date(order.placed_at || order.created_at).toLocaleDateString('en-GB')
                                             : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray">
                                        {order.status_label ?? order.status}
                                    </span>
                                    <span className="font-semibold">
                                        {formatCurrency(order.totals?.total ?? 0)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

const Stat = ({ label, value, href }) => (
    <Link
        href={href}
        className="rounded-md border border-light-white p-4 transition-colors hover:border-primary"
    >
        <p className="text-sm text-gray">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-dark">{value}</p>
    </Link>
);
