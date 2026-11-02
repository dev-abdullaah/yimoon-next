// app/page.tsx
import React from 'react';
import { storefrontApi, heroApi } from '@/lib/api';
import HomeClient from '@/components/Home/HomeClient';
import type { StorefrontSection, HeroSlide, HeroTile } from '@/types/storefront';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<{
    sections: StorefrontSection[];
    hero: { slides: HeroSlide[]; tiles: HeroTile[] } | null;
}> {
    try {
        const [storefrontRes, heroRes] = await Promise.allSettled([
            storefrontApi.getConfig(),
            heroApi.get(),
        ]);

        const storefrontData = storefrontRes.status === 'fulfilled' ? (storefrontRes.value?.data ?? storefrontRes.value) : null;
        const heroData = heroRes.status === 'fulfilled' ? (heroRes.value?.data ?? heroRes.value) : null;

        return {
            sections: Array.isArray(storefrontData?.sections) ? storefrontData.sections : [],
            hero: heroData ? {
                slides: Array.isArray(heroData.slides) ? heroData.slides : [],
                tiles: Array.isArray(heroData.tiles) ? heroData.tiles : [],
            } : null,
        };
    } catch (err) {
        console.error('Failed to pre-fetch homepage data on server:', err);
        return { sections: [], hero: null };
    }
}

export default async function HomePage() {
    const { sections, hero } = await getInitialData();

    return <HomeClient initialSections={sections} initialHero={hero} />;
}
