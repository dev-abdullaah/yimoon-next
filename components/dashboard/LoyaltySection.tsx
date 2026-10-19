// components/dashboard/LoyaltySection.tsx
'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { loyaltyApi, formatCurrency } from '@/lib/api';
import { LoyaltyBalance, LoyaltyReferral, LoyaltyTransaction } from '@/types/account';

/**
 * The shopper's reward points and referral link.
 *
 * The point-to-money rate and the redemption floor both come from the API
 * rather than being repeated here. A hard-coded rate would drift from the one
 * the server actually honours, so the balance on this page would promise a
 * discount the checkout would not apply.
 */
export default function LoyaltySection() {
    const balanceQuery = useQuery({
        queryKey: ['loyalty', 'balance'],
        queryFn: () => loyaltyApi.getBalance(),
    });

    const historyQuery = useQuery({
        queryKey: ['loyalty', 'history'],
        queryFn: () => loyaltyApi.getHistory(),
    });

    const referralsQuery = useQuery({
        queryKey: ['loyalty', 'referrals'],
        queryFn: () => loyaltyApi.getReferrals(),
    });

    const balance: LoyaltyBalance | null = balanceQuery.data?.data ?? null;
    const transactions: LoyaltyTransaction[] = historyQuery.data?.data?.transactions ?? [];
    const referrals: LoyaltyReferral[] = referralsQuery.data?.data?.referrals ?? [];

    const copyReferralLink = async () => {
        if (!balance?.referral_link) return;

        try {
            await navigator.clipboard.writeText(balance.referral_link);
            toast.success('Referral link copied.');
        } catch {
            // Clipboard access is refused in some contexts (an insecure origin,
            // or a permission the shopper declined). Selecting the text is a
            // working fallback where a silent failure would not be.
            toast('Copy the link from the box below.', { icon: '📋' });
        }
    };

    if (balanceQuery.isLoading) {
        return <div className="h-64 w-full animate-pulse rounded-md bg-slate-200" />;
    }

    return (
        <div>
            <h1 className="text-dark text-xl font-semibold">Rewards</h1>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-light-white p-4">
                    <p className="text-sm text-gray">Points balance</p>
                    <p className="mt-1 text-2xl font-semibold text-dark">
                        {balance?.loyalty_points ?? 0}
                    </p>
                    <p className="text-xs text-gray">
                        worth {formatCurrency(balance?.bdt_value ?? 0)}
                    </p>
                </div>

                <div className="rounded-md border border-light-white p-4">
                    <p className="text-sm text-gray">Minimum to redeem</p>
                    <p className="mt-1 text-2xl font-semibold text-dark">
                        {balance?.min_redemption_points ?? 0}
                    </p>
                    <p className="text-xs text-gray">
                        {balance?.can_redeem
                            ? 'You can apply these to an order.'
                            : 'Keep shopping to reach this.'}
                    </p>
                </div>

                <div className="rounded-md border border-light-white p-4">
                    <p className="text-sm text-gray">Referral code</p>
                    <p className="mt-1 text-2xl font-semibold text-dark">
                        {balance?.referral_code ?? '—'}
                    </p>
                    <button
                        type="button"
                        onClick={copyReferralLink}
                        className="text-primary mt-2 text-sm font-medium hover:underline"
                    >
                        Copy your referral link
                    </button>
                </div>
            </div>

            {balance?.referral_link && (
                <label className="mt-4 block">
                    <span className="block text-sm font-medium text-gray mb-1">
                        Share this link
                    </span>
                    <input
                        type="text"
                        readOnly
                        value={balance.referral_link}
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                        className="w-full rounded-md border border-light-ash px-3 py-2 text-sm outline-0"
                    />
                </label>
            )}

            <section className="mt-8">
                <h2 className="text-dark font-semibold mb-2">Recent activity</h2>

                {transactions.length === 0 ? (
                    <p className="text-gray">No points earned or spent yet.</p>
                ) : (
                    <ul className="divide-y divide-light-white">
                        {transactions.map((tx) => (
                            <li key={tx.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                <div>
                                    <p className="text-dark text-sm font-medium">
                                        {tx.type_label ?? tx.type}
                                    </p>
                                    {tx.description && <p className="text-xs text-gray">{tx.description}</p>}
                                    {tx.order_number && (
                                        <p className="text-xs text-gray">Order #{tx.order_number}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    {/* Earned is positive, spent is negative; the
                                        sign is carried by the value itself. */}
                                    <p
                                        className={`font-semibold ${
                                            tx.points >= 0 ? 'text-success' : 'text-danger'
                                        }`}
                                    >
                                        {tx.points >= 0 ? '+' : ''}
                                        {tx.points}
                                    </p>
                                    <p className="text-xs text-gray">
                                        balance {tx.balance_after}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="mt-8">
                <h2 className="text-dark font-semibold mb-2">People you referred</h2>

                {referrals.length === 0 ? (
                    <p className="text-gray">
                        Nobody yet. Share your link to start earning.
                    </p>
                ) : (
                    <ul className="divide-y divide-light-white">
                        {referrals.map((referral) => (
                            <li key={referral.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                <div>
                                    <p className="text-dark text-sm font-medium">
                                        {referral.referred_name}
                                    </p>
                                    {referral.referred_email && <p className="text-xs text-gray">{referral.referred_email}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm capitalize text-gray">{referral.status}</p>
                                    {referral.completed_order && (
                                        <p className="text-xs text-gray">
                                            Order #{referral.completed_order}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
