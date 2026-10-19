// app/ConditionalLayout.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import BackToTop from '@/components/BackToTop';
import DynamicTheme from '@/components/DynamicTheme';

const noHeaderFooterRoutes = ['/login', '/register', '/forgot-password'];

export interface ConditionalLayoutProps {
    children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
    const pathname = usePathname();

    // Check if current route should show header and footer
    const showHeaderFooter = !noHeaderFooterRoutes.some((route) => pathname.startsWith(route));
    const showMobileNav = showHeaderFooter && !pathname.startsWith('/checkout');

    return (
        <>
            <DynamicTheme />
            {showHeaderFooter && <Header />}
            {showMobileNav && <MobileNav />}

            {children}

            {showHeaderFooter && <Footer />}
            {showHeaderFooter && <BackToTop />}
        </>
    );
}
