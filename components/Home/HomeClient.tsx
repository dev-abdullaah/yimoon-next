// components/Home/HomeClient.tsx
'use client';

import React from 'react';
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
import type { StorefrontSection, HeroSlide, HeroTile } from '@/types/storefront';

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
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

interface HomeClientProps {
    initialSections?: StorefrontSection[];
    initialHero?: { slides?: HeroSlide[]; tiles?: HeroTile[] } | null;
}

export default function HomeClient({ initialSections = [], initialHero }: HomeClientProps) {
    const { sections: clientSections } = useStorefront();

    // Use client-fetched sections if available, otherwise server-rendered initialSections
    const sections = clientSections.length > 0 ? clientSections : initialSections;

    // Filter ONLY active sections that exist in our component registry
    const activeSectionKeys = sections
        .filter((s) => s.is_active && SECTION_COMPONENTS[s.key])
        .map((s) => s.key);

    return (
        <main className="hp container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-6">
            <div className="hp-stack">
                {activeSectionKeys.map((key) => {
                    const Component = SECTION_COMPONENTS[key];
                    if (!Component) return null;

                    if (key === 'hero') {
                        return (
                            <div key={key} className="space-y-4 md:space-y-6">
                                <Component initialHero={initialHero} />
                                <TrustBar />
                            </div>
                        );
                    }

                    return <Component key={key} />;
                })}
            </div>
        </main>
    );
}
