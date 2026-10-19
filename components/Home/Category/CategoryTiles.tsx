// components/Home/Category/CategoryTiles.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { getCategoryImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';
import type { CategoryNode } from '@/lib/categoryTree';

export interface CategoryTilesProps {
    categories: CategoryNode[] | any[];
    count?: number;
}

/**
 * A grid of category banners that reveal clean label & arrow on hover.
 */
const CategoryTiles = ({ categories, count = 4 }: CategoryTilesProps) => {
    const tiles = Array.from({ length: count }, (_, index) => categories[index] ?? null);

    return (
        <div className="hp-tiles">
            {tiles.map((category, index) =>
                category ? (
                    <Link
                        key={category.id}
                        href={getCategoryRelativeUrl(category)}
                        className="hp-tile group"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            alt={`${category.name} category`}
                            src={getCategoryImageUrl(category.image)}
                            loading="lazy"
                            onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = PLACEHOLDER_IMAGE;
                            }}
                        />
                        <div className="hp-tile__label">
                            <span className="hp-tile__name">{category.name}</span>
                            <span className="hp-tile__go" aria-hidden="true">→</span>
                        </div>
                    </Link>
                ) : (
                    <div
                        key={`placeholder-${index}`}
                        className="hp-skel hp-tile"
                        aria-hidden="true"
                    />
                )
            )}
        </div>
    );
};

export default CategoryTiles;
