// components/Home/Products/ProductRow.jsx
'use client';

import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import QuickView from '@/components/QuickView';
import QuickViewIcon from '@/components/Icons/QuickViewIcon';
import RightArrowLgIcon from '@/components/Icons/RightArrowLgIcon';
import useQuickView from '@/hooks/useQuickView';
import { useFloatingCart } from '@/context/CartContext';
import { getProductRelativeUrl } from '@/utils/urlHelper';
import { toProductView } from '@/lib/productView';
import { PLACEHOLDER_IMAGE } from '@/lib/api';

/**
 * One merchandising section on the home page: a heading, a six-up grid of
 * product cards, and a "see more" link.
 *
 * The five sections (trending, new arrivals, best sellers, on sale, and the
 * personalised list) were five copies of this file that differed only in their
 * query, their heading and their background. Keeping the markup in one place
 * means the card is fixed once rather than five times, and a section is now
 * declared as data.
 */

/**
 * The two background treatments the home page uses. The dark band is the
 * original "daily deals" styling; the light band is a neutral card strip.
 */
const THEMES = {
    dark: {
        section: 'daily_deals_container sm:rounded-default -mx-5 px-5 py-2 sm:mx-0 md:px-7 lg:py-5 2xl:px-11',
        heading: 'flex flex-col-reverse text-white xl:flex-row xl:items-center',
        link: 'text-white hover:text-light-warning',
    },
    light: {
        section: 'sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-slate-100 text-dark',
        heading: 'flex items-center justify-between',
        link: 'text-primary hover:text-light-warning',
    },
};

const SKELETON_CARD = (
    <div className="rounded-default animate-pulse border border-slate-300 bg-white p-3">
        <div className="mb-3 aspect-[1/1] min-h-[140px] w-full rounded-md bg-slate-200" />
        <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="h-5 w-1/2 rounded bg-slate-300" />
            <div className="h-4 w-full rounded bg-slate-300" />
        </div>
    </div>
);

/**
 * A single product card: image, discount flag, price, name, and either an
 * "add to cart" button or the stepper for a line already in the cart.
 */
