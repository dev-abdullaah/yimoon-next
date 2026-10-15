// hooks/useHero.js
'use client';

import { useQuery } from '@tanstack/react-query';
import { heroApi } from '@/lib/api';

/**
 * Fetch active hero slides and promotional tiles from the backend.
 * Caches for 5 minutes and auto-refetches when stale.
 */
export function useHero() {
    const query = useQuery({
        queryKey: ['hero'],
        queryFn: () => heroApi.get(),
        staleTime: 1000 * 60 * 5,
    });

    const slides = query.data?.data?.slides ?? [];
    const tiles = query.data?.data?.tiles ?? [];

    return {
        ...query,
        slides,
        tiles,
        hasHeroData: slides.length > 0 || tiles.length > 0,
    };
}

export default useHero;
