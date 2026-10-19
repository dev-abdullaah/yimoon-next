// components/SearchAjax.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { searchApi, getProductImageUrl, formatCurrency, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getProductRelativeUrl } from '@/utils/urlHelper';
import { Product } from '@/types/product';

const MIN_SEARCH_LENGTH = 2;

export interface SearchAjaxProps {
    query?: string | null;
    isMobile?: boolean;
    onProductSelect?: () => void;
}

interface ResultsProps {
    suggestions: any[];
    query: string;
    loading: boolean;
    failed: boolean;
    hasSearched: boolean;
    onProductSelect?: () => void;
}

interface SuggestionProps {
    product: any;
    query: string;
    onSelect?: () => void;
}

interface HighlightedProps {
    text: string | null | undefined;
    query: string;
}

const SearchAjax: React.FC<SearchAjaxProps> = ({ query, isMobile = false, onProductSelect }) => {
    const trimmed = (query ?? '').trim();
    const enabled = trimmed.length >= MIN_SEARCH_LENGTH;

    const { data, isFetching, isError } = useQuery({
        queryKey: ['search-autocomplete', trimmed],
        queryFn: () => searchApi.autocomplete(trimmed),
        enabled,
        staleTime: 60 * 1000,
    });

    const suggestions = enabled ? ((data as any)?.data?.suggestions ?? []) : [];

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
            onProductSelect={onProductSelect}
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

function Results({ suggestions, query, loading, failed, hasSearched, onProductSelect }: ResultsProps): React.JSX.Element | null {
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

function Suggestion({ product, query, onSelect }: SuggestionProps): React.JSX.Element {
    return (
        <Link
            href={getProductRelativeUrl(product)}
            className="flex items-start space-x-4 transition-opacity duration-200 hover:opacity-90"
            onClick={onSelect}
        >
            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
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

function Highlighted({ text, query }: HighlightedProps): React.ReactNode {
    const needle = query.trim().toLowerCase();

    if (!needle) return text;

    const haystack = String(text ?? '');
    const parts: React.ReactNode[] = [];
    let rest = haystack;
    let offset = 0;

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
