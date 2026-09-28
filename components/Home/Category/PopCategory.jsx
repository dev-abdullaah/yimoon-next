// components/Home/Category/PopCategory.jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { getCategoryImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';

/**
 * A horizontally scrolling row of round category images.
 *
 * The only level shown is the top one: these are meant to be the doors into the
 * shop, and a shopper who has to pick a subcategory from a carousel has already
 * been asked too much.
 *
 * Auto-scrolling is here because the row overflows on a phone and there is
 * otherwise no hint that there is anything to the right of the first two items.
 * It stops the moment a pointer is over the row: anything moving under a
 * shopper's finger is either an accident or an unusable target, and a carousel
 * that keeps going while you are trying to click something in it is the reason
 * auto-scroll usually gets removed.
 */
const AUTO_SCROLL_INTERVAL = 4000;

const PopCategory = () => {
    const { roots, isLoading, isError } = useCategories();

    const scrollContainerRef = useRef(null);
    const autoScrollRef = useRef(null);
    const isHoveredRef = useRef(false);

    const [isHovered, setIsHovered] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }, []);

    const scrollBy = useCallback((direction) => {
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
    }, [updateScrollButtons, roots.length]);

    useEffect(() => {
        if (isHovered || roots.length < 3) return undefined;

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

        return () => clearInterval(autoScrollRef.current);
    }, [isHovered, roots.length]);

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
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-dark font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                    Popular Categories
                </h2>

                {roots.length > 2 && (
                    <div className="flex space-x-2">
                        <ScrollButton
                            direction="left"
                            disabled={!canScrollLeft}
                            onClick={() => scrollBy('left')}
                        />
                        <ScrollButton
                            direction="right"
                            disabled={!canScrollRight}
                            onClick={() => scrollBy('right')}
                        />
                    </div>
                )}
            </div>

            <Body loading={isLoading} failed={isError} empty={roots.length === 0} />

            {!isLoading && !isError && roots.length > 0 && (
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
                        {roots.map((category) => (
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
}

function CategoryImage({ category }) {
    if (!category.image) {
        return (
            <div className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto bg-gray-100 flex items-center justify-center">
                <span className="text-gray-500 text-xs">No Image</span>
            </div>
        );
    }

    return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            src={getCategoryImageUrl(category.image)}
            alt={category.name}
            loading="lazy"
            width="150"
            height="150"
            className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto hover:shadow-xl object-cover"
            onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
        />
    );
}

function ScrollButton({ direction, disabled, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
            className={`p-1 rounded ${
                disabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-light-white text-dark-ash hover:bg-primary hover:text-white'
            }`}
        >
            <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={direction === 'right' ? 'rotate-180' : undefined}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
        </button>
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
function Body({ loading, failed, empty }) {
    const tiles = Array.from({ length: 10 }, (_, index) => index);

    let wording = null;
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

export default PopCategory;
