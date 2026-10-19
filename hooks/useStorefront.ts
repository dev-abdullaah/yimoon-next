// hooks/useStorefront.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { storefrontApi } from '@/lib/api';
import {
    StorefrontConfig,
    StorefrontSection,
    MenuItem,
    UseStorefrontReturn
} from '@/types/storefront';

export function useStorefront(): UseStorefrontReturn {
    const { data, isLoading, error } = useQuery<StorefrontConfig>({
        queryKey: ['storefront', 'config'],
        queryFn: async () => {
            const res = await storefrontApi.getConfig();
            return (res?.data ?? res) as StorefrontConfig;
        },
        staleTime: 1000 * 30, // 30 seconds cache
        refetchOnWindowFocus: true,
        retry: 1,
    });

    const sections: StorefrontSection[] = data?.sections ?? [];
    const banners: Record<string, any> = data?.banners ?? {};
    const settings: Record<string, any> = data?.settings ?? {};
    const menus = data?.menus ?? { header: [], footer_col_1: [], footer_col_2: [], footer_col_3: [] };

    const sectionsByKey = sections.reduce<Record<string, StorefrontSection>>((acc, sec) => {
        acc[sec.key] = sec;
        return acc;
    }, {});

    const isSectionActive = (key: string, defaultActive: boolean = true): boolean => {
        if (!data || !sections.length) return defaultActive;
        const sec = sectionsByKey[key];
        return sec ? Boolean(sec.is_active) : defaultActive;
    };

    const getSection = (key: string): StorefrontSection | null => sectionsByKey[key] ?? null;

    const getBanner = (placement: string): any => banners[placement] ?? null;

    const getSetting = (key: string, fallback: string = ''): string => {
        const val = settings[key];
        return val !== undefined && val !== null ? String(val) : fallback;
    };

    const getHeaderMenus = (): MenuItem[] => menus?.header ?? [];

    const getFooterMenus = (col: number = 1): MenuItem[] => menus?.[`footer_col_${col}`] ?? [];

    return {
        data,
        sections,
        banners,
        settings,
        menus,
        sectionsByKey,
        isSectionActive,
        getSection,
        getBanner,
        getSetting,
        getHeaderMenus,
        getFooterMenus,
        isLoading,
        error,
    };
}
