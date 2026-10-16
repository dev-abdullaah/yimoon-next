// hooks/useStorefront.js
'use client';

import { useQuery } from '@tanstack/react-query';
import { storefrontApi } from '@/lib/api';

export function useStorefront() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['storefront', 'config'],
        queryFn: async () => {
            const res = await storefrontApi.getConfig();
            return res?.data ?? res;
        },
        staleTime: 1000 * 30, // 30 seconds cache
        refetchOnWindowFocus: true,
        retry: 1,
    });

    const sections = data?.sections ?? [];
    const banners = data?.banners ?? {};
    const settings = data?.settings ?? {};
    const menus = data?.menus ?? { header: [], footer_col_1: [], footer_col_2: [], footer_col_3: [] };

    const sectionsByKey = sections.reduce((acc, sec) => {
        acc[sec.key] = sec;
        return acc;
    }, {});

    const isSectionActive = (key, defaultActive = true) => {
        if (!data || !sections.length) return defaultActive;
        const sec = sectionsByKey[key];
        return sec ? Boolean(sec.is_active) : defaultActive;
    };

    const getSection = (key) => sectionsByKey[key] ?? null;

    const getBanner = (placement) => banners[placement] ?? null;

    const getSetting = (key, fallback = '') => settings[key] ?? fallback;

    const getHeaderMenus = () => menus?.header ?? [];

    const getFooterMenus = (col = 1) => menus?.[`footer_col_${col}`] ?? [];

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
