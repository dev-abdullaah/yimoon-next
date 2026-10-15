// components/Footer.jsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useStorefront } from '@/hooks/useStorefront';
import RedLocationIcon from '@/components/Icons/RedLocationIcon';
import RedPhoneCallIcon from '@/components/Icons/RedPhoneCallIcon';
import RedEmailIcon from '@/components/Icons/RedEmailIcon';
import FacebookIcon from '@/components/Icons/FacebookIcon';
import LinkedInIcon from '@/components/Icons/LinkedIcon';
import YoutubeIcon from '@/components/Icons/YoutubeIcon';
import InstagramIcon from '@/components/Icons/InstagramIcon';
import TiktokIcon from '@/components/Icons/TiktokIcon';
import XIcon from '@/components/Icons/XIcon';

function Footer() {
    const { getSetting, getFooterMenus } = useStorefront();
    const col1Menus = getFooterMenus(1);
    const col2Menus = getFooterMenus(2);
    const col3Menus = getFooterMenus(3);

    const address = getSetting('contact_address', 'Plot #18, Road #6, Block #H, Uttara #17, Dhaka-1230, Bangladesh');
    const phone = getSetting('contact_phone', '+88-01763-638847');
    const email = getSetting('contact_email', 'info@yi-moon.com');
    const copyright = getSetting('copyright_text', `© ${new Date().getFullYear()} SnapKart Ltd. All Rights Reserved.`);
    const footerAbout = getSetting('footer_about', 'Your premier destination for authentic cosmetics and skincare in Bangladesh.');

    const fbUrl = getSetting('social_facebook', 'https://facebook.com');
    const inUrl = getSetting('social_linkedin', 'https://linkedin.com');
    const ytUrl = getSetting('social_youtube', 'https://youtube.com');
    const igUrl = getSetting('social_instagram', 'https://instagram.com');
    const ttUrl = getSetting('social_tiktok', 'https://tiktok.com');
    const xUrl = getSetting('social_x', 'https://x.com');

    return (
        <footer className="container mx-auto px-5 md:px-7 lg:px-14">
            <div className="grid gap-5 py-5 xl:grid-cols-3">
                <div className="col-span-full xl:col-span-1">
                    <h3 className="mb-2 text-base font-semibold sm:mb-3">Contact Us</h3>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <RedLocationIcon />
                            <address className="text-sm text-[#6b6867] not-italic whitespace-pre-line">
                                {address}
                            </address>
                        </div>
                        <div className="flex items-center gap-2">
                            <RedPhoneCallIcon />
                            <a className="text-gray hover:text-primary" href={`tel:${phone.replace(/\s+/g, '')}`}>
                                {phone}
                            </a>
                        </div>
                        <div className="flex items-center gap-2">
                            <RedEmailIcon />
                            <a className="text-gray hover:text-primary" href={`mailto:${email}`}>
                                {email}
                            </a>
                        </div>
                        {footerAbout && (
                            <p className="text-xs text-muted-foreground pt-2 text-[#8c8886]">
                                {footerAbout}
                            </p>
                        )}
                    </div>
                </div>
                <div className="col-span-full grid grid-cols-2 justify-between gap-5 lg:flex xl:col-span-2">
                    <div className="col-span-1">
                        <h3 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">Company</h3>
                        {col1Menus && col1Menus.length > 0 ? (
                            col1Menus.map((item) => (
                                <Link
                                    key={item.id}
                                    className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary"
                                    href={item.url}
                                    target={item.open_new_tab ? '_blank' : undefined}
                                    rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                >
                                    {item.title}
                                </Link>
                            ))
                        ) : (
                            <>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/about-us">
                                    About Us
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/contact-us">
                                    Contact Us
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/catalog">
                                    All Products
                                </Link>
                            </>
                        )}
                    </div>
                    <div className="col-span-1">
                        <h3 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">Customer</h3>
                        {col2Menus && col2Menus.length > 0 ? (
                            col2Menus.map((item) => (
                                <Link
                                    key={item.id}
                                    className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary"
                                    href={item.url}
                                    target={item.open_new_tab ? '_blank' : undefined}
                                    rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                >
                                    {item.title}
                                </Link>
                            ))
                        ) : (
                            <>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/login">
                                    Login
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/register">
                                    Register
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/catalog?sort=discount">
                                    Best Deals
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/catalog?sort=newest">
                                    New Arrivals
                                </Link>
                            </>
                        )}
                    </div>
                    <div className="col-span-1">
                        <h3 className="mt-1 mb-2 text-sm font-semibold sm:mt-0 sm:mb-3 sm:text-base">Help & Policies</h3>
                        {col3Menus && col3Menus.length > 0 ? (
                            col3Menus.map((item) => (
                                <Link
                                    key={item.id}
                                    className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary"
                                    href={item.url}
                                    target={item.open_new_tab ? '_blank' : undefined}
                                    rel={item.open_new_tab ? 'noopener noreferrer' : undefined}
                                >
                                    {item.title}
                                </Link>
                            ))
                        ) : (
                            <>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/privacy-policy">
                                    Privacy Policy
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/terms-conditions">
                                    Terms &amp; Conditions
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/return-refund">
                                    Return &amp; Refund Policy
                                </Link>
                                <Link className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary" href="/contact-us">
                                    Customer Support
                                </Link>
                            </>
                        )}
                    </div>
                    <div className="col-span-2 space-y-3 sm:col-span-1 md:space-y-5">
                        <div>
                            <h3 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">Connect With Us</h3>
                            <ul className="mt-2 flex items-center gap-x-2">
                                <li>
                                    <a aria-label="Facebook" href={fbUrl} target="_blank" rel="noopener noreferrer">
                                        <FacebookIcon />
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Linkedin" href={inUrl} target="_blank" rel="noopener noreferrer">
                                        <LinkedInIcon />
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Youtube" href={ytUrl} target="_blank" rel="noopener noreferrer">
                                        <YoutubeIcon />
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Instagram" href={igUrl} target="_blank" rel="noopener noreferrer">
                                        <InstagramIcon/>
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Tiktok" href={ttUrl} target="_blank" rel="noopener noreferrer">
                                        <TiktokIcon/>
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="X Twitter" href={xUrl} target="_blank" rel="noopener noreferrer">
                                        <XIcon/>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div className="border-light-white border-t-2 pt-3.5 pb-20 text-center text-sm font-medium xl:pt-4 xl:pb-4 xl:text-base text-[#6b6867]">
                {copyright}
            </div>
        </footer>
    );
}

export default Footer;