// components/Footer.jsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useStorefront } from '@/hooks/useStorefront';
import RedLocationIconMD from '@/components/Icons/RedLocationIconMD';
import RedPhoneCallIconMD from '@/components/Icons/RedPhoneCallIconMD';
import RedEmailIconMD from '@/components/Icons/RedEmailIconMD';
import FacebookIconMD from '@/components/Icons/FacebookIconMD';
import YoutubeIconMD from '@/components/Icons/YoutubeIconMD';
import InstagramIconMD from '@/components/Icons/InstagramIconMD';
import TiktokIconMD from '@/components/Icons/TiktokIconMD';

function Footer() {
    const { getSetting, getFooterMenus } = useStorefront();

    const col1Menus = getFooterMenus(1);
    const col2Menus = getFooterMenus(2);
    const col3Menus = getFooterMenus(3);

    const address = getSetting('contact_address', 'Plot #18, Road #6, Block #H, Uttara #17, Dhaka-1230, Bangladesh');
    const phone = getSetting('contact_phone', '+88-01763-638847');
    const email = getSetting('contact_email', 'info@yi-moon.com');
    const copyright = getSetting('copyright_text', `© ${new Date().getFullYear()} Yi Moon. All Rights Reserved.`);
    const footerAbout = getSetting('footer_about', 'Yi Moon is Bangladesh’s trusted mini China store, bringing authentic lifestyle accessories, premium cosmetics, baby care, and curated imports right to your doorstep.');

    const fbUrl = getSetting('social_facebook', 'https://facebook.com');
    const ytUrl = getSetting('social_youtube', 'https://youtube.com');
    const igUrl = getSetting('social_instagram', 'https://instagram.com');
    const ttUrl = getSetting('social_tiktok', 'https://tiktok.com');

    return (
        <footer className="w-full bg-[#F8F9FA] border-t border-gray-200 text-gray-700 transition-colors">

            {/* Main Footer Links & Info */}
            <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 lg:py-14">
                <div className="footer-main-grid">
                    {/* Brand & Store Profile (Column 1) */}
                    <div className="space-y-4">
                        <Link href="/" className="inline-block" aria-label="Yi Moon Home">
                            <img
                                src="/resources/images/logo.png"
                                alt="Yi Moon - A Mini China Store"
                                className="h-10 w-auto object-contain"
                                style={{ borderRadius: 8 }}
                                loading="lazy"
                            />
                        </Link>
                        <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
                            {footerAbout}
                        </p>

                        <div className="pt-2 space-y-2.5 text-sm text-gray-600">
                            <div className="flex items-start gap-2.5">
                                <span className="shrink-0 mt-0.5"><RedLocationIconMD /></span>
                                <address className="not-italic whitespace-pre-line leading-snug">
                                    {address}
                                </address>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="shrink-0"><RedPhoneCallIconMD /></span>
                                <a
                                    className="font-medium text-gray-800 hover:text-primary transition-colors"
                                    href={`tel:${phone.replace(/\s+/g, '')}`}
                                >
                                    {phone}
                                </a>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="shrink-0"><RedEmailIconMD /></span>
                                <a
                                    className="font-medium text-gray-800 hover:text-primary transition-colors"
                                    href={`mailto:${email}`}
                                >
                                    {email}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Quick Shop */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            Shop
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            {col1Menus && col1Menus.length > 0 ? (
                                col1Menus.map((item) => (
                                    <li key={item.id}>
                                        <Link
                                            href={item.url}
                                            className="text-gray-600 hover:text-primary transition-colors block"
                                            target={item.open_new_tab ? '_blank' : undefined}
                                            rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))
                            ) : (
                                <>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/catalog">All Products</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/catalog?sort=newest">New Arrivals</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/catalog?sort=discount">Best Deals</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/catalog?featured=1">Featured Items</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/catalog?category=skincare">Skincare Collection</Link></li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Column 3: Customer Care */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            Customer Care
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            {col2Menus && col2Menus.length > 0 ? (
                                col2Menus.map((item) => (
                                    <li key={item.id}>
                                        <Link
                                            href={item.url}
                                            className="text-gray-600 hover:text-primary transition-colors block"
                                            target={item.open_new_tab ? '_blank' : undefined}
                                            rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))
                            ) : (
                                <>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/dashboard">Order Tracking</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/cart">Shopping Cart</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/dashboard?tab=wishlist">My Wishlist</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/login">Customer Login</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/register">Create Account</Link></li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Column 4: Help & Policies */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            Help & Policies
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            {col3Menus && col3Menus.length > 0 ? (
                                col3Menus.map((item) => (
                                    <li key={item.id}>
                                        <Link
                                            href={item.url}
                                            className="text-gray-600 hover:text-primary transition-colors block"
                                            target={item.open_new_tab ? '_blank' : undefined}
                                            rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))
                            ) : (
                                <>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/privacy-policy">Privacy Policy</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/terms-conditions">Terms & Conditions</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/return-refund">Return & Refund Policy</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/about-us">About Us</Link></li>
                                    <li><Link className="text-gray-600 hover:text-primary transition-colors block" href="/contact-us">Customer Support</Link></li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Column 5: Social & Security */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                                Connect With Us
                            </h3>
                            <div className="flex items-center gap-2.5">
                                <a
                                    aria-label="Facebook"
                                    href={fbUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-social-btn"
                                >
                                    <FacebookIconMD />
                                </a>
                                <a
                                    aria-label="Instagram"
                                    href={igUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-social-btn"
                                >
                                    <InstagramIconMD />
                                </a>
                                <a
                                    aria-label="YouTube"
                                    href={ytUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-social-btn"
                                >
                                    <YoutubeIconMD />
                                </a>
                                <a
                                    aria-label="TikTok"
                                    href={ttUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-social-btn"
                                >
                                    <TiktokIconMD />
                                </a>
                            </div>
                        </div>

                        {/* Payment Guarantee */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
                                Guaranteed Safe Checkout
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-white border border-gray-200 shadow-2xs" title="bKash Available">
                                    <img src="/resources/media/payment_bkash.png" alt="bKash" className="h-4 w-auto object-contain" />
                                </span>
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-white border border-gray-200 shadow-2xs" title="SSLCommerz Gateway">
                                    <img src="/resources/media/payment_sslcommerz.png" alt="SSLCommerz" className="h-4 w-auto object-contain" />
                                </span>
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-white border border-gray-200 shadow-2xs" title="Cash on Delivery">
                                    <img src="/resources/media/payment_cod.png" alt="Cash on Delivery" className="h-4 w-auto object-contain" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Sub-Footer Bar */}
            <div className="footer-bottom-bar px-4 sm:px-6 md:px-8 lg:px-12 text-xs text-gray-500">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
                    <p className="font-medium text-gray-600">
                        {copyright}
                    </p>
                    <div className="flex items-center gap-4 text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            100% Authentic Products
                        </span>
                        <span>•</span>
                        <span>Fast Nationwide Delivery</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;