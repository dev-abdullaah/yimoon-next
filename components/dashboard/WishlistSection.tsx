// components/dashboard/WishlistSection.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi, formatCurrency, getProductImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { useFloatingCart } from '@/context/CartContext';
import { getProductRelativeUrl } from '@/utils/urlHelper';
import DeleteIconMD from '@/components/Icons/DeleteIconMD';
import { WishlistItem } from '@/types/account';

/**
 * The shopper's saved products.
 *
 * The wishlist is held as a list of *variants*, not products, because that is
 * what a shopper saves: the red one in size L, not "the shirt". Saving by
 * variant is also what makes "move to cart" unambiguous — there is no choice to
 * be made about which size to add.
 */
export default function WishlistSection() {
    const queryClient = useQueryClient();
    const { addToCart, fetchCart } = useFloatingCart();

    const wishlistQuery = useQuery({
        queryKey: ['wishlist'],
        queryFn: () => wishlistApi.getWishlist(),
    });

    const items: WishlistItem[] = wishlistQuery.data?.data?.items ?? [];

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
    };

    const remove = useMutation({
        mutationFn: (variantId: number | string) => wishlistApi.removeFromWishlist(variantId),
        onSuccess: invalidate,
        onError: (error: any) => toast.error(error?.message || 'Could not remove that item'),
    });

    const clear = useMutation({
        mutationFn: () => wishlistApi.clearWishlist(),
        onSuccess: () => {
            invalidate();
            toast.success('Wishlist cleared.');
        },
        onError: (error: any) => toast.error(error?.message || 'Could not clear your wishlist'),
    });

    const moveToCart = useMutation({
        mutationFn: (variantId: number | string) => wishlistApi.moveToCart(variantId),
        onSuccess: () => {
            invalidate();

            // Success means it moved. The API deletes the wishlist row only
            // after the cart has accepted the line, and unwinds the whole
            // transaction if it did not — so a failure comes back as an error
            // and lands in `onError` with the item still in the wishlist. There
            // is no "moved nothing" case to report here, which is what reading
            // `added` off a payload that is really a cart was trying to handle.
            //
            // The cart context is refreshed rather than patched: the line was
            // added server-side and the header's badge reads from that context,
            // so it would otherwise keep showing the old count.
            fetchCart();

            toast.success('Moved to your cart.');
        },
        onError: (error: any) => toast.error(error?.message || 'Could not move that to your cart'),
    });

    const addOne = async (item: WishlistItem) => {
        await addToCart(item.variant_id, 1, item.name || item.product_name);
    };

    if (wishlistQuery.isLoading) {
        return (
            <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 w-full animate-pulse rounded-md bg-slate-200" />
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-dark text-xl font-semibold">
                    Wishlist <span className="text-gray">({items.length})</span>
                </h1>

                {items.length > 0 && (
                    <button
                        type="button"
                        onClick={() => clear.mutate()}
                        disabled={clear.isPending}
                        className="text-gray text-sm hover:text-danger disabled:opacity-50"
                    >
                        Clear wishlist
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <div className="py-16 text-center">
                    <p className="text-lg font-semibold text-dark">Your wishlist is empty</p>
                    <p className="mt-1 text-gray">
                        Save a product you like and it will wait for you here.
                    </p>
                    <Link href="/catalog" className="bg-primary mt-6 inline-block rounded-md px-6 py-2 text-white font-medium">
                        Browse products
                    </Link>
                </div>
            ) : (
                <ul className="mt-4 space-y-3">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="flex flex-wrap items-center gap-4 rounded-md border border-light-white p-4"
                        >
                            <Link href={getProductRelativeUrl({ id: item.product_id, slug: item.slug })}>
                                <img
                                    src={getProductImageUrl(item.photo || item.image)}
                                    alt={item.name}
                                    width="80"
                                    height="80"
                                    className="h-20 w-20 rounded object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                    }}
                                />
                            </Link>

                            <div className="min-w-0 flex-1">
                                <Link
                                    href={getProductRelativeUrl({ id: item.product_id, slug: item.slug })}
                                    className="text-dark font-medium hover:text-primary"
                                >
                                    {item.name}
                                </Link>
                                {item.variant_name && (
                                    <p className="text-sm text-gray">{item.variant_name}</p>
                                )}
                                <p className="mt-1 flex items-center gap-2">
                                    <span className="font-semibold">{formatCurrency(item.price)}</span>
                                    {item.on_sale && item.compare_at_price != null && (
                                        <span className="text-light-ash line-through">
                                            {formatCurrency(item.compare_at_price)}
                                        </span>
                                    )}
                                </p>
                                {!item.in_stock && (
                                    <p className="text-danger mt-1 text-sm">Out of stock</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={!item.in_stock || moveToCart.isPending}
                                    onClick={() => moveToCart.mutate(item.variant_id)}
                                    className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Move to cart
                                </button>
                                <button
                                    type="button"
                                    disabled={!item.in_stock}
                                    onClick={() => addOne(item)}
                                    className="bg-primary rounded px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    Add to cart
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Remove ${item.name} from wishlist`}
                                    onClick={() => remove.mutate(item.variant_id)}
                                >
                                    <DeleteIconMD />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
