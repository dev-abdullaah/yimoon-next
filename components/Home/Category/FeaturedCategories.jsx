// components/Home/Category/FeaturedCategories.jsx
'use client';

import { useMemo } from 'react';
import CategoryTiles from '@/components/Home/Category/CategoryTiles';
import SectionHeader from '@/components/Home/SectionHeader';
import { useCategories } from '@/hooks/useCategories';
import { useStorefront } from '@/hooks/useStorefront';

/**
 * A row of four tall category highlight banners with section header.
 */
const FeaturedCategories = () => {
    const { tree, flat, isLoading, isError } = useCategories();
    const { getSection, isSectionActive } = useStorefront();

    const section = getSection('featured_categories');

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

    if (!isSectionActive('featured_categories')) {
        return null;
    }

    return (
        <section aria-label={section?.title || 'Featured Categories'}>
            <SectionHeader
                eyebrow={section?.badge_text}
                title={section?.title || 'Featured Categories'}
                subtitle={section?.subtitle}
                href="/catalog"
                linkLabel="Browse All"
            />
            {isLoading ? (
                <div className="hp-tiles">
                    {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="hp-skel hp-tile" />
                    ))}
                </div>
            ) : isError || categories.length === 0 ? (
                <div className="hp-tiles">
                    {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="hp-skel hp-tile" />
                    ))}
                </div>
            ) : (
                <CategoryTiles categories={categories} />
            )}
        </section>
    );
};

export default FeaturedCategories;
