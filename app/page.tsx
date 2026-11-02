// app/page.tsx
import React from 'react';
import { storefrontApi } from '@/lib/api';
import HomeClient from '@/components/Home/HomeClient';
import type { StorefrontSection } from '@/types/storefront';

export const dynamic = 'force-dynamic';

async function getInitialSections(): Promise<StorefrontSection[]> {
    try {
        const res = await storefrontApi.getConfig();
        const data = res?.data ?? res;
        return Array.isArray(data?.sections) ? data.sections : [];
    } catch (err) {
        console.error('Failed to pre-fetch storefront config on server:', err);
        return [];
    }
}

export default async function HomePage() {
    const initialSections = await getInitialSections();

    return <HomeClient initialSections={initialSections} />;
}
