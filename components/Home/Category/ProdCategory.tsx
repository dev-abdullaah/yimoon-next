// components/Home/Category/ProdCategory.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { useStorefront } from '@/hooks/useStorefront';
import { getCategoryImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';
import SectionHeader from '@/components/Home/SectionHeader';
import type { CategoryNode } from '@/lib/categoryTree';

/**
 * A horizontally scrolling row of round category images showing third-level
 * (sub-subcategories) categories.
 */
const AUTO_SCROLL_INTERVAL = 4000;

const ProdCategory = () => {
    const { flat, isLoading, isError } = useCategories();
    const { getSection } = useStorefront();
    const section = getSection('categories');

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
    const isHoveredRef = useRef<boolean>(false);

    const [isHovered, setIsHovered] = useState<boolean>(false);
    const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
    const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

    // All third-level (sub-subcategories) categories
    const categories = useMemo(() => {
        const thirdLevel = flat.filter((category) => category.depth === 2);
        if (thirdLevel.length > 0) return thirdLevel;

        // Fallback for catalogues without 3-level depth
        return flat.filter((category) => !category.children || category.children.length === 0);
    }, [flat]);

    const updateScrollButtons = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }, []);

    const scrollBy = useCallback((direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Most of a viewport at a time, so one press lands the next item in view
        // rather than two thirds of one that was already visible.
        const amount = container.clientWidth * 0.7;

        container.scrollTo({
            left: direction === 'left'
                ? Math.max(0, container.scrollLeft - amount)
                : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + amount),
            behavior: 'smooth',
        });
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return undefined;

        updateScrollButtons();
        container.addEventListener('scroll', updateScrollButtons, { passive: true });

        // Resize changes how much is off-screen, so the arrows have to be
        // recomputed when the viewport does.
        window.addEventListener('resize', updateScrollButtons);

        return () => {
            container.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, [updateScrollButtons, categories.length]);

    useEffect(() => {
        if (isHovered || categories.length < 3) return undefined;

        autoScrollRef.current = setInterval(() => {
            const container = scrollContainerRef.current;

            if (!container || isHoveredRef.current) return;

            const maxScrollLeft = container.scrollWidth - container.clientWidth;

            // Wrap round at the end rather than stopping, so the row never ends
            // on a static image while the arrows still have somewhere to go.
            container.scrollTo({
                left: container.scrollLeft >= maxScrollLeft - 1 ? 0 : container.scrollLeft + container.clientWidth * 0.4,
                behavior: 'smooth',
            });
        }, AUTO_SCROLL_INTERVAL);

        return () => {
            if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        };
    }, [isHovered, categories.length]);

    const handleMouseEnter = () => {
        isHoveredRef.current = true;
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        isHoveredRef.current = false;
        setIsHovered(false);
    };

    return (
        <section className="relative bg-transparent" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <SectionHeader
                eyebrow={section?.badge_text}
                title={section?.title || 'Product Categories'}
                subtitle={section?.subtitle}
                href="/catalog"
                linkLabel="All Categories"
                onPrev={() => scrollBy('left')}
                onNext={() => scrollBy('right')}
                canPrev={canScrollLeft}
                canNext={canScrollRight}
            />

            {isLoading || isError || categories.length === 0 ? (
                <Body loading={isLoading} failed={isError} empty={categories.length === 0} />
            ) : (
                <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    <div className="flex w-max px-1" style={{ gap: '40px' }}>
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                href={getCategoryRelativeUrl(category)}
                                className="flex-shrink-0 text-center cursor-pointer group snap-start"
                                style={{ width: '150px' }}
                            >
                                <CategoryImage category={category} />
                                <p className="truncate-2 mx-auto mt-2 text-sm md:text-[16px] font-medium group-hover:text-primary w-28 xl:w-[150px]">
                                    {category.name}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

function CategoryImage({ category }: { category: CategoryNode | any }) {
    const imgSource = category.image_url || category.image;
    if (!imgSource) {
        return (
            <div className="hp-cat-avatar">
                <div className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[136px] xl:w-[136px] bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">No Image</span>
                </div>
            </div>
        );
    }

    return (
        <div className="hp-cat-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={getCategoryImageUrl(imgSource)}
                alt={category.name}
                loading="lazy"
                width="140"
                height="140"
                className="h-24 w-24 md:h-28 md:w-28 xl:h-[136px] xl:w-[136px]"
                onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
            />
        </div>
    );
}

const TILE_WIDTH = 150;

/**
 * Skeleton, error and empty states, all the same shape as the real row.
 *
 * They share one implementation because they differ only in words, and the
 * duplicated markup was the reason the three could drift apart — the empty
 * state was once a full viewport of grey discs.
 */
function Body({ loading, failed, empty }: { loading: boolean; failed: boolean; empty: boolean }) {
    if (!loading && !failed && !empty) return null;

    const tiles = Array.from({ length: 10 }, (_, index) => index);

    let wording: string | null = null;
    let tileClass = 'bg-gray-100';

    if (loading) {
        tileClass = 'bg-gray-200 animate-pulse';
    } else if (failed) {
        wording = 'Unavailable';
    } else if (empty) {
        wording = 'No categories yet';
    }

    return (
        <div className="overflow-x-hidden">
            <div className="flex w-max px-1" style={{ gap: '40px' }}>
                {tiles.map((index) => (
                    <div key={index} className="flex-shrink-0 text-center" style={{ width: `${TILE_WIDTH}px` }}>
                        <div
                            className={`rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto ${tileClass} ${
                                wording ? 'flex items-center justify-center' : ''
                            }`}
                        >
                            {wording && <span className="text-gray-500 text-xs">{wording}</span>}
                        </div>
                        <div className="h-4 w-28 mt-2 mx-auto bg-gray-100 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProdCategory;