function ProductCard({ product, quantity, onAdd, onIncrease, onDecrease, onQuickView }) {
    const href = getProductRelativeUrl(product);

    return (
        <div className="group h-full overflow-clip rounded-md bg-white shadow-inner transition-all duration-300 ease-in-out hover:shadow-lg border-0">
            <div className="relative">
                <Link href={href}>
                    <div className="w-full aspect-square mx-auto overflow-hidden flex items-center justify-center">
                        <img
                            alt={product.name}
                            loading="lazy"
                            width="200"
                            height="200"
                            className="w-full h-full object-cover rounded-t-md"
                            src={product.image}
                            onError={(e) => {
                                e.target.src = PLACEHOLDER_IMAGE;
                            }}
                        />
                    </div>
                    {product.onSale && (
                        <div className="absolute top-3 left-0 list-none text-start">
                            <p className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-e-md md:py-0.5">
                                <span className="font-medium text-[11px] sm:text-xs">Save</span>
                                <span className="text-xs font-medium">৳</span>
                                <span>{product.discountPercent}</span>
                                <svg height="12" viewBox="0 0 12 12" className="h-2.5 w-2.5 sm:w-3 sm:h-3 fill-white" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 0V6.6H4.8V12L9 4.8H6.6L9 0H3Z" fill="white" />
                                </svg>
                            </p>
                        </div>
                    )}
                    {!product.inStock && (
                        <div className="absolute top-3 right-0 list-none text-start">
                            <p className="bg-dark-ash text-white px-1.5 text-xs sm:text-[13px] font-semibold rounded-l-md md:py-0.5">
                                Out of stock
                            </p>
                        </div>
                    )}
                </Link>
                <div className="bg-dark/50 absolute bottom-0 hidden w-full text-center transition-all duration-500 ease-in lg:group-hover:block">
                    <button
                        type="button"
                        className="py-1"
                        aria-label={`quick view ${product.name}`}
                        onClick={() => onQuickView?.(product)}
                    >
                        <p className="bg-primary flex items-center justify-center rounded-full p-1 text-white">
                            <QuickViewIcon />
                        </p>
                    </button>
                </div>
            </div>
            <Link href={href}>
                <div className="my-auto space-y-1 px-2 py-2.5 text-center">
                    <ul className="flex w-full items-center justify-center text-center">
                        <li className="flex justify-center gap-2.5">
                            <p className="flex items-center font-semibold text-dark text-base xl:text-[20px]">
                                <span className="mr-1 text-base">৳</span>
                                {product.price}
                            </p>
                            {product.onSale && product.compareAtPrice !== null && (
                                <p className="my-auto relative font-semibold flex items-center text-sm sm:text-base text-light-ash block">
                                    <span className="mr-0.5 text-sm sm:text-base">৳</span>
                                    {product.compareAtPrice}
                                    <span className="absolute inset-0 w-full h-[2px] bg-red-500 transform rotate-[-5deg] top-1/2 -translate-y-1/2 left-[0.25px]" />
                                </p>
                            )}
                        </li>
                    </ul>
                    <p className="group-hover:text-primary truncate-2 h-7 w-full overflow-clip text-xs leading-4 font-medium text-[#333333] capitalize md:h-[35px] md:text-sm">
                        {product.name}
                    </p>
                </div>
            </Link>
            <div className="flex justify-center mb-3 px-2">
                {quantity > 0 ? (
                    <div className="border-primary text-primary flex h-[40px] w-[130px] items-center justify-between rounded border-2 px-2">
                        <button
                            type="button"
                            aria-label="decrease quantity"
                            onClick={onDecrease}
                            className="p-3 flex items-center justify-center"
                        >
                            <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                            </svg>
                        </button>
                        <p className="text-lg font-semibold mx-2">{quantity}</p>
                        <button
                            type="button"
                            aria-label="increase quantity"
                            onClick={onIncrease}
                            className="p-3 flex items-center justify-center"
                        >
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={!product.purchasable}
                        className="bg-primary hover:bg-dark-primary text-white px-4 py-2 rounded-md font-semibold w-full max-w-[130px] disabled:bg-light-ash disabled:cursor-not-allowed"
                        onClick={onAdd}
                    >
                        {product.purchasable ? 'Add to Cart' : 'Unavailable'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ProductRow({
    title,
    srLabel,
    seeMoreHref,
    theme = 'dark',
    queryKey,
    fetchProducts,
    limit = 6,
}) {
    const { selectedProduct, showQuickView, handleQuickViewOpen, handleQuickViewClose } = useQuickView();
    const { addToCart, decreaseQty, increaseQty, cartItems } = useFloatingCart();

    const { data, isLoading, isError } = useQuery({
        queryKey,
        queryFn: fetchProducts,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });

    // `fetchProducts` returns a list, but a wrapper that only ever returns
    // `{ products: [...] }` is the shape most of these endpoints use, so both
    // are accepted rather than forcing every caller to unwrap.
    const raw = Array.isArray(data) ? data : data?.products ?? [];
    const products = raw.slice(0, limit).map(toProductView).filter(Boolean);

    const styles = THEMES[theme] ?? THEMES.dark;

    /**
     * How many of a product are already in the cart.
     *
     * Matched on the *variant*, not the product: two lines of the same product
     * in different sizes are different cart rows, so matching on the product
     * would make the stepper on the second card drive the first card's line.
     */
    const quantityFor = (product) => {
        const line = cartItems.find((item) => item.variantId === product.defaultVariantId);
        return line ? line.quantity : 0;
    };

    const header = (
        <>
            <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                {title}
            </h2>
        </>
    );

    const seeMore = seeMoreHref ? (
        <Link className={styles.link} href={seeMoreHref}>
            <h3 className="text-sm font-semibold md:text-base xl:text-xl flex items-center md:gap-1">
                See More<span className="sr-only">{srLabel ?? title}</span>
                <RightArrowLgIcon />
            </h3>
        </Link>
    ) : null;

    if (isLoading || isError || products.length === 0) {
        // An empty section is shown as a skeleton rather than nothing: a
        // home page that silently omits a band reflows as each query settles,
        // which reads as a broken page.
        return (
            <div className="relative">
                <div className={styles.section}>
                    <div className="flex items-end justify-between lg:px-14 xl:items-center">
                        <div className={styles.heading}>{header}</div>
                        {!isLoading && !isError && (
                            <div className={styles.link}>
                                <h3 className="text-sm font-semibold md:text-base xl:text-xl flex items-center md:gap-1">
                                    Nothing to show yet
                                </h3>
                            </div>
                        )}
                    </div>
                    <div className="py-4 lg:px-14">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {Array.from({ length: limit }, (_, i) => (
                                <div key={i}>{SKELETON_CARD}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {showQuickView && (
                <QuickView product={selectedProduct} onClose={handleQuickViewClose} />
            )}
            <div className={styles.section}>
                <div className="flex items-end justify-between lg:px-14 xl:items-center">
                    <div className={styles.heading}>{header}</div>
                    {seeMore}
                </div>
                <div className="py-4 lg:px-14">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                quantity={quantityFor(product)}
                                onAdd={() => {
                                    addToCart(product.defaultVariantId, 1);
                                    toast.success(`"${product.name}" added to cart`);
                                }}
                                onIncrease={() => {
                                    const line = cartItems.find((item) => item.variantId === product.defaultVariantId);
                                    increaseQty(line.id);
                                }}
                                onDecrease={() => {
                                    const line = cartItems.find((item) => item.variantId === product.defaultVariantId);
                                    decreaseQty(line.id);
                                }}
                                onQuickView={handleQuickViewOpen}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export { ProductCard };
