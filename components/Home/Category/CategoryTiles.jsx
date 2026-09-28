// components/Home/Category/CategoryTiles.jsx
'use client';

import Link from 'next/link';
import { getCategoryImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';

/**
 * A grid of category banners that reveal their name on hover.
 *
 * Shared by the home page's tile sections. They used to be four separately
 * fetched copies of the same "appslide" feed, sliced by a serial number packed
 * into each slide's title; the catalogue is the only thing left to drive them,
 * and one component rendering it beats four that each re-derive it.
 *
 * A tile is a link, not a clickable `<div>` with a `role="button"` and a
 * keydown handler. It is a real destination, so it should behave like one:
 * focusable, openable in a new tab, and announced as a link.
 */
const CategoryTiles = ({ categories, count = 4, className = 'grid-cols-2 lg:grid-cols-4' }) => {
    // Fewer than `count` categories is normal for a young shop; pad the row with
    // placeholders rather than reflowing the grid to one or two columns, which
    // would make the section jump about as the catalogue grows.
    const tiles = Array.from({ length: count }, (_, index) => categories[index] ?? null);

    return (
        <div className={`grid grid-cols-2 gap-2.5 lg:gap-4 ${className}`}>
            {tiles.map((category, index) =>
                category ? (
                    <Link
                        key={category.id}
                        href={getCategoryRelativeUrl(category)}
                        className="aspect-[344/500] rounded-default block group"
                    >
                        <Tile category={category} />
                    </Link>
                ) : (
                    <div
                        key={`placeholder-${index}`}
                        className="aspect-[344/500] bg-gray-100 rounded-default"
                        aria-hidden="true"
                    />
                )
            )}
        </div>
    );
};

function Tile({ category }) {
    return (
        <div className="relative w-full h-full group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                alt={`${category.name} category`}
                className="rounded-default w-full h-full object-cover"
                src={getCategoryImageUrl(category.image)}
                loading="lazy"
                onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
            />

            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 rounded-default lg:px-5 lg:py-5 z-10 bg-primary/20 transition-opacity duration-300">
                <div className="h-full w-full rounded-default lg:border-2 border-primary flex items-center justify-center p-2">
                    <p className="w-full text-center uppercase font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl textBorderStyle text-primary px-2 break-words">
                        {category.name}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CategoryTiles;
