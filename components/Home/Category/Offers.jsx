// components/Home/Category/Offers.jsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from "@/utils/tokenService";

const Offers = () => {
    const router = useRouter();

    // Fetch slide data with React Query caching
    const { data: slideData, isLoading, isError } = useQuery({
        queryKey: ['offerSlides'],
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

    // Process the slide data to get items with serial 14-20
    const processOfferData = (apiData) => {
        if (!apiData?.data?.data) return [];

        return apiData.data.data
            .map(item => {
                const [serial, categoryName, categoryId] = item.title.split('#');
                return {
                    ...item,
                    serial: parseInt(serial),
                    categoryName,
                    categoryId,
                    imageUrl: `${IMAGE_BASE_URL}/${item.image}`
                };
            })
            .filter(item => item.serial >= 14 && item.serial <= 20)
            .sort((a, b) => a.serial - b.serial);
    };

    const handleImageClick = (categoryId, categoryName) => {
        // In Next.js, we pass data as query parameters instead of state
        router.push(`/catalog?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`);
    };

    const handleBudgetDealClick = (amount) => {
        // In Next.js, we pass data as query parameters instead of state
        router.push(`/catalog?maxPrice=${amount}`);
    };

    const offers = slideData ? processOfferData(slideData) : [];
    const budgetDeals = [599, 1000, 1500, 2000];

    if (isLoading) return (
        <div className="mx-0 mb-2 lg:mb-4">
            <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:grid-cols-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-default"></div>
                ))}
                <div className="aspect-square bg-gray-200 animate-pulse rounded-default"></div>
            </div>
        </div>
    );

    if (isError) return (
        <div className="mx-0 mb-2 lg:mb-4">
            <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:grid-cols-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-default flex items-center justify-center">
                        <p className="text-gray-500 text-sm">Error loading</p>
                    </div>
                ))}
                <div className="aspect-square bg-gray-200 rounded-default flex items-center justify-center">
                    <p className="text-gray-500 text-sm">Error loading</p>
                </div>
            </div>
        </div>
    );

    if (offers.length === 0) return (
        <div className="mx-0 mb-2 lg:mb-4">
            <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:grid-cols-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-default flex items-center justify-center">
                        <p className="text-gray-500 text-sm">No offers</p>
                    </div>
                ))}
                <div className="aspect-square bg-gray-100 rounded-default flex items-center justify-center">
                    <p className="text-gray-500 text-sm">No offers</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="mx-0 mb-2 lg:mb-4">
            <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:grid-cols-4">
                {/* All available offer items with consistent sizing */}
                {offers.slice(0, 3).map((offer) => (
                    <div
                        key={offer.serial}
                        className="cursor-pointer aspect-square overflow-hidden rounded-default relative w-full h-full group"
                        onClick={() => handleImageClick(offer.categoryId, offer.categoryName)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleImageClick(offer.categoryId, offer.categoryName)}
                    >
                        <img
                            className="w-full h-full object-cover object-center"
                            alt={offer.categoryName}
                            loading="lazy"
                            decoding="async"
                            src={offer.imageUrl}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/resources/images/placeholder.webp';
                            }}
                        />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 rounded-default lg:px-5 lg:py-5 z-10 bg-primary/20 transition-opacity duration-300">
                            <div className="h-full w-full rounded-default lg:border-2 border-primary flex items-center justify-center p-2">
                                <p className="w-full text-center uppercase font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl textBorderStyle text-primary px-2 break-words">
                                    {offer.categoryName}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Budget Deals - aligned with same aspect ratio */}
                <div className="h-full rounded-default bg-primary p-1 xs:p-2 sm:p-2 md:p-4 xl:p-2 2xl:p-3 flex flex-col">
                    <h2 className="text-center font-medium xs:font-semibold sm:font-bold uppercase text-xs xs:text-sm sm:text-base md:text-xl 2xl:text-3xl text-white mb-1 sm:mb-2">
                        Budget Deals
                    </h2>
                    <div className="flex-1 grid grid-cols-2 gap-1 sm:gap-2">
                        {budgetDeals.map((amount) => (
                            <div key={amount} className="flex">
                                <button
                                    type="button"
                                    className="w-full flex flex-col items-center justify-center p-0.5 sm:p-1 md:p-2 border-2 border-white rounded-md hover:bg-white group transition-colors"
                                    onClick={() => handleBudgetDealClick(amount)}
                                >
                                    <p className="uppercase text-slate-200 sm:font-medium group-hover:text-primary text-xxs xs:text-xs sm:text-sm md:text-base lg:text-lg">
                                        Within
                                    </p>
                                    <p className="uppercase text-white font-medium xs:font-semibold sm:font-bold group-hover:text-primary text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl">
                                        BDT-{amount}
                                    </p>
                                    <p className="uppercase text-slate-200 sm:font-medium group-hover:text-primary text-xxs xs:text-xs sm:text-sm md:text-base lg:text-lg">
                                        Only
                                    </p>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Offers;