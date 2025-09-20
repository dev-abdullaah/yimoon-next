// components/Home/Category/Fashion.jsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from "@/utils/tokenService";

const Fashion = () => {
    const router = useRouter();

    // Fetch slide data with React Query caching
    const { data: slideData, isLoading, isError } = useQuery({
        queryKey: ['fashionSlides'],
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

    // Process the slide data to get items with serial 8 and 9
    const processFashionData = (apiData) => {
        if (!apiData?.data?.data) return { leftItem: null, rightItem: null };

        const allItems = apiData.data.data.map(item => {
            const [serial, categoryName, categoryId] = item.title.split('#');
            return {
                ...item,
                serial: parseInt(serial),
                categoryName,
                categoryId,
                imageUrl: `${IMAGE_BASE_URL}/${item.image}`
            };
        });

        const leftItem = allItems.find(item => item.serial === 8);
        const rightItem = allItems.find(item => item.serial === 9);

        return {
            leftItem: leftItem ? {
                src: leftItem.imageUrl,
                alt: leftItem.categoryName,
                categoryId: leftItem.categoryId,
                categoryName: leftItem.categoryName,
            } : null,
            rightItem: rightItem ? {
                src: rightItem.imageUrl,
                alt: rightItem.categoryName,
                categoryId: rightItem.categoryId,
                categoryName: rightItem.categoryName,
            } : null
        };
    };

    const handleImageClick = (categoryId, categoryName, e) => {
        e.preventDefault();
        // In Next.js, we pass data as query parameters instead of state
        router.push(`/catalog?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`);
    };

    const { leftItem, rightItem } = slideData ? processFashionData(slideData) : { leftItem: null, rightItem: null };

    if (isLoading) return (
        <div className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-3 h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] bg-gray-200 animate-pulse rounded-default"></div>
            <div className="md:col-span-2 h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] bg-gray-200 animate-pulse rounded-default"></div>
        </div>
    );

    if (isError) return (
        <div className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-3 h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] bg-gray-200 rounded-default flex items-center justify-center">
                <p className="text-gray-500">&nbsp;</p>
            </div>
            <div className="md:col-span-2 h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] bg-gray-200 rounded-default flex items-center justify-center">
                <p className="text-gray-500">&nbsp;</p>
            </div>
        </div>
    );

    if (!leftItem || !rightItem) return (
        <div className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-3 h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] bg-gray-200 rounded-default flex items-center justify-center">
                <p className="text-gray-500">&nbsp;</p>
            </div>
            <div className="md:col-span-2 h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] bg-gray-200 rounded-default flex items-center justify-center">
                <p className="text-gray-500">&nbsp;</p>
            </div>
        </div>
    );

    return (
        <div className="grid md:grid-cols-5 gap-4">
            {/* Left side - Main image */}
            <div className="md:col-span-3 relative h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px]">
                <div
                    className="block h-full w-full cursor-pointer"
                    onClick={(e) => handleImageClick(leftItem.categoryId, leftItem.categoryName, e)}
                >
                    <div className="relative h-full w-full">
                        <img
                            src={leftItem.src}
                            alt={leftItem.alt}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-default"
                            style={{
                                minHeight: '180px',
                                maxHeight: '477px'
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/resources/images/no-image-available.png';
                            }}
                        />
                        <div className="block absolute top-0 opacity-100 lg:opacity-0 hover:opacity-100 h-full w-full rounded-default lg:px-5 lg:py-5 z-10 bg-primary/0 bg-primary/20 transition-opacity duration-300">
                            <div className="opacity-100 h-full w-full rounded-default lg:border-2 bg-primary/0 bg-primary/20 border-primary" />
                            <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center uppercase font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl textBorderStyle text-primary">
                                Exclusive
                            </p>
                            <p className="absolute top-[55%] md:top-[53%] left-1/2 -translate-x-1/2 w-full text-center uppercase font-medium text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-widest textBorderStyle text-primary">
                                Collection
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Secondary image */}
            <div className="md:col-span-2 relative h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px]">
                <div
                    className="block h-full w-full cursor-pointer"
                    onClick={(e) => handleImageClick(rightItem.categoryId, rightItem.categoryName, e)}
                >
                    <div className="relative h-full w-full">
                        <img
                            src={rightItem.src}
                            alt={rightItem.alt}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-default"
                            style={{
                                minHeight: '180px',
                                maxHeight: '477px'
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/resources/images/no-image-available.png';
                            }}
                        />
                        <div className="block absolute top-0 opacity-100 lg:opacity-0 hover:opacity-100 h-full w-full rounded-default lg:px-5 lg:py-5 z-10 bg-primary/0 bg-primary/20 transition-opacity duration-300">
                            <div className="opacity-100 h-full w-full rounded-default lg:border-2 bg-primary/0 bg-primary/20 border-primary" />
                            <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center uppercase font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl textBorderStyle text-primary">
                                Exclusive
                            </p>
                            <p className="absolute top-[55%] md:top-[53%] left-1/2 -translate-x-1/2 w-full text-center uppercase font-medium text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-widest textBorderStyle text-primary">
                                Collection
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Fashion;