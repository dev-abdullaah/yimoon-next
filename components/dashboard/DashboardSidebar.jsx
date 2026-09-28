// components/dashboard/DashboardSidebar.jsx
'use client';

import GridIcon from '@/components/Icons/GridIcon';
import PersonMdIcon from '@/components/Icons/PersonMdIcon';
import OrderMdIcon from '@/components/Icons/OrderMdIcon';
import AddressMdIcon from '@/components/Icons/AddressMdIcon';
import WishListLgIcon from '@/components/Icons/WishListLgIcon';
import CouponLgIcon from '@/components/Icons/CouponLgIcon';
import OrderTrackingLgIcon from '@/components/Icons/OrderTrackingLgIcon';
import ShieldMdIcon from '@/components/Icons/ShieldMdIcon';

/**
 * The dashboard's section switcher.
 *
 * Sections are query parameters rather than routes so the whole dashboard is
 * one page: switching section does not tear down and re-render the shell, and
 * `?section=orders` is a link a shopper can bookmark or share.
 */
const SECTIONS = [
    { key: 'dashboard', label: 'Dashboard', icon: GridIcon },
    { key: 'orders', label: 'My Orders', icon: OrderMdIcon },
    { key: 'profile', label: 'Profile', icon: PersonMdIcon },
    { key: 'devices', label: 'Devices', icon: ShieldMdIcon },
    { key: 'addresses', label: 'Addresses', icon: AddressMdIcon },
    { key: 'wishlist', label: 'Wishlist', icon: WishListLgIcon },
    { key: 'loyalty', label: 'Rewards', icon: CouponLgIcon },
    { key: 'tracking', label: 'Track Order', icon: OrderTrackingLgIcon },
];

export { SECTIONS };

export default function DashboardSidebar({ activeSection, onSelect, className = '' }) {
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
