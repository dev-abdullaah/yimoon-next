// app/ConditionalLayout.jsx
'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import BackToTop from '@/components/BackToTop';

import DynamicTheme from '@/components/DynamicTheme';

const noHeaderFooterRoutes = ['/login', '/register', '/forgot-password'];

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  
  // Check if current route should show header and footer
  const showHeaderFooter = !noHeaderFooterRoutes.some(route => pathname.startsWith(route));
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