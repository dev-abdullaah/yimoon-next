// app/loading.tsx
import React from 'react';

export default function Loading(): React.JSX.Element {
    return (
        <main className="hp container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-6">
            <div className="hp-stack">
                <div className="space-y-4 md:space-y-6">
                    {/* Full-width Hero Carousel Skeleton */}
                    <div className="main-grid main-grid--full">
                        <div className="carousel carousel--full">
                            <div className="w-full h-full bg-gray-200 animate-pulse rounded-12" />
                        </div>
                    </div>

                    {/* TrustBar Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 py-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 md:h-14 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                    </div>

                    {/* Categories Skeleton */}
                    <div className="pt-2">
                        <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-200 animate-pulse" />
                                    <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
