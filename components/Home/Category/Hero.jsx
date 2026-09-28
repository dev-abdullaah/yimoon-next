// components/Home/Category/Hero.jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { getCategoryImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';

/**
 * The front page's lead carousel: one large slide beside four smaller tiles.
 *
 * The old build drove this from a "banners" feed whose rows carried the
 * destination category in a `serial#name#id` string packed into the title field.
 * There is no banner table in this catalogue, and inventing one for a handful of
 * images would mean an admin screen and a set of migrations to look after. The
 * categories themselves already carry the image, the ordering (`position`) and
 * the flag for "put me on the front page" (`is_featured`), so the carousel is
 * built from those instead.
 *
 * A category with no image is skipped rather than shown as a grey box: the
 * featured list is curated, so a featured entry without artwork is a
 * half-finished one, and a row of placeholders above the fold reads as a broken
 * page.
 */
const SLIDE_INTERVAL = 5000;

const Hero = () => {
    const { roots, isLoading, isError } = useCategories();

    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef(null);

    // Featured first, in the admin's order, then enough of the rest to fill the
    // row. Falls back to the plain tree so a shop that has flagged nothing still
    // gets a front page.
    const decorated = useFeaturedOrder(roots);

    const slides = decorated.slice(0, 3);
    const tiles = decorated.slice(3, 7);

    const clearTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Restart the countdown whenever the slide changes, including when the data
    // arrives and the slide count goes from zero to three — otherwise the first
    // slide would sit still while the previous zero-slide timer ran out.
    useEffect(() => {
        clearTimer();

        if (slides.length < 2) return undefined;

        timeoutRef.current = setTimeout(() => {
            setCurrentIndex((previous) => (previous + 1) % slides.length);
        }, SLIDE_INTERVAL);

        return clearTimer;
    }, [clearTimer, currentIndex, slides.length]);

    // A carousel that has fewer slides than the index does has nothing to show.
    useEffect(() => {
        if (currentIndex > slides.length - 1) setCurrentIndex(0);
    }, [currentIndex, slides.length]);

    if (isLoading) return <HeroSkeleton />;

    if (isError) {
        return (
            <div className="main-grid">
                <div className="carousel">
                    <div className="flex h-full items-center justify-center bg-gray-100">
                        <p className="text-gray-500">
                            The catalogue could not be loaded.{' '}
                            <Link href="/catalog" className="text-primary hover:underline">
                                Browse products
                            </Link>{' '}
                            instead.
                        </p>
                    </div>
                </div>
                <div className="right-grid">
                    {[...Array(4)].map((_, index) => (
                        <div key={index} className="bg-gray-100 rounded-default" />
                    ))}
                </div>
            </div>
        );
    }

    if (slides.length === 0) {
        return (
            <div className="main-grid">
                <div className="carousel">
                    <div className="flex h-full items-center justify-center bg-gray-100">
                        <p className="text-gray-500">
                            There is nothing to show yet. Add some categories to get started.
                        </p>
                    </div>
                </div>
                <div className="right-grid">
                    {[...Array(4)].map((_, index) => (
                        <div key={index} className="bg-gray-100 rounded-default" />
                    ))}
                </div>
            </div>
        );
    }

    const goToSlide = (index) => {
        clearTimer();
        setCurrentIndex(index);
    };

    return (
        <div className="main-grid">
            <div className="carousel">
                <div
                    className="carousel-track"
                    // A transform rather than a scroll: the slides stay mounted, so
                    // moving to one that was already loaded costs nothing and there
                    // is no image pop on the way back.
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {slides.map((category) => (
                        <Link
                            key={category.id}
                            href={getCategoryRelativeUrl(category)}
                            className="block w-full h-full"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getCategoryImageUrl(category.image)}
                                alt={category.name}
                                loading="eager"
                                decoding="async"
                                className="w-full h-full object-cover cursor-pointer"
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                                }}
                            />
                        </Link>
                    ))}
                </div>

                {slides.length > 1 && (
                    <div className="carousel-dots">
                        {slides.map((category, index) => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => goToSlide(index)}
                                aria-label={`Show ${category.name}`}
                                aria-current={index === currentIndex}
                                className={index === currentIndex ? 'active' : ''}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="right-grid">
                {tiles.map((category) => (
                    <Link key={category.id} href={getCategoryRelativeUrl(category)} className="block h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={getCategoryImageUrl(category.image)}
                            alt={category.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full aspect-[6/5] object-cover cursor-pointer rounded-default hover:shadow-xl"
                            onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = PLACEHOLDER_IMAGE;
                            }}
                        />
                    </Link>
                ))}
            </div>
        </div>
    );
};

/**
 * The top-level categories, ordered for the front page.
 *
 * `position` is the admin's manual ordering and comes first so a curated
 * homepage is possible; anything uncurated follows in name order rather than in
 * whatever order the database happened to return, so the row does not reshuffle
 * between requests.
 */
function useFeaturedOrder(roots) {
    return roots
        .filter((category) => category.image)
        .sort((a, b) => {
            if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
            if (a.position !== b.position) return a.position - b.position;

            return a.name.localeCompare(b.name);
        });
}

function HeroSkeleton() {
    return (
        <div className="main-grid">
            <div className="carousel">
                <div className="carousel-track">
                    {[...Array(3)].map((_, index) => (
                        <div key={index} className="w-full h-full bg-gray-200 animate-pulse" />
                    ))}
                </div>
            </div>
            <div className="right-grid">
                {[...Array(4)].map((_, index) => (
                    <div key={index} className="w-full h-full bg-gray-200 animate-pulse rounded-default" />
                ))}
            </div>
        </div>
    );
}

export default Hero;
