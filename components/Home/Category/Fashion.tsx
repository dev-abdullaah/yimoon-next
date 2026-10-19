// components/Home/Category/Fashion.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { useStorefront } from '@/hooks/useStorefront';
import { getCategoryImageUrl, getBannerImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl, normalizeBannerUrl } from '@/utils/urlHelper';
import type { CategoryNode } from '@/lib/categoryTree';
import type { StorefrontBanner } from '@/types/storefront';

/**
 * Two large promotional category banners side by side, 3:2 editorial ratio.
 * Fully manageable from the Snapkart Storefront Backend.
 */
const Fashion = () => {
    const { tree, isLoading: categoriesLoading } = useCategories();
    const { getBanner, isLoading: storefrontLoading, isSectionActive } = useStorefront();

    if (!isSectionActive('fashion_banners')) {
        return null;
    }

    if (categoriesLoading && storefrontLoading) {
        return (
            <div className="hp-editorial">
                <div className="hp-skel" style={{ height: 320 }} />
                <div className="hp-skel" style={{ height: 320 }} />
            </div>
        );
    }

    const bannerLeft = getBanner('fashion_left');
    const bannerRight = getBanner('fashion_right');

    if (bannerLeft?.is_active && bannerRight?.is_active && bannerLeft.image && bannerRight.image) {
        return (
            <section className="hp-editorial" aria-label="Featured Collections">
                <EditorialBanner banner={bannerLeft} />
                <EditorialBanner banner={bannerRight} />
            </section>
        );
    }

    const [first, second] = pickBanners(tree);
    if (!first || !second) return null;

    return (
        <section className="hp-editorial" aria-label="Featured Collections">
            <CategoryEditorial category={first} />
            <CategoryEditorial category={second} />
        </section>
    );
};

function EditorialBanner({ banner }: { banner: StorefrontBanner | any }) {
    const href = normalizeBannerUrl(banner.link_url || '/catalog');
    const imageSrc = banner.image ? getBannerImageUrl(banner.image) : PLACEHOLDER_IMAGE;

    return (
        <Link href={href} className="hp-promo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={imageSrc}
                alt={banner.title || 'Promotional Banner'}
                loading="lazy"
                onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
            />
            <div className="hp-promo__shade" />
            <div className="hp-promo__content">
                {banner.subtitle && <span className="hp-promo__kicker">{banner.subtitle}</span>}
                <h3 className="hp-promo__title">{banner.title}</h3>
                <span className="hp-promo__cta">
                    {banner.button_text || 'Explore Collection'} →
                </span>
            </div>
        </Link>
    );
}

function CategoryEditorial({ category }: { category: CategoryNode | any }) {
    return (
        <Link href={getCategoryRelativeUrl(category)} className="hp-promo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={getCategoryImageUrl(category.image)}
                alt={category.name}
                loading="lazy"
                onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
            />
            <div className="hp-promo__shade" />
            <div className="hp-promo__content">
                <span className="hp-promo__kicker">Curated Collection</span>
                <h3 className="hp-promo__title">{category.name}</h3>
                <span className="hp-promo__cta">Shop Now →</span>
            </div>
        </Link>
    );
}

function pickBanners(tree: CategoryNode[]) {
    const parented = tree.flatMap((category) => category.children ?? []);

    return [parented[0] ?? tree[0], parented[1] ?? tree[1]].filter(
        (category) => category?.image
    );
}

export default Fashion;
