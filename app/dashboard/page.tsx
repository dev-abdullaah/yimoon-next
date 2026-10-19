// app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHome from '@/components/dashboard/DashboardHome';
import ProfileSection from '@/components/dashboard/ProfileSection';
import DevicesSection from '@/components/dashboard/DevicesSection';
import AddressesSection from '@/components/dashboard/AddressesSection';
import OrdersSection from '@/components/dashboard/OrdersSection';
import WishlistSection from '@/components/dashboard/WishlistSection';
import LoyaltySection from '@/components/dashboard/LoyaltySection';
import TrackingSection from '@/components/dashboard/TrackingSection';
import { DashboardSectionKey } from '@/types/account';

/**
 * The shopper's account area.
 *
 * The active section is a query parameter, not a route segment. The dashboard is
 * a handful of panels over the same shell, so a route per panel would tear down
 * and re-render the shell on every switch — and would mean seven nearly
 * identical files. A query parameter keeps it to one page, and makes
 * `/dashboard?section=orders` a link a shopper can bookmark or share.
 *
 * This page owns no data. Every panel fetches its own, so switching between
 * them never shows the previous panel's figures under the new heading.
 */

const SECTION_COMPONENTS: Record<DashboardSectionKey, React.ComponentType> = {
    dashboard: DashboardHome,
    orders: OrdersSection,
    profile: ProfileSection,
    devices: DevicesSection,
    addresses: AddressesSection,
    wishlist: WishlistSection,
    loyalty: LoyaltySection,
    tracking: TrackingSection,
};

export default function DashboardPage() {
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const requested = searchParams.get('section') as DashboardSectionKey | null;
    // An unknown section falls back to the overview rather than rendering a
    // blank page — a stale or hand-edited link should still land somewhere.
    const active: DashboardSectionKey = requested && SECTION_COMPONENTS[requested] ? requested : 'dashboard';

    const Panel = SECTION_COMPONENTS[active];

    // Sent away before the session is known, and never back again: bouncing a
    // signed-in shopper to sign in is confusing, and re-running the redirect
    // after they log in elsewhere would trap them on /login.
    // Tracking is also open to guests.
    useEffect(() => {
        if (!loading && !isAuthenticated && active !== 'tracking') {
            const redirectUrl = typeof window !== 'undefined'
                ? `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
                : '/login?redirect=/dashboard';
            router.replace(redirectUrl);
        }
    }, [loading, isAuthenticated, active, router]);

    const selectSection = (key: string) => {
        router.push(key === 'dashboard' ? '/dashboard' : `/dashboard?section=${key}`);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-5 py-10 md:px-7 lg:px-12">
                <div className="h-64 w-full animate-pulse rounded-md bg-slate-200" />
            </div>
        );
    }

    if (!isAuthenticated && active !== 'tracking') return null;

    return (
        <main className="container mx-auto px-5 py-6 md:px-7 lg:px-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-dark text-2xl font-semibold">
                        Hello{user?.name ? `, ${user.name}` : ''}
                    </h1>
                    <p className="text-gray text-sm">
                        Manage your orders, addresses and rewards.
                    </p>
                </div>
                <Link
                    href="/catalog"
                    className="bg-primary hover:bg-dark-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                    Continue shopping
                </Link>
            </div>

            <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-8">
                <aside className="md:w-60 md:shrink-0">
                    <DashboardSidebar
                        activeSection={active}
                        onSelect={selectSection}
                        className="md:sticky md:top-24"
                    />
                </aside>

                <div className="min-w-0 flex-1">
                    <Panel />
                </div>
            </div>
        </main>
    );
}
