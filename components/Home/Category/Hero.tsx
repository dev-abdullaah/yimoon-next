// components/Home/Category/Hero.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { useHero } from '@/hooks/useHero';
import { getBannerImageUrl, getCategoryImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl, normalizeBannerUrl } from '@/utils/urlHelper';
import type { CategoryNode } from '@/lib/categoryTree';

const SLIDE_INTERVAL = 5000;

const Hero = () => {
    const { slides: heroSlides, tiles: heroTiles, isLoading: isHeroLoading, isError: isHeroError, hasHeroData } = useHero();
    const { roots, isLoading: isCategoriesLoading, isError: isCategoriesError } = useCategories();

    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fallback categories if hero banners are unconfigured
    const categoryBanners = useFeaturedOrder(roots);

    const isUsingHeroBanners = hasHeroData && heroSlides.length > 0;

    const slides: any[] = isUsingHeroBanners ? heroSlides : categoryBanners.slice(0, 3);
    const tiles: any[] = (isUsingHeroBanners && heroTiles.length > 0)
        ? heroTiles
        : categoryBanners.slice(3, 7);

    const isLoading = isHeroLoading && isCategoriesLoading;
    const isError = isHeroError && isCategoriesError;

    const clearTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        clearTimer();

        if (slides.length < 2) return undefined;

        timeoutRef.current = setTimeout(() => {
            setCurrentIndex((previous) => (previous + 1) % slides.length);
        }, SLIDE_INTERVAL);

        return clearTimer;
    }, [clearTimer, currentIndex, slides.length]);

    useEffect(() => {
        if (currentIndex > slides.length - 1) setCurrentIndex(0);
    }, [currentIndex, slides.length]);

    if (isLoading) return <HeroSkeleton />;

    if (isError && slides.length === 0) {
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
                            There is nothing to show yet. Configure hero banners in the admin panel.
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

    const goToSlide = (index: number) => {
        clearTimer();
        setCurrentIndex(index);
    };

    const prevSlide = () => {
        clearTimer();
        setCurrentIndex((previous) => (previous - 1 + slides.length) % slides.length);
    };

    const nextSlide = () => {
        clearTimer();
        setCurrentIndex((previous) => (previous + 1) % slides.length);
    };

    return (
        <div className="main-grid">
            {/* Carousel */}
            <div className="carousel">
                <div
                    className="carousel-track"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {slides.map((slide, index) => {
                        const href = isUsingHeroBanners ? normalizeBannerUrl(slide.link_url) : getCategoryRelativeUrl(slide);
                        const imgSrc = isUsingHeroBanners ? getBannerImageUrl(slide.image) : getCategoryImageUrl(slide.image);
                        const altText = slide.title || slide.name || 'Hero Banner';

                        return (
                            <div
                                key={slide.id || index}
                                className="carousel-slide relative h-full group"
                                style={{ minWidth: '100%', width: '100%', flex: '0 0 100%' }}
                            >
                                <Link href={href} className="block w-full h-full relative overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imgSrc}
                                        alt={altText}
                                        loading="eager"
                                        decoding="async"
                                        className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-105"
                                        onError={(event) => {
                                            event.currentTarget.onerror = null;
                                            event.currentTarget.src = PLACEHOLDER_IMAGE;
                                        }}
                                    />

                                    {/* Slide Text & CTA Overlay */}
                                    {isUsingHeroBanners && (slide.title || slide.subtitle || slide.button_text) && (
                                        <div className="hero-slide-overlay">
                                            <div className="hero-slide-overlay__content">
                                                {slide.subtitle && (
                                                    <span className="hero-slide-overlay__kicker">
                                                        {slide.subtitle}
                                                    </span>
                                                )}
                                                {slide.title && (
                                                    <h2 className="hero-slide-overlay__title">
                                                        {slide.title}
                                                    </h2>
                                                )}
                                                {slide.button_text && (
                                                    <span className="hero-slide-overlay__cta">
                                                        {slide.button_text}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            </div>
                        );
                    })}
                </div>

                {slides.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={prevSlide}
                            aria-label="Previous slide"
                            className="hero-nav-arrow hero-nav-arrow--prev"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={nextSlide}
                            aria-label="Next slide"
                            className="hero-nav-arrow hero-nav-arrow--next"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                        <div className="carousel-dots">
                            {slides.map((slide, index) => (
                                <button
                                    key={slide.id || index}
                                    type="button"
                                    onClick={() => goToSlide(index)}
                                    aria-label={`Show slide ${index + 1}`}
                                    aria-current={index === currentIndex}
                                    className={index === currentIndex ? 'active' : ''}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* 4 Side Promo Tiles */}
            <div className="right-grid">
                {tiles.map((tile, index) => {
                    const href = isUsingHeroBanners ? normalizeBannerUrl(tile.link_url) : getCategoryRelativeUrl(tile);
                    const imgSrc = isUsingHeroBanners ? getBannerImageUrl(tile.image) : getCategoryImageUrl(tile.image);
                    const title = tile.title || tile.name || '';
                    const subtitle = tile.subtitle || '';

                    return (
                        <Link key={tile.id || index} href={href} className="block h-full group relative overflow-hidden rounded-default">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imgSrc}
                                alt={title || 'Promo Tile'}
                                loading="eager"
                                decoding="async"
                                className="w-full h-full aspect-[6/5] object-cover cursor-pointer rounded-default transition-transform duration-500 group-hover:scale-105"
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                                }}
                            />

                            {/* Promo Tile Overlay */}
                            {(title || subtitle) && (
                                <div className="hero-tile-overlay">
                                    <div className="hero-tile-overlay__content">
                                        {subtitle && (
                                            <span className="hero-tile-overlay__kicker">
                                                {subtitle}
                                            </span>
                                        )}
                                        {title && (
                                            <span className="hero-tile-overlay__title">
                                                {title}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

function useFeaturedOrder(roots: CategoryNode[]): CategoryNode[] {
    return roots
        .filter((category) => category.image)
        .sort((a, b) => {
            if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
            if (a.position !== b.position) return (a.position ?? 0) - (b.position ?? 0);

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
