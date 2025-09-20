// components/Home/Category/PopCategory.jsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from "@/utils/tokenService";

const PopCategory = () => {
    const scrollContainerRef = useRef(null);
    const autoScrollIntervalRef = useRef(null);
    const autoScrollTimeoutRef = useRef(null);
    const isAutoScrollingRef = useRef(false);
    const router = useRouter();

    const [isHovered, setIsHovered] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Fetch categories data with React Query caching
    const { data: popCategories = [], isLoading, isError } = useQuery({
        queryKey: ['popCategories'],
        queryFn: async () => {
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            const formData = new FormData();
            formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
            formData.append('token', token);
            formData.append('com', 'DataExpert');
            formData.append('action', 'fetchFromCategorySet');
            formData.append('sourcename', 'invitemcat');
            formData.append('method', 'findAll');
            formData.append('condition', 'parentid = 0');

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            const responseData = await response.json();

            if (responseData?.status === "1" && Array.isArray(responseData?.data?.data)) {
                return responseData.data.data;
            }
            throw new Error('Invalid data format received from API');
        },
        staleTime: 1000 * 60 * 30,
        cacheTime: 1000 * 60 * 60,
        retry: 3,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    // Handle category click
    const handleCategoryClick = useCallback((categoryId, categoryName) => {
        // In Next.js, we pass data as query parameters instead of state
        router.push(`/catalog?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`);
    }, [router]);

    // Update scroll button states
    const updateScrollButtons = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }, []);

    // Industry standard smooth scroll function
    const smoothScroll = useCallback((direction) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Calculate scroll amount (approximately 2-3 items visible at once)
        const containerWidth = container.clientWidth;
        const scrollAmount = containerWidth * 0.7; // Scroll 70% of container width

        const targetScrollLeft = direction === 'left'
            ? Math.max(0, container.scrollLeft - scrollAmount)
            : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);

        // Smooth scroll animation
        container.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
        });
    }, []);

    // Auto scroll functionality
    const startAutoScroll = useCallback(() => {
        if (isHovered || popCategories.length <= 2) return;

        if (autoScrollIntervalRef.current) return;

        autoScrollIntervalRef.current = setInterval(() => {
            const container = scrollContainerRef.current;
            if (!container || isHovered) return;

            isAutoScrollingRef.current = true;
            const { scrollLeft, scrollWidth, clientWidth } = container;
            const maxScrollLeft = scrollWidth - clientWidth;

            if (scrollLeft >= maxScrollLeft - 1) {
                // Reset to beginning when reached end
                container.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                // Scroll forward
                const scrollAmount = clientWidth * 0.4; // Smaller increments for auto-scroll
                container.scrollTo({
                    left: Math.min(maxScrollLeft, scrollLeft + scrollAmount),
                    behavior: 'smooth'
                });
            }

            // Reset auto-scrolling flag after animation
            setTimeout(() => {
                isAutoScrollingRef.current = false;
            }, 500);
        }, 4000); // Auto scroll every 4 seconds
    }, [isHovered, popCategories.length]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }
        if (autoScrollTimeoutRef.current) {
            clearTimeout(autoScrollTimeoutRef.current);
            autoScrollTimeoutRef.current = null;
        }
    }, []);

    // Handle manual scroll (both button clicks and direct scroll)
    const handleManualScroll = useCallback((direction) => {
        // Stop auto scroll immediately
        stopAutoScroll();

        // Perform manual scroll
        smoothScroll(direction);

        // Restart auto scroll after delay (only if not hovered)
        if (!isHovered) {
            autoScrollTimeoutRef.current = setTimeout(() => {
                startAutoScroll();
            }, 6000);
        }
    }, [stopAutoScroll, smoothScroll, startAutoScroll, isHovered]);

    // Handle mouse enter/leave
    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        stopAutoScroll();
    }, [stopAutoScroll]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        // Small delay before restarting auto scroll
        autoScrollTimeoutRef.current = setTimeout(() => {
            startAutoScroll();
        }, 1500);
    }, [startAutoScroll]);

    // Handle scroll event to update button states
    const handleScroll = useCallback(() => {
        if (!isAutoScrollingRef.current) {
            updateScrollButtons();
        }
    }, [updateScrollButtons]);

    // Initialize auto scroll and scroll listeners
    useEffect(() => {
        if (popCategories.length > 0) {
            const container = scrollContainerRef.current;
            if (container) {
                container.addEventListener('scroll', handleScroll);
                updateScrollButtons();

                // Start auto scroll after initial render
                const timer = setTimeout(startAutoScroll, 2000);

                return () => {
                    container.removeEventListener('scroll', handleScroll);
                    clearTimeout(timer);
                };
            }
        }
    }, [popCategories, handleScroll, updateScrollButtons, startAutoScroll]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAutoScroll();
        };
    }, [stopAutoScroll]);

    // Loading state skeleton - EXACT SAME DESIGN
    if (isLoading) return (
        <div className="relative bg-transparent">
            <div className="flex items-center justify-between mb-4">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                <div className="flex space-x-2">
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded"></div>
                </div>
            </div>
            <div className="overflow-x-hidden">
                <div className="flex w-max px-1" style={{ gap: "40px" }}>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 text-center" style={{ width: "150px" }}>
                            <div className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto bg-gray-200 animate-pulse"></div>
                            <div className="h-4 w-28 mt-2 mx-auto bg-gray-200 animate-pulse rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // Error state - EXACT SAME DESIGN
    if (isError) return (
        <div className="relative bg-transparent">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-dark font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                    Popular Categories
                </h2>
            </div>
            <div className="overflow-x-hidden">
                <div className="flex w-max px-1" style={{ gap: "40px" }}>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 text-center" style={{ width: "150px" }}>
                            <div className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">Error</span>
                            </div>
                            <div className="h-4 w-28 mt-2 mx-auto bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // No data state - EXACT SAME DESIGN
    if (popCategories.length === 0) return (
        <div className="relative bg-transparent">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-dark font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                    Popular Categories
                </h2>
            </div>
            <div className="overflow-x-hidden">
                <div className="flex w-max px-1" style={{ gap: "40px" }}>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 text-center" style={{ width: "150px" }}>
                            <div className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto bg-gray-100 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Data</span>
                            </div>
                            <div className="h-4 w-28 mt-2 mx-auto bg-gray-100 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div
            className="relative bg-transparent"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-dark font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                    Popular Categories
                </h2>
                {popCategories.length > 2 && (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleManualScroll('left')}
                            disabled={!canScrollLeft}
                            className={`p-1 rounded ${canScrollLeft
                                    ? 'bg-light-white text-dark-ash hover:bg-primary hover:text-white'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                            aria-label="Scroll Left"
                        >
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handleManualScroll('right')}
                            disabled={!canScrollRight}
                            className={`p-1 rounded ${canScrollRight
                                    ? 'bg-light-white text-dark-ash hover:bg-primary hover:text-white'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                            aria-label="Scroll Right"
                        >
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="rotate-180">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div
                ref={scrollContainerRef}
                className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                <div className="flex w-max px-1" style={{ gap: "40px" }}>
                    {popCategories.map((category) => (
                        <div
                            key={category.id}
                            className="flex-shrink-0 text-center cursor-pointer group snap-start"
                            style={{ width: "150px" }}
                            onClick={() => handleCategoryClick(category.id, category.title)}
                        >
                            {category.image ? (
                                <img
                                    src={`${IMAGE_BASE_URL}/${category.image}`}
                                    alt={category.title || category.generic || 'Category image'}
                                    loading="lazy"
                                    width="150"
                                    height="150"
                                    className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto hover:shadow-xl object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/resources/images/no-image-available.png';
                                    }}
                                />
                            ) : (
                                <div className="rounded-full h-24 w-24 md:h-28 md:w-28 xl:h-[150px] xl:w-[150px] mx-auto hover:shadow-xl bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-500 text-xs">No Image</span>
                                </div>
                            )}
                            <p className="truncate-2 mx-auto mt-2 text-sm md:text-[16px] font-medium group-hover:text-primary w-28 xl:w-[150px]">
                                {category.title || category.generic || 'Unnamed Category'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PopCategory;