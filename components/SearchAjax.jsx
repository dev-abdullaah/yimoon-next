// components/SearchAjax.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { searchApi, getProductImageUrl, formatCurrency, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getProductRelativeUrl } from '@/utils/urlHelper';

/**
 * Type-ahead product suggestions under the header search box.
 *
 * Backed by `GET /search/autocomplete`, which is a purpose-built endpoint: it
 * returns a handful of names, slugs and prices rather than whole products, so
 * this is one cheap request per pause in typing instead of a page of results
 * that are then thrown away.
 *
 * The debounce is the important part. Searching on every keystroke would fire a
 * request per character against an endpoint that is rate limited, and the shopper
 * would be shown suggestions for a prefix they had already moved past.
 *
 * Hit highlighting is done here, by splitting the name on the typed text, rather
 * than by rendering the search engine's own markup. That markup is HTML from a
 * service this page does not control, and putting it through `dangerouslySetInnerHTML`
 * would make every keystroke an injection surface.
 */

const MIN_SEARCH_LENGTH = 2;

const SearchAjax = ({ query, isMobile = false, onProductSelect }) => {
    const trimmed = (query ?? '').trim();

    // Nothing to suggest below two characters: a one-letter search matches most
    // of the catalogue and helps nobody.
    const enabled = trimmed.length >= MIN_SEARCH_LENGTH;

    const { data, isFetching, isError } = useQuery({
        queryKey: ['search-autocomplete', trimmed],
        queryFn: () => searchApi.autocomplete(trimmed),
        enabled,
        // Suggestions are stale almost immediately; keeping them for a minute
        // would show a shopper results for a term they have since edited.
        staleTime: 60 * 1000,
    });

    const suggestions = enabled ? (data?.data?.suggestions ?? []) : [];

    if (!enabled) {
        return null;
    }

    const body = (
        <Results
            suggestions={suggestions}
            query={trimmed}
            loading={isFetching && suggestions.length === 0}
            failed={isError}
            hasSearched={!isFetching}
        />
    );

    if (isMobile) {
        return (
            <div className="w-full bg-white mt-2 rounded-md shadow-lg border border-gray-200">
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: '60vh', overscrollBehavior: 'contain' }}
                >
                    {body}
                </div>
            </div>
        );
    }

    return (
        <div className="absolute top-full left-0 right-0 mx-auto w-full max-w-2xl bg-white shadow-lg rounded-b-md z-50 mt-1 border border-gray-200">
            <div
                className="overflow-y-auto"
                style={{ maxHeight: '60vh', overscrollBehavior: 'contain' }}
            >
                {body}
            </div>
        </div>
    );
};

function Results({ suggestions, query, loading, failed, hasSearched }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <span
                    aria-hidden="true"
                    className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"
                />
                <span className="px-4 text-gray-600">Searching products…</span>
            </div>
        );
    }

    if (failed) {
        return (
            <div className="p-4 text-red-500 bg-red-50 rounded-md">
                Search is unavailable right now. Press Enter to try the full results page.
            </div>
        );
    }

    if (suggestions.length === 0) {
        // Only say so once the search has actually finished. Rendering this while
        // a request is in flight would flash "no results" between every
        // keystroke.
        return hasSearched ? (
            <div className="p-4 text-center text-gray-500">
                No products found matching &lsquo;{query}&rsquo;
            </div>
        ) : null;
    }

    return (
        <ul className="w-full divide-y divide-gray-200">
            {suggestions.map((product) => (
                <li key={product.id} className="py-3 hover:bg-gray-50 transition-colors px-4">
                    <Suggestion
                        product={product}
                        query={query}
                        onSelect={onProductSelect}
                    />
                </li>
            ))}
        </ul>
    );
}

function Suggestion({ product, query, onSelect }) {
    return (
        <Link
            href={getProductRelativeUrl(product)}
            className="flex items-start space-x-4 transition-opacity duration-200 hover:opacity-90"
            // The mobile overlay covers the page, so navigating has to dismiss it
            // or the shopper lands on a product and still sees a search box.
            onClick={onSelect}
        >
            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    className="w-full h-full object-cover"
                    src={getProductImageUrl(product.photo)}
                    alt={product.name}
                    loading="lazy"
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-gray-800 font-medium text-sm line-clamp-2">
                    <Highlighted text={product.name} query={query} />
                </h4>
                {product.price_from != null && (
                    <div className="mt-1">
                        <span className="text-blue-600 font-semibold">
                            {formatCurrency(product.price_from)}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
}

/**
 * The typed words inside a product name, in bold.
 *
 * Split rather than regex-replace: a query containing characters that mean
 * something to a pattern would otherwise either throw or silently match nothing.
 */
function Highlighted({ text, query }) {
    const needle = query.trim().toLowerCase();

    if (!needle) return text;

    const haystack = String(text ?? '');
    const parts = [];
    let rest = haystack;
    let offset = 0;

    // Case-insensitive scan, keeping the original casing of each fragment.
    for (;;) {
        const found = rest.toLowerCase().indexOf(needle);

        if (found === -1) break;

        if (found > 0) {
            parts.push(rest.slice(0, found));
        }

        parts.push(<strong key={`hit-${offset}`}>{rest.slice(found, found + needle.length)}</strong>);
        offset += 1;
        rest = rest.slice(found + needle.length);
    }

    if (rest) parts.push(rest);

    return parts;
}

export default SearchAjax;
