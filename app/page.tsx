// app/page.tsx
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

function CompleteHomeSkeleton() {
    return (
        <div className="hp-stack">
            {/* 1. Full-width Hero Carousel Skeleton */}
            <div className="space-y-4 md:space-y-6">
                <div className="main-grid main-grid--full">
                    <div className="carousel carousel--full">
                        <div className="w-full h-full bg-gray-200 animate-pulse rounded-12" />
                    </div>
                </div>
                {/* 2. TrustBar Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 py-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 md:h-14 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>

            {/* 3. Categories Skeleton */}
            <div className="space-y-3">
                <div className="h-6 w-36 bg-gray-200 rounded animate-pulse" />
                <div className="flex gap-4 overflow-hidden py-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 animate-pulse" />
                            <div className="w-14 h-3 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Products Rail Skeleton */}
            <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                    <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-100 space-y-3">
                            <div className="aspect-[3/4] bg-gray-200 rounded-md animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function HomePage() {
    const { sections, isLoading } = useStorefront();

    // On initial uncached load before sections arrive, render complete homepage placeholder
    if (isLoading && sections.length === 0) {
        return (
            <main className="hp container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-6">
                <CompleteHomeSkeleton />
            </main>
        );
    }

    // Filter ONLY active sections from the backend
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
                                <Component />
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
