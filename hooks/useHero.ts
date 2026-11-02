// hooks/useHero.ts
'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { heroApi } from '@/lib/api';
import { HeroSlide, HeroTile } from '@/types/storefront';

export type UseHeroReturn = UseQueryResult<{ slides?: HeroSlide[]; tiles?: HeroTile[] }, Error> & {
    slides: HeroSlide[];
    tiles: HeroTile[];
    hasHeroData: boolean;
};

/**
 * Fetch active hero slides and promotional tiles from the backend.
 * Caches for 5 minutes and auto-refetches when stale.
 */
export function useHero(initialData?: { slides?: HeroSlide[]; tiles?: HeroTile[] }) {
    const query = useQuery<{ slides?: HeroSlide[]; tiles?: HeroTile[] }>({
        queryKey: ['hero'],
        queryFn: async () => {
            const res = await heroApi.get();
            return (res?.data ?? res) as { slides?: HeroSlide[]; tiles?: HeroTile[] };
        },
        initialData: initialData || undefined,
        staleTime: 1000 * 60 * 5,
    });

    const slides: HeroSlide[] = query.data?.slides ?? initialData?.slides ?? [];
    const tiles: HeroTile[] = query.data?.tiles ?? initialData?.tiles ?? [];

    return {
        ...query,
        slides,
        tiles,
        hasHeroData: slides.length > 0 || tiles.length > 0,
    };
}

export default useHero;
