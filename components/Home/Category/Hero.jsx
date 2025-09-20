// components/Home/Category/Hero.jsx
'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from "@/utils/tokenService";

const Hero = () => {
    const router = useRouter();

    // Fetch slide data with React Query caching
    const { data: slideData, isLoading, isError } = useQuery({
        queryKey: ['heroSlides'],
        queryFn: async () => {
            // Use central token service to get or fetch token
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            const timestamp = Math.floor(Date.now() / 1000);
            const formData = new FormData();
            formData.append('timestamp', timestamp.toString());
            formData.append('token', token);
            formData.append('com', 'DataExpert');
            formData.append('action', 'fetchFromInformationSet');
            formData.append('sourcename', 'appslide');
            formData.append('method', 'findAll');

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Network response was not ok');

            return await response.json();
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
        cacheTime: 1000 * 60 * 60, // 60 minutes
        retry: 2, // Retry twice on failure
    });

    // Process the slide data
    const processSlideData = (apiData) => {
        if (!apiData?.data?.data) return { carouselSlides: [], rightImages: [] };

        const allItems = apiData.data.data.map(item => {
            const [serial, categoryName, categoryId] = item.title.split('#');

            return {
                ...item,
                serial: parseInt(serial),
                categoryName,
                categoryId,
                imageUrl: `${IMAGE_BASE_URL}/${item.image}`
            };
        }).sort((a, b) => a.serial - b.serial);

        const carouselSlides = allItems
            .filter(item => item.serial <= 3)
            .map(item => ({
                src: item.imageUrl,
                alt: item.categoryName,
                categoryId: item.categoryId,
                categoryName: item.categoryName
            }));

        const rightImages = allItems
            .filter(item => item.serial >= 4 && item.serial <= 7)
            .slice(0, 4)
            .map(item => ({
                src: item.imageUrl,
                alt: item.categoryName,
                categoryId: item.categoryId,
                categoryName: item.categoryName
            }));

        return { carouselSlides, rightImages };
    };

    // Carousel state management
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef(null);
    const trackRef = useRef(null);

    const { carouselSlides = [], rightImages = [] } = slideData ? processSlideData(slideData) : {};

    useEffect(() => {
        resetTimeout();
        if (carouselSlides.length > 0) {
            timeoutRef.current = setTimeout(() => {
                setCurrentIndex((prevIndex) =>
                    prevIndex === carouselSlides.length - 1 ? 0 : prevIndex + 1
                );
            }, 5000);
        }

        return () => resetTimeout();
    }, [currentIndex, carouselSlides.length]);

    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const goToSlide = (index) => {
        resetTimeout();
        setCurrentIndex(index);
    };

    // Handle click on carousel or promo images
    const handleImageClick = (categoryId, categoryName) => {
        // In Next.js, we pass data as query parameters instead of state
        router.push(`/catalog?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`);
    };

    useEffect(() => {
        if (trackRef.current) {
            trackRef.current.style.transform = `translateX(-${currentIndex * 100}%)`;
        }
    }, [currentIndex]);

    if (isLoading) return (
        <div className="main-grid">
            <div className="carousel">
                <div className="carousel-track" ref={trackRef}>
                    {[...Array(4)].map((_, idx) => (
                        <div key={idx} className="w-full h-full bg-gray-200 animate-pulse" />
                    ))}
                </div>
                <div className="carousel-dots">
                    {[...Array(4)].map((_, idx) => (
                        <button key={idx} className={idx === 0 ? "active" : ""} />
                    ))}
                </div>
            </div>
            <div className="right-grid">
                {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="w-full h-full object-cover cursor-pointer rounded-default" />
                ))}
            </div>
        </div>
    );

    if (isError) return (
        <div className="main-grid">
            <div className="carousel">
                <div className="carousel-track" ref={trackRef}>
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <p className="text-gray-500">Error loading carousel</p>
                    </div>
                </div>
                <div className="carousel-dots">
                    <button className="active" />
                </div>
            </div>
            <div className="right-grid">
                {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="w-full h-full bg-gray-200 rounded-default flex items-center justify-center hover:shadow-xl">
                        <p className="text-gray-500 text-sm">Error</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="main-grid">
            {/* Carousel */}
            <div className="carousel">
                <div className="carousel-track" ref={trackRef}>
                    {carouselSlides.map(({ src, alt, categoryId, categoryName }, idx) => (
                        <img
                            key={idx}
                            src={src}
                            alt={alt}
                            loading="lazy"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => handleImageClick(categoryId, categoryName)}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/resources/images/no-image-available.png';
                            }}
                        />
                    ))}
                </div>

                {/* Dots */}
                <div className="carousel-dots">
                    {carouselSlides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goToSlide(idx)}
                            className={idx === currentIndex ? "active" : ""}
                        />
                    ))}
                </div>
            </div>

            {/* Right side images */}
            <div className="right-grid">
                {rightImages.map(({ src, alt, categoryId, categoryName }, idx) => (
                    <img
                        key={idx}
                        src={src}
                        alt={alt}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full aspect-[6/5] object-cover cursor-pointer rounded-default hover:shadow-xl"
                        onClick={() => handleImageClick(categoryId, categoryName)}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/resources/images/no-image-available.png';
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default Hero;