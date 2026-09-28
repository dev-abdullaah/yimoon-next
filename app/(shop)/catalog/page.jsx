// app/(shop)/catalog/page.jsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
    <div className="group h-full overflow-clip rounded-md bg-white shadow-inner border-light-white border">
        <div className="w-full aspect-square mx-auto overflow-hidden flex items-center justify-center">
            <div className="w-full h-full bg-gray-200 animate-pulse rounded-t-md" />
        </div>
        <div className="my-auto space-y-2 px-2 py-2.5 text-center">
            <ul className="flex w-full items-center justify-center text-center">
                <li className="flex justify-center gap-2.5">
                    <div className="w-16 h-5 bg-gray-200 animate-pulse rounded" />
                    <div className="w-16 h-5 bg-gray-200 animate-pulse rounded" />
                </li>
            </ul>
            <div className="h-5 w-3/4 mx-auto bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="flex justify-center mb-3 px-2">
            <div className="w-[130px] h-[40px] bg-gray-200 animate-pulse rounded-md" />
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
            if (value === '' || value === null || value === undefined) {
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

    const hasFilters = Boolean(category || query || inStock || onSale || minPrice || maxPrice);

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
        <main className="container mx-auto px-5 md:px-7 lg:px-12">
            {showQuickView && (
                <QuickView product={selectedProduct} onClose={handleQuickViewClose} />
            )}

            <section className="border-light-white min-h-[80vh] border-b pb-10">
                <div className="mt-5 flex gap-8">
                    {/* Filter sidebar */}
                    <aside className="hidden w-60 shrink-0 lg:block">
                        <form
                            role="search"
                            onSubmit={(e) => {
                                e.preventDefault();
                                applyFilters({ q: searchDraft.trim() });
                            }}
                            className="mb-5"
                        >
                            <label htmlFor="catalog-search" className="sr-only">Search products</label>
                            <div className="flex gap-2">
                                <input
                                    id="catalog-search"
                                    type="search"
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
                                    placeholder="Search products"
                                    className="w-full rounded-md border border-gray-400 px-3 py-2 text-sm outline-0"
                                />
                                <button type="submit" className="bg-primary rounded-md px-3 py-2 text-sm text-white">
                                    Go
                                </button>
                            </div>
                        </form>

                        {categories.length > 0 && (
                            <div className="mb-5">
                                <h2 className="text-dark text-sm font-semibold mb-2">Categories</h2>
                                <ul className="space-y-1">
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => applyFilters({ category: '' })}
                                            className={`text-left text-sm w-full rounded px-2 py-1 ${
                                                category === '' ? 'text-primary font-semibold' : 'text-gray hover:text-primary'
                                            }`}
                                        >
                                            All Products
                                        </button>
                                    </li>
                                    {categories.map((entry) => (
                                        <li key={entry.id} style={{ paddingLeft: `${(entry.depth ?? 0) * 12}px` }}>
                                            <button
                                                type="button"
                                                onClick={() => applyFilters({ category: entry.slug })}
                                                aria-current={category === entry.slug}
                                                className={`text-left text-sm w-full rounded px-2 py-1 truncate ${
                                                    category === entry.slug
                                                        ? 'text-primary font-semibold'
                                                        : 'text-gray hover:text-primary'
                                                }`}
                                            >
                                                {entry.depth > 0 && <span className="text-light-ash mr-1">└</span>}
                                                {entry.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mb-5">
                            <h2 className="text-dark text-sm font-semibold mb-2">Filters</h2>

                            <label className="flex items-center gap-2 text-sm text-gray mb-2">
                                <input
                                    type="checkbox"
                                    checked={inStock === '1'}
                                    onChange={(e) => applyFilters({ in_stock: e.target.checked ? '1' : '' })}
                                />
                                In stock only
                            </label>

                            <label className="flex items-center gap-2 text-sm text-gray mb-3">
                                <input
                                    type="checkbox"
                                    checked={onSale === '1'}
                                    onChange={(e) => applyFilters({ on_sale: e.target.checked ? '1' : '' })}
                                />
                                On sale
                            </label>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters({
                                        min_price: minPriceDraft.trim(),
                                        max_price: maxPriceDraft.trim(),
                                    });
                                }}
                                className="flex items-center gap-2"
                            >
                                <label htmlFor="min-price" className="sr-only">Minimum price</label>
                                <input
                                    id="min-price"
                                    type="number"
                                    min="0"
                                    value={minPriceDraft}
                                    onChange={(e) => setMinPriceDraft(e.target.value)}
                                    placeholder="Min"
                                    className="w-full rounded-md border border-gray-400 px-2 py-1.5 text-sm outline-0"
                                />
                                <label htmlFor="max-price" className="sr-only">Maximum price</label>
                                <input
                                    id="max-price"
                                    type="number"
                                    min="0"
                                    value={maxPriceDraft}
                                    onChange={(e) => setMaxPriceDraft(e.target.value)}
                                    placeholder="Max"
                                    className="w-full rounded-md border border-gray-400 px-2 py-1.5 text-sm outline-0"
                                />
                                <button type="submit" className="bg-dark-ash rounded-md px-2 py-1.5 text-sm text-white">
                                    Apply
                                </button>
                            </form>
                        </div>

                        {hasFilters && (
                            <Link href="/catalog" className="text-primary text-sm font-medium hover:underline">
                                Clear all filters
                            </Link>
                        )}
                    </aside>

                    <div className="w-full flex-shrink">
                        {/* Mobile controls */}
                        <div className="mb-3 grid gap-3 lg:hidden">
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
                                    placeholder="Search products"
                                    className="w-full rounded-md border border-gray-400 px-3 py-2 text-sm outline-0"
                                />
                                <button type="submit" className="bg-primary rounded-md px-3 py-2 text-sm text-white">
                                    Go
                                </button>
                            </form>

                            <label htmlFor="sortBy-mob" className="sr-only">Sort By</label>
                            <select
                                id="sortBy-mob"
                                value={sort}
                                onChange={(e) => applyFilters({ sort: e.target.value })}
                                className="w-full rounded-md border border-gray-400 px-2 py-2 text-sm outline-0"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>

                            {categories.length > 0 && (
                                <>
                                    <label htmlFor="category-mob" className="sr-only">Category</label>
                                    <select
                                        id="category-mob"
                                        value={category}
                                        onChange={(e) => applyFilters({ category: e.target.value })}
                                        className="w-full rounded-md border border-gray-400 px-2 py-2 text-sm outline-0"
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map((entry) => (
                                            <option key={entry.id} value={entry.slug}>
                                                {entry.depth > 0 ? '— '.repeat(entry.depth) : ''}{entry.name}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>

                        {/* Heading and sort */}
                        <div className="border-light-white flex items-center justify-between border-y py-3">
                            <div>
                                <h1 className="text-dark text-sm font-semibold capitalize sm:text-base lg:text-xl">
                                    {query
                                        ? `Results for “${query}”`
                                        : categories.find((entry) => entry.slug === category)?.name ?? 'All Products'}
                                </h1>
                                <p className="text-xs font-medium text-gray-600 sm:text-base">
                                    {productsQuery.isLoading ? 'Loading…' : `${total} Item${total === 1 ? '' : 's'} Found`}
                                </p>
                            </div>

                            <div className="hidden items-center space-x-3 lg:flex">
                                <label htmlFor="sortBy-desk" className="text-dark-ash font-medium">Sort By:</label>
                                <select
                                    id="sortBy-desk"
                                    value={sort}
                                    onChange={(e) => applyFilters({ sort: e.target.value })}
                                    className="rounded-md border border-gray-400 px-2 py-2 text-sm outline-0 lg:w-48"
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
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
                                    className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:opacity-40"
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
                                            className={`rounded border px-3 py-1.5 text-sm ${
                                                number === page
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-gray-400'
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
                                    className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:opacity-40"
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
