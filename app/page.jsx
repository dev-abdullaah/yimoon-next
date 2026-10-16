// app/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import Hero from '@/components/Home/Category/Hero';
import TrustBar from '@/components/Home/TrustBar';
import ProdCategory from '@/components/Home/Category/ProdCategory';
import BestDeals from '@/components/Home/Products/BestDeals';
import Fashion from '@/components/Home/Category/Fashion';
import FeaturedCategories from '@/components/Home/Category/FeaturedCategories';
import NewCollection from '@/components/Home/Products/NewCollection';
import PickedForYou from '@/components/Home/Products/PickedForYou';
import ShopNow from '@/components/Home/Category/ShopNow';
import Trending from '@/components/Home/Products/Trending';
import ExtraDiscount from '@/components/Home/Products/ExtraDiscount';
import Offers from '@/components/Home/Category/Offers';
import { useStorefront } from '@/hooks/useStorefront';
import { hasClaimedDiscount, isModalDismissed } from '@/utils/cryptoHelper';

const SECTION_COMPONENTS = {
    hero: Hero,
    categories: ProdCategory,
    best_deals: BestDeals,
    fashion_banners: Fashion,
    featured_categories: FeaturedCategories,
    new_collection: NewCollection,
    picked_for_you: PickedForYou,
    shop_now_strip: ShopNow,
    trending: Trending,
    extra_discount: ExtraDiscount,
    offers_budget: Offers,
};

const DEFAULT_SECTION_KEYS = [
    'hero',
    'categories',
    'best_deals',
    'fashion_banners',
    'new_collection',
    'featured_categories',
    'picked_for_you',
    'shop_now_strip',
    'trending',
    'extra_discount',
    'offers_budget',
];

export default function HomePage() {
    const [showSpinner, setShowSpinner] = useState(false);
    const { sections, getSetting, isLoading } = useStorefront();

    const spinnerEnabled = !isLoading && getSetting('spinner_enabled', '0') === '1';

    useEffect(() => {
        if (!spinnerEnabled) return;
        if (typeof window !== 'undefined' && window.location.search.includes('nospinner')) return;

        // Check if user has already claimed a discount or dismissed the modal
        const alreadyClaimed = hasClaimedDiscount();
        const alreadyDismissed = isModalDismissed();

        if (!alreadyClaimed && !alreadyDismissed) {
            setShowSpinner(true);
        }
    }, [spinnerEnabled]);

    const handleSpinnerClose = () => {
        setShowSpinner(false);
    };

    // Use dynamic backend section ordering and visibility if loaded
    const activeSectionKeys = sections.length > 0
        ? sections.filter((s) => s.is_active && SECTION_COMPONENTS[s.key]).map((s) => s.key)
        : DEFAULT_SECTION_KEYS;

    return (
        <>
            {/* Show spinner only if enabled in backend, not claimed, and not dismissed */}
            {spinnerEnabled && showSpinner && <Spinner onClose={handleSpinnerClose} />}

            <main className="hp container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-6">
                <div className="hp-stack">
                    {activeSectionKeys.map((key) => {
                        const Component = SECTION_COMPONENTS[key];
                        if (!Component) return null;

                        if (key === 'hero') {
                            return (
                                <div key={key} className="space-y-4 md:space-y-6">
                                    <Component />
                                    <TrustBar />
                                </div>
                            );
                        }

                        return <Component key={key} />;
                    })}
                </div>
            </main>
        </>
    );
}