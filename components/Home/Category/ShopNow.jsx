// components/Home/Category/ShopNow.jsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useStorefront } from '@/hooks/useStorefront';
import { normalizeBannerUrl } from '@/utils/urlHelper';
import CountdownTimer from '@/components/CountdownTimer';

const ShopNow = () => {
    const { getBanner, isSectionActive, getSetting } = useStorefront();

    if (!isSectionActive('shop_now_strip')) {
        return null;
    }

    const banner = getBanner('shop_now_strip');
    const title = banner?.title || '30% Sale!';
    const subtitle = banner?.subtitle || 'Enjoy 30% Discount on selected beauty essentials!';
    const buttonText = banner?.button_text || 'SHOP NOW';
    const linkUrl = normalizeBannerUrl(banner?.link_url || '/catalog?sort=discount');
    const bgColor = banner?.bg_color || 'var(--color-primary, #C20000)';

    const countdownEnabled = getSetting('countdown_enabled', '0') === '1';
    const countdownTitle = getSetting('countdown_title', '⚡ Flash Deal Ends In:');
    const countdownTarget = getSetting('countdown_target', '');

    return (
        <section
            className="hp-strip"
            style={{ backgroundColor: bgColor }}
            aria-label={title}
        >
            <div className="hp-strip__main">
                <div>
                    <h3 className="hp-strip__title">{title}</h3>
                    <p className="hp-strip__sub">{subtitle}</p>
                </div>

                {countdownEnabled && countdownTarget && (
                    <div style={{ marginLeft: 'auto' }}>
                        <CountdownTimer targetDate={countdownTarget} title={countdownTitle} />
                    </div>
                )}
            </div>

            <Link
                href={linkUrl}
                className="hp-strip__cta"
                aria-label={buttonText}
            >
                {buttonText} →
            </Link>
        </section>
    );
};

export default ShopNow;