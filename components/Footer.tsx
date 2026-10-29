// components/Footer.tsx
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
import ShieldIconMD from '@/components/Icons/ShieldIconMD';
import ShippedIconMD from '@/components/Icons/ShippedIconMD';
import ReturnMoneyIconMD from '@/components/Icons/ReturnMoneyIconMD';
import { MenuItem } from '@/types/storefront';

export default function Footer(): React.JSX.Element {
    const { getSetting, getFooterMenus } = useStorefront();

    const col1Menus: MenuItem[] = getFooterMenus(1);
    const col2Menus: MenuItem[] = getFooterMenus(2);
    const col3Menus: MenuItem[] = getFooterMenus(3);

    const address: string = getSetting('contact_address', 'Dhaka, Bangladesh');
    const phone: string = getSetting('contact_phone', '01872306498');
    const email: string = getSetting('contact_email', 'beauty.queenbd003@gmail.com');
    const copyright: string = getSetting('copyright_text', `© ${new Date().getFullYear()} King Queen. All Rights Reserved.`);
    const footerAbout: string = getSetting(
        'footer_about',
        'King Queen is an online fashion and lifestyle store in Bangladesh offering curated clothing, fashion essentials, and beauty products crafted for everyday comfort and modern style.'
    );

    const fbUrl: string = getSetting('social_facebook', 'https://facebook.com');
    const ytUrl: string = getSetting('social_youtube', 'https://youtube.com');
    const igUrl: string = getSetting('social_instagram', 'https://instagram.com');
    const ttUrl: string = getSetting('social_tiktok', 'https://tiktok.com');

    const shopLinks: { title: string; url: string; open_new_tab?: boolean }[] =
        col1Menus && col1Menus.length >= 5
            ? col1Menus
            : [
                  { title: 'All Products', url: '/catalog' },
                  { title: 'Best Deals & Offers', url: '/catalog?sort=discount' },
                  { title: 'New Arrivals', url: '/catalog?sort=newest' },
                  { title: 'Dress & Apparel', url: '/catalog?category=casual-dresses' },
                  { title: 'Makeup Collection', url: '/catalog?category=lipsticks' },
                  { title: 'Skincare Essentials', url: '/catalog?category=cleansers-toners' },
              ];

    const careLinks: { title: string; url: string; open_new_tab?: boolean }[] =
        col2Menus && col2Menus.length >= 5
            ? col2Menus
            : [
                  { title: 'My Account', url: '/dashboard' },
                  { title: 'Order Tracking', url: '/dashboard?section=tracking' },
                  { title: 'Shopping Cart', url: '/cart' },
                  { title: 'My Wishlist', url: '/dashboard?section=wishlist' },
                  { title: 'Customer Login', url: '/login' },
                  { title: 'Create Account', url: '/register' },
              ];

    const policyLinks: { title: string; url: string; open_new_tab?: boolean }[] =
        col3Menus && col3Menus.length >= 5
            ? col3Menus
            : [
                  { title: 'About King Queen', url: '/about-us' },
                  { title: 'Contact Support', url: '/contact-us' },
                  { title: 'Privacy Policy', url: '/privacy-policy' },
                  { title: 'Terms & Conditions', url: '/terms-conditions' },
                  { title: 'Return & Refund Policy', url: '/return-refund' },
              ];

    return (
        <footer className="kq-footer">
            {/* Top Support & Assistance Strip */}
            <div className="kq-footer-cta">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
                    <div className="kq-footer-cta__inner">
                        <div className="kq-footer-cta__left">
                            <span className="kq-footer-cta__badge" aria-hidden="true">
                                <RedPhoneCallIconMD className="w-5 h-5" />
                            </span>
                            <div>
                                <h2 className="kq-footer-cta__title">Need help with your order or product selection?</h2>
                                <p className="kq-footer-cta__sub">
                                    Our dedicated support team is available daily from 10:00 AM – 10:00 PM
                                </p>
                            </div>
                        </div>
                        <div className="kq-footer-cta__actions">
                            <a
                                href={`tel:${phone.replace(/\s+/g, '')}`}
                                className="kq-footer-cta__btn-primary"
                            >
                                <RedPhoneCallIconMD className="w-4 h-4" />
                                <span>Call {phone}</span>
                            </a>
                            <Link href="/contact-us" className="kq-footer-cta__btn-outline">
                                <RedEmailIconMD className="w-4 h-4 text-primary" />
                                <span>Contact Us</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Footer Links & Store Info */}
            <div className="kq-footer-body">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
                    <div className="footer-main-grid">
                        {/* Column 1: Brand & Contact Info */}
                        <div className="kq-footer__brand-col">
                            <Link href="/" className="kq-footer__logo-wrap" aria-label="King Queen Home">
                                <img
                                    src="/resources/images/logo.png"
                                    alt="King Queen"
                                    className="h-10 w-auto object-contain"
                                    loading="lazy"
                                />
                            </Link>
                            <p className="kq-footer__about">{footerAbout}</p>

                            <div className="kq-footer__contact-list">
                                <div className="kq-footer__contact-item">
                                    <span className="kq-footer__contact-icon">
                                        <RedLocationIconMD className="w-4 h-4" />
                                    </span>
                                    <div>
                                        <span className="kq-footer__contact-label">Store Location</span>
                                        <address className="kq-footer__contact-val not-italic">
                                            {address}
                                        </address>
                                    </div>
                                </div>

                                <div className="kq-footer__contact-item">
                                    <span className="kq-footer__contact-icon">
                                        <RedPhoneCallIconMD className="w-4 h-4" />
                                    </span>
                                    <div>
                                        <span className="kq-footer__contact-label">Customer Hotline</span>
                                        <a
                                            className="kq-footer__contact-val"
                                            href={`tel:${phone.replace(/\s+/g, '')}`}
                                        >
                                            {phone}
                                        </a>
                                    </div>
                                </div>

                                <div className="kq-footer__contact-item">
                                    <span className="kq-footer__contact-icon">
                                        <RedEmailIconMD className="w-4 h-4" />
                                    </span>
                                    <div>
                                        <span className="kq-footer__contact-label">Email Support</span>
                                        <a className="kq-footer__contact-val" href={`mailto:${email}`}>
                                            {email}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Quick Shop */}
                        <div>
                            <h3 className="kq-footer__heading">Quick Shop</h3>
                            <ul className="kq-footer__links">
                                {shopLinks.map((item, idx) => (
                                    <li key={`${item.url}-${idx}`}>
                                        <Link
                                            href={item.url}
                                            className="kq-footer__link"
                                            target={item.open_new_tab ? '_blank' : undefined}
                                            rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 3: Customer Care */}
                        <div>
                            <h3 className="kq-footer__heading">Customer Care</h3>
                            <ul className="kq-footer__links">
                                {careLinks.map((item, idx) => (
                                    <li key={`${item.url}-${idx}`}>
                                        <Link
                                            href={item.url}
                                            className="kq-footer__link"
                                            target={item.open_new_tab ? '_blank' : undefined}
                                            rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 4: Help & Policies */}
                        <div>
                            <h3 className="kq-footer__heading">Help & Policies</h3>
                            <ul className="kq-footer__links">
                                {policyLinks.map((item, idx) => (
                                    <li key={`${item.url}-${idx}`}>
                                        <Link
                                            href={item.url}
                                            className="kq-footer__link"
                                            target={item.open_new_tab ? '_blank' : undefined}
                                            rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 5: Social & Payment Security */}
                        <div className="kq-footer__connect-col">
                            <div className="kq-footer__social-block">
                                <h3 className="kq-footer__heading">Connect With Us</h3>
                                <p className="kq-footer__social-desc">
                                    Follow us for new arrivals, styling tips, and exclusive offers.
                                </p>
                                <div className="kq-footer__social-list">
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

                            {/* Payment Guarantee Card */}
                            <div className="kq-footer__payment-card">
                                <h4 className="kq-footer__payment-title">
                                    <ShieldIconMD className="w-4 h-4 text-primary" />
                                    <span>Guaranteed Safe Checkout</span>
                                </h4>
                                <div className="kq-footer__payment-badges">
                                    <span className="kq-footer__payment-pill" title="bKash Available">
                                        <img src="/resources/media/payment_bkash.png" alt="bKash" />
                                    </span>
                                    <span className="kq-footer__payment-pill" title="Cash on Delivery">
                                        <img src="/resources/media/payment_cod.png" alt="Cash on Delivery" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Sub-Footer Bar */}
            <div className="footer-bottom-bar">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 kq-footer__bottom-inner">
                    <p className="kq-footer__copyright">
                        {copyright}
                    </p>
                    <div className="kq-footer__trust-pills">
                        <span className="kq-footer__trust-pill">
                            <ShieldIconMD className="kq-footer__trust-icon text-primary" />
                            <span>100% Authentic Products</span>
                        </span>
                        <span className="kq-footer__trust-dot" aria-hidden="true">•</span>
                        <span className="kq-footer__trust-pill">
                            <ShippedIconMD className="kq-footer__trust-icon text-primary" />
                            <span>Fast Nationwide Delivery</span>
                        </span>
                        <span className="kq-footer__trust-dot" aria-hidden="true">•</span>
                        <span className="kq-footer__trust-pill">
                            <ReturnMoneyIconMD className="kq-footer__trust-icon text-primary" />
                            <span>Easy 7-Day Returns</span>
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
