// components/Home/Category/Offers.jsx
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { recommendationApi, PLACEHOLDER_IMAGE } from '@/lib/api';
import { toProductView } from '@/lib/productView';
import { getCategoryRelativeUrl } from '@/utils/urlHelper';
import { useCategories } from '@/hooks/useCategories';

/**
 * The closing row of the home page: the categories currently on offer, beside a
 * panel of price ceilings.
 *
 * "Which categories are on sale" is a question about prices, so it is answered
 * from the on-sale list rather than by inspecting the category tree — a category
 * can be on sale because of one product in it, which no flag on the category
 * itself would capture. The categories the returned products belong to are
 * deduplicated, which is what turns a list of discounted products into a list
 * of places a shopper can go and browse the rest.
 *
 * The price panel is a filter, not a destination, so it links into the
 * catalogue with `max_price` set. The parameter name has to match what the
 * listing reads: it looks for `max_price`, and a `maxPrice` here would be
 * silently dropped and land the shopper on the unfiltered catalogue.
 */
const PRICE_CEILINGS = [599, 1000, 1500, 2000];

const Offers = () => {
    const { isLoading: categoriesLoading } = useCategories();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['recommendations', 'on-sale'],
        queryFn: () => recommendationApi.onSale(),
        staleTime: 1000 * 60 * 10,
        retry: 1,
    });

    const banners = discountedCategories(data).slice(0, 3);

    if (isLoading || categoriesLoading) {
        return (
            <div className="mx-0 mb-2 lg:mb-4">
                <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="aspect-square bg-gray-200 animate-pulse rounded-default" />
                    ))}
                </div>
            </div>
        );
    }

    // Nothing on sale, or nothing to show because the offer list could not be
    // read: the budget panel on its own is still worth having, so the row is not
    // withdrawn. It just stops implying a sale that is not running.
    const spans = 4 - banners.length;

    return (
        <div className="mx-0 mb-2 lg:mb-4">
            <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:grid-cols-4">
                {banners.map((category) => (
                    <Link
                        key={category.id}
                        href={getCategoryRelativeUrl(category)}
                        className="cursor-pointer aspect-square overflow-hidden rounded-default relative w-full h-full group"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className="w-full h-full object-cover object-center"
                            alt={category.name}
                            loading="lazy"
                            decoding="async"
                            src={category.image}
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
                    </Link>
                ))}

                {/* The panel takes whatever columns the tiles did not, so the row
                    always ends flush with the grid. */}
                <div
                    className="h-full rounded-default bg-primary p-1 xs:p-2 sm:p-2 md:p-4 xl:p-2 2xl:p-3 flex flex-col"
                    style={{ gridColumn: `span ${spans} / span ${spans}` }}
                >
                    <h2 className="text-center font-medium xs:font-semibold sm:font-bold uppercase text-xs xs:text-sm sm:text-base md:text-xl 2xl:text-3xl text-white mb-1 sm:mb-2">
                        Budget Deals
                    </h2>
                    <div className="flex-1 grid grid-cols-2 gap-1 sm:gap-2">
                        {PRICE_CEILINGS.map((amount) => (
                            <Link
                                key={amount}
                                href={`/catalog?max_price=${amount}&sort=price_asc`}
                                className="w-full flex flex-col items-center justify-center p-0.5 sm:p-1 md:p-2 border-2 border-white rounded-md hover:bg-white group transition-colors"
                            >
                                <p className="uppercase text-slate-200 sm:font-medium group-hover:text-primary text-xxs xs:text-xs sm:text-sm md:text-base lg:text-lg">
                                    Within
                                </p>
                                <p className="uppercase text-white font-medium xs:font-semibold sm:font-bold group-hover:text-primary text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl">
                                    BDT-{amount}
                                </p>
                                <p className="uppercase text-slate-200 sm:font-medium group-hover:text-primary text-xxs xs:text-xs sm:text-sm md:text-base lg:text-lg">
                                    Only
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * The distinct categories behind the products currently on sale.
 *
 * A category with no image is dropped: the tile is only an image with the name
 * on hover, and a placeholder grey square in a row of three real ones reads as
 * something broken. The order is the order the API returned them in, which is
 * the merchandiser's own ranking.
 */
function discountedCategories(payload) {
    const products = payload?.data?.products ?? payload?.products ?? [];

    const seen = new Set();

    return products
        .map(toProductView)
        .map((product) => product?.category)
        .filter((category) => {
            if (!category?.id || !category.image || seen.has(category.id)) return false;

            seen.add(category.id);
            return true;
        });
}

export default Offers;
