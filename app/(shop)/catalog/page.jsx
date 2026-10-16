// app/(shop)/catalog/page.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import QuickView from '@/components/QuickView';
import useQuickView from '@/hooks/useQuickView';
import { useFloatingCart } from '@/context/CartContext';
import { catalogApi, getCategoryImageUrl } from '@/lib/api';
import { toProductView } from '@/lib/productView';
import { ProductCard } from '@/components/Home/Products/ProductRow';

/**
 * The product listing: a category tree to filter by, a search box, a sort
 * control, and a paginated grid.
 *
 * Filtering, sorting and pagination are all done by the API rather than in the
 * browser. The catalogue holds more products than a single response returns, so
 * sorting a single page client-side would order only the products that happen to
 * fit on it — the cheapest item in the shop would not appear on page one.
 *
 * The filter state lives in the URL. That makes a filtered view shareable and
 * bookmarkable, and makes the back button behave the way a shopper expects.
 */

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Default' },
    { value: 'newest', label: 'Latest: Most Recent' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'rating', label: 'Rating: Highest First' },
    { value: 'name', label: 'Product: A-Z' },
];

const PER_PAGE = 24;

/** A card-shaped placeholder shown while a page of results loads. */
const ProductPlaceholder = () => (
    <div className="hp-card">
        <div className="hp-card__media-wrap">
            <div className="w-full h-full hp-skel" />
        </div>
        <div className="hp-card__body">
            <div className="h-4 w-3/4 hp-skel rounded" />
            <div className="hp-card__price-box">
                <div className="h-5 w-1/2 hp-skel rounded" />
                <div className="hp-card__save-row">
                    <div className="h-3.5 w-1/3 hp-skel rounded" />
                </div>
            </div>
            <div className="hp-card__cta">
                <div className="h-[38px] w-full hp-skel rounded-lg" />
            </div>
        </div>
    </div>
);

