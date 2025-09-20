// app/ConditionalLayout.jsx
'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import BackToTop from '@/components/BackToTop';

const noHeaderFooterRoutes = ['/login', '/register', '/forgot-password'];

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  
  // Check if current route should show header and footer
  const showHeaderFooter = !noHeaderFooterRoutes.some(route => pathname.startsWith(route));

  return (
    <>
      {showHeaderFooter && <Header />}
      {showHeaderFooter && <MobileNav />}
      
      {children}
      
      {showHeaderFooter && <Footer />}
      {showHeaderFooter && <BackToTop />}
    </>
  );
}