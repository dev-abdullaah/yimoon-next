// hooks/useCategories.js
'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/lib/api';
import { buildCategoryTree, flattenCategoryTree } from '@/lib/categoryTree';

/**
 * The catalogue's category tree, shared by every part of the storefront that
 * needs it.
 *
 * The header menu, the mobile drawer and the home page's tile sections all show
 * categories, and they are on screen at the same time. They go through this one
 * hook so they share a single React Query key: three components with three
 * hand-written keys would be three cache entries for the same catalogue, and the
 * menu would go stale while the home page refreshed it.
 *
 * Returns the flat list as the API sends it (parent before child) alongside the
 * assembled tree, because different callers want different shapes: a nav wants
 * the hierarchy, a picker wants every node with a depth marker.
 */
export function useCategories() {
    const query = useQuery({
        queryKey: ['categories'],
        queryFn: () => catalogApi.getCategories(),
        // The catalogue changes on an admin's schedule, not a shopper's. Caching
        // it for half an hour keeps a browse from re-fetching on every
        // navigation, and `refetchOnWindowFocus` off stops it re-fetching on
        // every tab switch.
        staleTime: 1000 * 60 * 30,
    });

    const categories = useMemo(() => query.data?.data ?? [], [query.data]);
    const tree = useMemo(() => buildCategoryTree(categories), [categories]);
    const flat = useMemo(() => flattenCategoryTree(tree), [tree]);

    return {
        ...query,
        categories,
        tree,
        flat,
        /** The top-level categories, which is what a shop's front page leads with. */
        roots: tree,
    };
}

export default useCategories;