export default function Catalog() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { selectedProduct, showQuickView, handleQuickViewOpen, handleQuickViewClose } = useQuickView();
    const { addToCart, decreaseQty, increaseQty, cartItems } = useFloatingCart();

    // The whole filter state is read from the URL, so there is no second copy
    // of it in component state that could drift out of step with the address
    // bar.
    const category = searchParams.get('category') ?? '';
    const query = searchParams.get('q') ?? '';
    const sort = searchParams.get('sort') ?? 'relevance';
    const inStock = searchParams.get('in_stock') ?? '';
    const onSale = searchParams.get('on_sale') ?? '';
    const minPrice = searchParams.get('min_price') ?? '';
    const maxPrice = searchParams.get('max_price') ?? '';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    // Typed filter values are held as drafts and committed on submit, so that
    // typing a price does not fire a request per keystroke.
    const [searchDraft, setSearchDraft] = useState(query);
    const [minPriceDraft, setMinPriceDraft] = useState(minPrice);
    const [maxPriceDraft, setMaxPriceDraft] = useState(maxPrice);

    useEffect(() => setSearchDraft(query), [query]);
    useEffect(() => setMinPriceDraft(minPrice), [minPrice]);
    useEffect(() => setMaxPriceDraft(maxPrice), [maxPrice]);

    // Changing any filter invalidates the page number: staying on page 5 of a
    // result set that now has two pages shows an empty grid.
    const applyFilters = useCallback((changes) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(changes).forEach(([key, value]) => {
            if (
                value === '' ||
                value === null ||
                value === undefined ||
                (key === 'sort' && value === 'relevance')
            ) {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });

        params.delete('page');

        const queryString = params.toString();
        router.push(queryString ? `/catalog?${queryString}` : '/catalog');
    }, [router, searchParams]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page]);

    const categoryQuery = useQuery({
        queryKey: ['categories'],
        queryFn: () => catalogApi.getCategories(),
        staleTime: 1000 * 60 * 30,
    });

    const categories = useMemo(
        () => (categoryQuery.data?.data ?? categoryQuery.data ?? []).map((entry) => ({
            ...entry,
            imageUrl: entry.image ? getCategoryImageUrl(entry.image) : null,
        })),
        [categoryQuery.data]
    );

    const categoriesById = useMemo(() => {
        const map = new Map();
        categories.forEach((cat) => map.set(cat.id, cat));
        return map;
    }, [categories]);

    const categoriesBySlug = useMemo(() => {
        const map = new Map();
        categories.forEach((cat) => map.set(cat.slug, cat));
        return map;
    }, [categories]);

    const visibleCategories = useMemo(() => {
        if (!categories || categories.length === 0) return [];

        if (!category) {
            // No category selected: show top-level root categories
            return categories.filter((entry) => !entry.parent_id || entry.depth === 0);
        }

        const current =
            categoriesBySlug.get(category) ||
            (Number(category) ? categoriesById.get(Number(category)) : null);

        if (!current) {
            // Fallback to root categories if category slug is not recognized
            return categories.filter((entry) => !entry.parent_id || entry.depth === 0);
        }

        // Trace up the parent chain: [RootParent, SubParent, CurrentCategory]
        const chain = [];
        let curr = current;
        while (curr) {
            chain.unshift(curr);
            curr = curr.parent_id ? categoriesById.get(curr.parent_id) : null;
        }

        return chain;
    }, [categories, category, categoriesById, categoriesBySlug]);

    const currentCategoryObj = useMemo(() => {
        if (!category) return null;
        return (
            categoriesBySlug.get(category) ||
            (Number(category) ? categoriesById.get(Number(category)) : null) ||
            null
        );
    }, [category, categoriesBySlug, categoriesById]);

    const parentCategories = useMemo(() => {
        if (!currentCategoryObj) return [];
        const parents = [];
        let curr = currentCategoryObj.parent_id
            ? categoriesById.get(currentCategoryObj.parent_id)
            : null;
        while (curr) {
            parents.unshift(curr);
            curr = curr.parent_id ? categoriesById.get(curr.parent_id) : null;
        }
        return parents;
    }, [currentCategoryObj, categoriesById]);

    // The listing endpoint is used for an unfiltered browse; a category view
    // goes through the category endpoint so the API can include the subtree.
    const productsQuery = useQuery({
        queryKey: ['catalog', { category, query, sort, inStock, onSale, minPrice, maxPrice, page }],
        queryFn: () => {
            const params = {
                q: query || undefined,
                sort,
                in_stock: inStock === '' ? undefined : inStock,
                on_sale: onSale === '' ? undefined : onSale,
                min_price: minPrice || undefined,
                max_price: maxPrice || undefined,
                per_page: PER_PAGE,
                page,
            };

            return category
                ? catalogApi.getCategoryProducts(category, params)
                : catalogApi.getProducts(params);
        },
        placeholderData: (previous) => previous,
    });

    const products = useMemo(() => {
        const payload = productsQuery.data;
        const raw = payload?.data ?? [];
        return raw.map(toProductView).filter(Boolean);
    }, [productsQuery.data]);

    // Laravel's paginator reports these under `meta`; a non-paginated response
    // has no meta and is treated as a single page.
    const meta = productsQuery.data?.meta ?? null;
    const lastPage = meta?.last_page ?? 1;
    const total = meta?.total ?? products.length;

    const hasFilters = Boolean(
        category || query || inStock || onSale || minPrice || maxPrice || (sort && sort !== 'relevance')
    );

    /** A page-number control, with the ends and the current page kept clickable. */
    const pageNumbers = useMemo(() => {
        const window = 2;
        const numbers = new Set([1, lastPage]);

        for (let i = page - window; i <= page + window; i += 1) {
            if (i >= 1 && i <= lastPage) numbers.add(i);
        }

        return [...numbers].sort((a, b) => a - b);
    }, [page, lastPage]);

    const goToPage = (next) => {
        if (next < 1 || next > lastPage || next === page) return;

        const params = new URLSearchParams(searchParams.toString());
        if (next === 1) {
            params.delete('page');
        } else {
            params.set('page', String(next));
        }

        const queryString = params.toString();
        router.push(queryString ? `/catalog?${queryString}` : '/catalog');
    };

    const quantityFor = (product) => {
        const line = cartItems.find((item) => item.variantId === product.defaultVariantId);
        return line ? line.quantity : 0;
    };

    const handleAdd = (product) => {
        const line = cartItems.find((item) => item.variantId === product.defaultVariantId);
        if (line) {
            increaseQty(line.id);
            return;
        }
        addToCart(product.defaultVariantId, 1);
    };

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12 py-4">
            {showQuickView && (
                <QuickView product={selectedProduct} onClose={handleQuickViewClose} />
            )}

            {/* World-Class Breadcrumbs Bar */}
            <nav aria-label="Breadcrumb" className="mb-4">
                <ol className="flex flex-wrap items-center gap-2 text-sm text-gray">
                    <li>
                        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>Home</span>
                        </Link>
                    </li>
                    <li className="text-slate-300" aria-hidden="true">/</li>
                    <li>
                        <button
                            type="button"
                            onClick={() => applyFilters({ category: '' })}
                            className={`transition-colors cursor-pointer ${!category ? 'font-semibold text-dark' : 'hover:text-primary'}`}
                        >
                            Shop
                        </button>
                    </li>
                    {parentCategories.map((cat) => (
                        <React.Fragment key={cat.id}>
                            <li className="text-slate-300" aria-hidden="true">/</li>
                            <li>
                                <button
                                    type="button"
                                    onClick={() => applyFilters({ category: cat.slug })}
                                    className="hover:text-primary transition-colors capitalize cursor-pointer"
                                >
                                    {cat.name}
                                </button>
                            </li>
                        </React.Fragment>
                    ))}
                    {currentCategoryObj && (
                        <>
                            <li className="text-slate-300" aria-hidden="true">/</li>
                            <li className="font-semibold text-primary capitalize" aria-current="page">
                                {currentCategoryObj.name}
                            </li>
                        </>
                    )}
                </ol>
            </nav>

            <section className="min-h-[80vh] pb-10">
                <div className="flex gap-8">
                    {/* Filter sidebar */}
                    <aside className="hidden w-64 shrink-0 lg:block space-y-5">
                        {/* Search Card */}
                        <div className="catalog-card">
                            <label htmlFor="catalog-search" className="block text-sm font-bold uppercase tracking-wider text-dark mb-2.5">
                                Search Products
                            </label>
                            <form
                                role="search"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters({ q: searchDraft.trim() });
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    id="catalog-search"
                                    type="search"
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
                                    placeholder="Search..."
                                    className="catalog-input"
                                />
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-dark-primary rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-colors cursor-pointer"
                                >
                                    Go
                                </button>
                            </form>
                        </div>

                        {/* Category Card */}
                        {visibleCategories.length > 0 && (
                            <div className="catalog-card">
                                <div className="flex items-center justify-between border-b catalog-divider pb-2.5 mb-3">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-dark">Category</h2>
                                    {category && (
                                        <button
                                            type="button"
                                            onClick={() => applyFilters({ category: '' })}
                                            className="text-sm font-medium text-primary hover:underline cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                {currentCategoryObj ? (
                                    <div className="space-y-2">
                                        {/* Back to All Products */}
                                        <button
                                            type="button"
                                            onClick={() => applyFilters({ category: '' })}
                                            className="group flex items-center gap-1.5 text-sm font-medium text-gray hover:text-primary transition-colors mb-2 cursor-pointer"
                                        >
                                            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                            </svg>
                                            <span>All Products</span>
                                        </button>

                                        {/* Parents Hierarchy Chain */}
                                        <div className="space-y-1.5">
                                            {parentCategories.map((parent, pIdx) => (
                                                <div
                                                    key={parent.id}
                                                    className="group flex items-center gap-2 text-sm py-0.5"
                                                    style={{ paddingLeft: `${pIdx * 12}px` }}
                                                >
                                                    <svg
                                                        className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors shrink-0"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        aria-hidden="true"
                                                    >
                                                        <polyline points="15 10 20 15 15 20" />
                                                        <path d="M4 4v7a4 4 0 0 0 4 4h12" />
                                                    </svg>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyFilters({ category: parent.slug })}
                                                        className="text-gray hover:text-primary hover:underline capitalize truncate font-medium transition-colors cursor-pointer text-sm"
                                                        title={`View ${parent.name}`}
                                                    >
                                                        {parent.name}
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Current Category Node - Soft Border */}
                                            <div
                                                className="catalog-active-cat mt-1"
                                                style={{ marginLeft: `${parentCategories.length * 12}px` }}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                    <span className="capitalize truncate">{currentCategoryObj.name}</span>
                                                </div>
                                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shrink-0">
                                                    {total}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Root Categories view */
                                    <ul className="space-y-1.5">
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => applyFilters({ category: '' })}
                                                className="catalog-active-cat w-full cursor-pointer transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                                    All Products
                                                </span>
                                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                                                    {total}
                                                </span>
                                            </button>
                                        </li>
                                        {visibleCategories.map((entry) => (
                                            <li key={entry.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => applyFilters({ category: entry.slug })}
                                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray hover:bg-slate-50 hover:text-primary transition-all group cursor-pointer"
                                                >
                                                    <span className="capitalize truncate group-hover:translate-x-0.5 transition-transform text-sm">
                                                        {entry.name}
                                                    </span>
                                                    <svg className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Other Filters Card */}
                        <div className="catalog-card">
                            <div className="border-b catalog-divider pb-2.5 mb-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-dark">Filter By</h2>
                            </div>

                            <div className="space-y-2.5 mb-4">
                                <label className="flex items-center gap-2.5 text-sm font-medium text-gray hover:text-dark cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={inStock === '1'}
                                        onChange={(e) => applyFilters({ in_stock: e.target.checked ? '1' : '' })}
                                        className="rounded text-primary focus:ring-primary h-4 w-4 border-slate-300"
                                    />
                                    <span>In stock only</span>
                                </label>

                                <label className="flex items-center gap-2.5 text-sm font-medium text-gray hover:text-dark cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={onSale === '1'}
                                        onChange={(e) => applyFilters({ on_sale: e.target.checked ? '1' : '' })}
                                        className="rounded text-primary focus:ring-primary h-4 w-4 border-slate-300"
                                    />
                                    <span>On sale</span>
                                </label>
                            </div>

                            <div className="border-t catalog-divider pt-3">
                                <span className="text-sm font-semibold text-dark block mb-2">Price Range</span>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        applyFilters({
                                             min_price: minPriceDraft.trim(),
                                             max_price: maxPriceDraft.trim(),
                                        });
                                    }}
                                    className="space-y-2"
                                >
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor="min-price" className="sr-only">Minimum price</label>
                                            <input
                                                id="min-price"
                                                type="number"
                                                min="0"
                                                value={minPriceDraft}
                                                onChange={(e) => setMinPriceDraft(e.target.value)}
                                                placeholder="Min ৳"
                                                className="catalog-input"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="max-price" className="sr-only">Maximum price</label>
                                            <input
                                                id="max-price"
                                                type="number"
                                                min="0"
                                                value={maxPriceDraft}
                                                onChange={(e) => setMaxPriceDraft(e.target.value)}
                                                placeholder="Max ৳"
                                                className="catalog-input"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-primary hover:bg-[#b01723] rounded-lg py-2 text-sm font-semibold text-white transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                                    >
                                        Apply Price
                                    </button>
                                </form>
                            </div>
                        </div>

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={() => router.push('/catalog')}
                                className="w-full text-center py-2 text-sm font-semibold text-danger hover:underline cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        )}
                    </aside>

                    <div className="w-full flex-shrink">
                        {/* Mobile controls */}
                        <div className="mb-4 grid gap-3 lg:hidden">
                            <form
                                role="search"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters({ q: searchDraft.trim() });
                                }}
                                className="flex gap-2"
                            >
                                <label htmlFor="catalog-search-mobile" className="sr-only">Search products</label>
                                <input
                                    id="catalog-search-mobile"
                                    type="search"
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
                                    placeholder="Search products..."
                                    className="catalog-input"
                                />
                                <button type="submit" className="bg-primary hover:bg-[#b01723] rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer">
                                    Go
                                </button>
                            </form>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label htmlFor="sortBy-mob" className="sr-only">Sort By</label>
                                    <select
                                        id="sortBy-mob"
                                        value={sort}
                                        onChange={(e) => applyFilters({ sort: e.target.value })}
                                        className="catalog-select w-full"
                                    >
                                        {SORT_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {visibleCategories.length > 0 && (
                                    <div>
                                        <label htmlFor="category-mob" className="sr-only">Category</label>
                                        <select
                                            id="category-mob"
                                            value={category}
                                            onChange={(e) => applyFilters({ category: e.target.value })}
                                            className="catalog-select w-full"
                                        >
                                            <option value="">All Categories</option>
                                            {visibleCategories.map((entry, idx) => {
                                                const depthCount = category ? idx : (entry.depth ?? 0);
                                                return (
                                                    <option key={entry.id} value={entry.slug}>
                                                        {depthCount > 0 ? '— '.repeat(depthCount) : ''}{entry.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Category Hero Heading & Controls Bar */}
                        <div className="catalog-header-bar">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-dark capitalize">
                                            {query
                                                ? `Results for “${query}”`
                                                : currentCategoryObj?.name ?? 'All Products'}
                                        </h1>
                                        <span className="rounded-full bg-slate-100 px-3 py-0.5 text-sm font-medium text-gray">
                                            {productsQuery.isLoading ? '...' : `${total} item${total === 1 ? '' : 's'}`}
                                        </span>
                                    </div>
                                    {currentCategoryObj?.description && !query && (
                                        <p className="mt-1 text-sm text-gray max-w-2xl">
                                            {currentCategoryObj.description}
                                        </p>
                                    )}
                                </div>

                                <div className="hidden items-center space-x-2.5 lg:flex shrink-0">
                                    <label htmlFor="sortBy-desk" className="text-sm font-semibold uppercase tracking-wider text-gray">
                                        Sort By:
                                    </label>
                                    <select
                                        id="sortBy-desk"
                                        value={sort}
                                        onChange={(e) => applyFilters({ sort: e.target.value })}
                                        className="catalog-select"
                                    >
                                        {SORT_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Active Filter Chips */}
                            {hasFilters && (
                                <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5 sm:px-3.5 sm:py-2.5 shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mr-0.5 select-none shrink-0">
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                        <span>Active filters:</span>
                                    </div>

                                    {category && currentCategoryObj && (
                                        <span className="catalog-chip catalog-chip-active-cat">
                                            <span className="text-gray text-xs uppercase font-semibold">Category:</span>
                                            <strong className="capitalize text-primary font-bold">{currentCategoryObj.name}</strong>
                                            <button
                                                type="button"
                                                onClick={() => applyFilters({ category: '' })}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 hover:bg-primary hover:text-white text-primary transition-colors cursor-pointer shrink-0 ml-0.5"
                                                aria-label="Remove category filter"
                                                title="Remove category filter"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 12L12 4M4 4l8 8" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}

                                    {query && (
                                        <span className="catalog-chip">
                                            <span className="text-gray text-xs uppercase font-semibold">Search:</span>
                                            <strong className="text-dark font-semibold">“{query}”</strong>
                                            <button
                                                type="button"
                                                onClick={() => applyFilters({ q: '' })}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-dark transition-colors cursor-pointer shrink-0 ml-0.5"
                                                aria-label="Remove search filter"
                                                title="Remove search filter"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 12L12 4M4 4l8 8" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}

                                    {inStock === '1' && (
                                        <span className="catalog-chip">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                            <span className="font-semibold text-dark">In Stock</span>
                                            <button
                                                type="button"
                                                onClick={() => applyFilters({ in_stock: '' })}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-dark transition-colors cursor-pointer shrink-0 ml-0.5"
                                                aria-label="Remove in stock filter"
                                                title="Remove in stock filter"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 12L12 4M4 4l8 8" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}

                                    {onSale === '1' && (
                                        <span className="catalog-chip">
                                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                            <span className="font-semibold text-dark">On Sale</span>
                                            <button
                                                type="button"
                                                onClick={() => applyFilters({ on_sale: '' })}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-dark transition-colors cursor-pointer shrink-0 ml-0.5"
                                                aria-label="Remove on sale filter"
                                                title="Remove on sale filter"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 12L12 4M4 4l8 8" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}

                                    {(minPrice || maxPrice) && (
                                        <span className="catalog-chip">
                                            <span className="text-gray text-xs uppercase font-semibold">Price:</span>
                                            <strong className="text-dark font-semibold">৳{minPrice || '0'} – ৳{maxPrice || '∞'}</strong>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMinPriceDraft('');
                                                    setMaxPriceDraft('');
                                                    applyFilters({ min_price: '', max_price: '' });
                                                }}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-dark transition-colors cursor-pointer shrink-0 ml-0.5"
                                                aria-label="Remove price filter"
                                                title="Remove price filter"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 12L12 4M4 4l8 8" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}

                                    {sort && sort !== 'relevance' && (
                                        <span className="catalog-chip">
                                            <span className="text-gray text-xs uppercase font-semibold">Sort:</span>
                                            <strong className="text-dark font-semibold">{SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}</strong>
                                            <button
                                                type="button"
                                                onClick={() => applyFilters({ sort: '' })}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-dark transition-colors cursor-pointer shrink-0 ml-0.5"
                                                aria-label="Reset sorting"
                                                title="Reset sorting"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 12L12 4M4 4l8 8" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => router.push('/catalog')}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-danger hover:underline hover:bg-red-50/50 transition-colors ml-auto cursor-pointer shrink-0"
                                    >
                                        <svg className="w-4 h-4 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Clear all</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Grid */}
                        {productsQuery.isLoading ? (
                            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                                {Array.from({ length: PER_PAGE }, (_, i) => (
                                    <ProductPlaceholder key={`placeholder-${i}`} />
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-lg font-semibold text-dark">No products found</p>
                                <p className="mt-1 text-gray">
                                    {hasFilters
                                        ? 'Try widening your filters or searching for something else.'
                                        : 'There is nothing in the catalogue yet.'}
                                </p>
                                {hasFilters && (
                                    <Link href="/catalog" className="bg-primary mt-6 inline-block rounded-md px-6 py-2 text-white font-medium">
                                        Clear filters
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                                {products.map((product) => {
                                    const line = cartItems.find((item) => item.variantId === product.defaultVariantId);

                                    return (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            quantity={quantityFor(product)}
                                            onAdd={() => handleAdd(product)}
                                            onIncrease={() => increaseQty(line.id)}
                                            onDecrease={() => decreaseQty(line.id)}
                                            onQuickView={handleQuickViewOpen}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {lastPage > 1 && (
                            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page === 1}
                                    className="rounded-lg border border-slate-200 bg-white hover:border-primary hover:text-primary px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-inherit shadow-2xs"
                                >
                                    Previous
                                </button>

                                {pageNumbers.map((number, index) => (
                                    <span key={number} className="flex items-center gap-1">
                                        {index > 0 && number - pageNumbers[index - 1] > 1 && (
                                            <span className="px-1 text-gray">…</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => goToPage(number)}
                                            aria-current={number === page ? 'page' : undefined}
                                            className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors shadow-2xs ${
                                                number === page
                                                    ? 'border-primary bg-primary text-white font-semibold'
                                                    : 'border-slate-200 bg-white text-gray-700 hover:border-primary hover:text-primary'
                                            }`}
                                        >
                                            {number}
                                        </button>
                                    </span>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page === lastPage}
                                    className="rounded-lg border border-slate-200 bg-white hover:border-primary hover:text-primary px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-inherit shadow-2xs"
                                >
                                    Next
                                </button>
                            </nav>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
