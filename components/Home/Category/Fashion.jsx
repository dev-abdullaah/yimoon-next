// components/Home/Category/Fashion.jsx
'use client';

import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { getCategoryImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';

/**
 * Two large category banners side by side, the left one wider.
 *
 * Another "appslide" slice in the original, and like the rest of those, what it
 * actually pointed at was a category. It is rebuilt on the two widest sections
 * of the tree — the top level and, failing that, the first two roots — so the
 * page keeps a big visual anchor above the product rows without a second content
 * type to maintain.
 *
 * Returns nothing when the catalogue has fewer than two categories with images,
 * rather than rendering a half-empty banner: a single tile at three-fifths of
 * the page width looks like a mistake, and an empty gap in the layout looks
 * worse still.
 */
const Fashion = () => {
    const { tree, isLoading } = useCategories();

    if (isLoading) {
        return (
            <div className="grid md:grid-cols-5 gap-4">
                {[3, 2].map((span) => (
                    <div
                        key={span}
                        className="h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] bg-gray-200 animate-pulse rounded-default"
                        style={{ gridColumn: `span ${span} / span ${span}` }}
                    />
                ))}
            </div>
        );
    }

    const [first, second] = pickBanners(tree);

    if (!first || !second) return null;

    return (
        <div className="grid md:grid-cols-5 gap-4">
            <Banner category={first} span={3} />
            <Banner category={second} span={2} />
        </div>
    );
}

/**
 * The two banners, largest sections first.
 *
 * `children` is preferred over a root, because a parent is the one a shopper
 * can always navigate from and it is the section an admin would promote.
 */
function pickBanners(tree) {
    const parented = tree.flatMap((category) => category.children ?? []);

    return [parented[0] ?? tree[0], parented[1] ?? tree[1]].filter(
        (category) => category?.image
    );
}

function Banner({ category, span }) {
    return (
        <Link
            href={getCategoryRelativeUrl(category)}
            className="block relative h-[180px] sm:h-[250px] md:h-[350px] lg:h-[477px] group"
            style={{ gridColumn: `span ${span} / span ${span}` }}
        >
            <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={getCategoryImageUrl(category.image)}
                    alt={category.name}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-default"
                    style={{ minHeight: '180px', maxHeight: '477px' }}
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                />

                {/* Always legible on a touch device, where there is no hover to
                    reveal it, and only on hover on a pointer device. */}
                <div className="block absolute top-0 opacity-100 lg:opacity-0 hover:opacity-100 group-hover:opacity-100 h-full w-full rounded-default lg:px-5 lg:py-5 z-10 bg-primary/20 transition-opacity duration-300">
                    <div className="opacity-100 h-full w-full rounded-default lg:border-2 bg-primary/0 border-primary" />
                    <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center uppercase font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl textBorderStyle text-primary">
                        {category.name}
                    </p>
                    <p className="absolute top-[55%] md:top-[53%] left-1/2 -translate-x-1/2 w-full text-center uppercase font-medium text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-widest textBorderStyle text-primary">
                        Collection
                    </p>
                </div>
            </div>
        </Link>
    );
}

export default Fashion;
