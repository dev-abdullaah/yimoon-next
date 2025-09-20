// components/Home/Category/GenderWise.jsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from "@/utils/tokenService";

const GenderWise = () => {
  const router = useRouter();

  // Fetch slide data with React Query caching
  const { data: slideData, isLoading, isError } = useQuery({
    queryKey: ['genderSlides'],
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

  // Process the slide data to get items with serial 10-13
  const processGenderData = (apiData) => {
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
      .filter(item => item.serial >= 10 && item.serial <= 13)
      .slice(0, 4)
      .sort((a, b) => a.serial - b.serial)
      .map(item => ({
        id: item.serial,
        name: item.categoryName,
        categoryId: item.categoryId,
        image: item.imageUrl
      }));
  };

  const handleCategoryClick = (categoryId, categoryName) => {
    // In Next.js, we pass data as query parameters instead of state
    router.push(`/catalog?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`);
  };

  const categories = slideData ? processGenderData(slideData) : [];

  if (isLoading) return (
    <div className="lg:mx-0">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="aspect-[344/500] bg-gray-200 animate-pulse rounded-default"
            aria-label="Loading category"
          ></div>
        ))}
      </div>
    </div>
  );

  if (isError) return (
    <div className="lg:mx-0">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="aspect-[344/500] bg-gray-200 rounded-default flex items-center justify-center"
            aria-label="Error loading category"
          >
            <p className="text-gray-500 text-sm">Error loading</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (categories.length === 0) return (
    <div className="lg:mx-0">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="aspect-[344/500] bg-gray-100 rounded-default flex items-center justify-center"
            aria-label="No categories available"
          >
            <p className="text-gray-500 text-sm">No data</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="lg:mx-0">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="aspect-[344/500] cursor-pointer"
            onClick={() => handleCategoryClick(category.categoryId, category.name)}
            aria-label={`Browse ${category.name} category`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(category.categoryId, category.name)}
          >
            <div className="relative w-full h-full group">
              <img
                alt={`${category.name} Category`}
                className="rounded-default w-full h-full object-cover"
                src={category.image}
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/resources/images/no-image-available.png';
                }}
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 rounded-default lg:px-5 lg:py-5 z-10 bg-primary/20 transition-opacity duration-300">
                <div className="h-full w-full rounded-default lg:border-2 border-primary flex items-center justify-center p-2">
                  <p className="w-full text-center uppercase font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl textBorderStyle text-primary px-2 break-words">
                    {category.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenderWise;