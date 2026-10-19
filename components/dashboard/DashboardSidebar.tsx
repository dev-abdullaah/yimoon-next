// components/dashboard/DashboardSidebar.tsx
'use client';

import React from 'react';
import GridIconMD from '@/components/Icons/GridIconMD';
import PersonIconMD from '@/components/Icons/PersonIconMD';
import OrderIconMD from '@/components/Icons/OrderIconMD';
import AddressIconMD from '@/components/Icons/AddressIconMD';
import WishListIconLG from '@/components/Icons/WishListIconLG';
import CouponIconLG from '@/components/Icons/CouponIconLG';
import OrderTrackingIconLG from '@/components/Icons/OrderTrackingIconLG';
import ShieldIconMD from '@/components/Icons/ShieldIconMD';
import { DashboardSectionKey } from '@/types/account';

export interface SectionItem {
    key: DashboardSectionKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

/**
 * The dashboard's section switcher.
 *
 * Sections are query parameters rather than routes so the whole dashboard is
 * one page: switching section does not tear down and re-render the shell, and
 * `?section=orders` is a link a shopper can bookmark or share.
 */
const SECTIONS: SectionItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: GridIconMD },
    { key: 'orders', label: 'My Orders', icon: OrderIconMD },
    { key: 'tracking', label: 'Order Tracking', icon: OrderTrackingIconLG },
    { key: 'profile', label: 'Account Info', icon: PersonIconMD },
    { key: 'addresses', label: 'Addresses', icon: AddressIconMD },
    { key: 'wishlist', label: 'Wishlist', icon: WishListIconLG },
    { key: 'loyalty', label: 'Rewards', icon: CouponIconLG },
    { key: 'devices', label: 'Devices', icon: ShieldIconMD },
];

export { SECTIONS };

export interface DashboardSidebarProps {
    activeSection: string;
    onSelect: (key: string) => void;
    className?: string;
}

export default function DashboardSidebar({ activeSection, onSelect, className = '' }: DashboardSidebarProps) {
    return (
        <nav aria-label="Account sections" className={className}>
            <ul className="space-y-1">
                {SECTIONS.map(({ key, label, icon: Icon }) => (
                    <li key={key}>
                        <button
                            type="button"
                            onClick={() => onSelect(key)}
                            aria-current={activeSection === key ? 'page' : undefined}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                                activeSection === key
                                    ? 'bg-primary text-white'
                                    : 'text-gray hover:bg-slate-100 hover:text-dark'
                            }`}
                        >
                            <Icon />
                            {label}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
