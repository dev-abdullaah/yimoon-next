// components/Home/Category/FeaturedCategories.jsx
'use client';

import { useMemo } from 'react';
import CategoryTiles from '@/components/Home/Category/CategoryTiles';
import { useCategories } from '@/hooks/useCategories';

/**
 * A row of four tall category banners.
 *
 * This was "shop by gender", reading a `gender` grouping off the old feed. This
 * catalogue has no gender attribute on a product or a category, so the section
 * was showing four tiles with nothing behind them. It is rebuilt on what the
 * catalogue does have — the categories an admin marked `is_featured` — which
 * keeps the slot on the page and gives it a real meaning: the sections the shop
 * wants to push, in the order it put them.
 *
 * Falls back to the top level when nothing is flagged. A featured row that
 * silently disappears is worse than one showing the shop's own structure, and
 * flagging four categories is not a thing a new shop has done yet.
 */
const FeaturedCategories = () => {
    const { tree, flat, isLoading, isError } = useCategories();

    const categories = useMemo(() => {
        const featured = flat.filter((category) => category.is_featured && category.image);

        if (featured.length > 0) {
            return featured.sort((a, b) => {
                if (a.position !== b.position) return a.position - b.position;

                return a.name.localeCompare(b.name);
            });
        }

        return tree.filter((category) => category.image);
    }, [flat, tree]);

    if (isLoading) {
        return (
            <div className="lg:mx-0">
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
                    {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="aspect-[344/500] bg-gray-200 animate-pulse rounded-default" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError || categories.length === 0) {
        return (
            <div className="lg:mx-0">
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className="aspect-[344/500] bg-gray-100 rounded-default flex items-center justify-center"
                        >
                            <p className="text-gray-500 text-sm">
                                {isError ? 'Unavailable' : 'No categories yet'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="lg:mx-0">
            <CategoryTiles categories={categories} />
        </div>
    );
};

export default FeaturedCategories;
