// app/(shop)/product/[productId]/[slug]/page.jsx
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useFloatingCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { catalogApi, recommendationApi, reviewApi, wishlistApi, PLACEHOLDER_IMAGE } from '@/lib/api';
import { toProductView, selectableVariants, variantOptionAxes } from '@/lib/productView';
import { getProductRelativeUrl, getCategoryRelativeUrl } from '@/utils/urlHelper';
import { ProductCard } from '@/components/Home/Products/ProductRow';
import FacebookIcon from '@/components/Icons/FacebookIcon';
import XIcon from '@/components/Icons/XIcon';
import WhatsappIcon from '@/components/Icons/WhatsappIcon';
import TelegramIcon from '@/components/Icons/TelegramIcon';
import WishListLgIcon from '@/components/Icons/WishListLgIcon';

/**
 * A product detail page.
 *
 * The route carries both an id and a slug, which is a second way to address the
 * same product. The page fetches by slug and then checks the id agrees,
 * redirecting to the canonical URL when it does not — so a stale link from a
 * renamed product, or a hand-edited id, lands on the one URL that search
 * engines should index rather than serving the same product under many.
 */

/** Star row for a 0–5 rating. */
function RatingStars({ average, count, size = 'text-sm' }) {
    const rounded = Math.round(Number(average) || 0);

    return (
        <span className="inline-flex items-center gap-1">
            <span className={`inline-flex ${size} text-warning`} aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
                        className={star <= rounded ? '' : 'text-light-ash'}>
                        <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.5z" />
                    </svg>
                ))}
            </span>
            <span className="sr-only">{average} out of 5 stars</span>
            {count > 0 && (
                <span className="text-xs text-gray">({count} review{count === 1 ? '' : 's'})</span>
            )}
        </span>
    );
}

const Product = () => {
    const { productId, slug } = useParams();
    const router = useRouter();
    const { addToCart, cartItems } = useFloatingCart();
    const { isAuthenticated } = useAuth();

    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    // Variant selection is held as a plain `{ axisName: valueLabel }` object so
    // that choosing a size does not silently discard a chosen colour, and
    // resolving it back to a variant is derived rather than stored.
    const [selection, setSelection] = useState({});
    const [activeTab, setActiveTab] = useState('description');
    const [isAdding, setIsAdding] = useState(false);
    const [inWishlist, setInWishlist] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['product', slug],
        queryFn: () => catalogApi.getProduct(slug),
        retry: 0,
    });

    const product = useMemo(() => toProductView(data?.data ?? data), [data]);

    // Keep exactly one URL per product. A slug that has been changed, or an id
    // that belongs to a different product, is corrected rather than served.
    useEffect(() => {
        if (!product) return;

        if (String(product.id) !== String(productId) || product.slug !== slug) {
            router.replace(getProductRelativeUrl(product));
        }
    }, [product, productId, slug, router]);

    const variants = useMemo(() => selectableVariants(product), [product]);
    const axes = useMemo(() => variantOptionAxes(product), [product]);

    /**
     * The variant the current selection resolves to.
     *
     * A partial selection — a colour chosen but no size — resolves to the
     * cheapest variant that matches what *has* been chosen, so the page shows a
     * real price rather than blanking out until the form is complete.
     */
    const selectedVariant = useMemo(() => {
        if (variants.length === 0) return null;

        const chosen = Object.entries(selection);
        const matches = variants.filter((variant) => chosen.every(([axis, value]) => {
            const attribute = variant.attributes?.[axis];
            const label = attribute && typeof attribute === 'object'
                ? (attribute.name ?? attribute.value)
                : attribute;
            return String(label) === String(value);
        }));

        if (matches.length === 0) return null;
        if (matches.length === 1) return matches[0];

        return [...matches].sort((a, b) => a.price - b.price)[0];
    }, [variants, selection]);

    // A product with no axes, or whose default is not yet reflected in the
    // selection, starts on the variant the API nominated.
    useEffect(() => {
        if (!product) return;

        const initial = {};

        for (const axis of axes) {
            const preferred = selectedVariant?.attributes?.[axis.name];
            const label = preferred && typeof preferred === 'object'
                ? (preferred.name ?? preferred.value)
                : preferred;
            initial[axis.name] = label ?? axis.values[0]?.label ?? null;
        }

        setSelection(initial);
        // Only the product's option shape should reset the selection; changing
        // quantity or price must not discard what the shopper has chosen.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id, axes.length]);

    // Stock is per variant, so a change of variant can make the current
    // quantity unsellable. Clamping rather than leaving it is what stops the
    // page offering "5 of a size that has 2 left".
    useEffect(() => {
        const ceiling = selectedVariant?.stockQuantity || 0;
        setQuantity((prev) => (ceiling > 0 ? Math.min(prev, ceiling) : prev));
    }, [selectedVariant?.id, selectedVariant?.stockQuantity]);

    const relatedQuery = useQuery({
        queryKey: ['related', product?.id],
        queryFn: () => recommendationApi.related(product.id),
        enabled: Boolean(product?.id),
    });

    const related = useMemo(() => {
        const raw = relatedQuery.data?.data?.products ?? relatedQuery.data?.products ?? [];
        return raw.map(toProductView).filter((entry) => entry && entry.id !== product?.id).slice(0, 6);
    }, [relatedQuery.data, product?.id]);

    // Only a signed-in shopper has a wishlist, so the check is not worth
    // spending a request on for a guest.
    const wishlistQuery = useQuery({
        queryKey: ['wishlist', 'check', selectedVariant?.id],
        queryFn: () => wishlistApi.checkWishlist(selectedVariant.id),
        enabled: isAuthenticated && Boolean(selectedVariant?.id),
    });

    useEffect(() => {
        const payload = wishlistQuery.data?.data ?? wishlistQuery.data;
        if (payload) setInWishlist(Boolean(payload.in_wishlist ?? payload.exists));
    }, [wishlistQuery.data]);

    const cartQuantity = useMemo(() => {
        const line = cartItems.find((item) => item.variantId === selectedVariant?.id);
        return line ? line.quantity : 0;
    }, [cartItems, selectedVariant?.id]);

    const handleSelect = useCallback((axisName, value) => {
        setSelection((prev) => {
            const next = { ...prev, [axisName]: value };

            // Switching an axis can invalidate a combination that no longer
            // exists — picking a colour may leave no Large in stock. The
            // conflicting axis is dropped so the selection stays coherent
            // rather than resolving to nothing.
            const stillValid = selectableVariants({ variants }).some((variant) =>
                Object.entries(next).every(([axis, chosen]) => {
                    const attribute = variant.attributes?.[axis];
                    const label = attribute && typeof attribute === 'object'
                        ? (attribute.name ?? attribute.value)
                        : attribute;
                    return String(label) === String(chosen);
                })
            );

            return stillValid ? next : { [axisName]: value };
        });
    }, [variants]);

    const handleQuantityChange = useCallback((action) => {
        setQuantity((prev) => {
            if (action === 'increase') {
                const ceiling = selectedVariant?.stockQuantity || prev + 1;
                return Math.min(prev + 1, ceiling);
            }
            if (action === 'decrease' && prev > 1) return prev - 1;
            return prev;
        });
    }, [selectedVariant?.stockQuantity]);

    const handleAddToCart = useCallback(async (thenCheckout = false) => {
        if (!selectedVariant?.purchasable) {
            toast.error('This option is currently unavailable.');
            return;
        }

        setIsAdding(true);

        try {
            await addToCart(selectedVariant.id, quantity);

            if (thenCheckout) router.push('/checkout');
        } finally {
            setIsAdding(false);
        }
    }, [addToCart, selectedVariant, quantity, router]);

    const handleWishlist = useCallback(async () => {
        if (!isAuthenticated) {
            toast.error('Please sign in to use your wishlist.');
            router.push('/login');
            return;
        }

        if (!selectedVariant) return;

        try {
            if (inWishlist) {
                await wishlistApi.removeFromWishlist(selectedVariant.id);
                setInWishlist(false);
                toast.success('Removed from wishlist');
            } else {
                await wishlistApi.addToWishlist(selectedVariant.id);
                setInWishlist(true);
                toast.success('Added to wishlist');
            }
        } catch (err) {
            toast.error(err.message || 'Could not update your wishlist');
        }
    }, [isAuthenticated, inWishlist, selectedVariant, router]);

    if (isLoading) {
        return (
            <div className="container py-10">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div className="aspect-square w-full animate-pulse rounded-md bg-slate-200" />
                    <div className="space-y-4">
                        <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
                        <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
                        <div className="h-24 w-full animate-pulse rounded bg-slate-200" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="container py-20 text-center">
                <h1 className="text-2xl font-semibold text-dark">Product not found</h1>
                <p className="mt-2 text-gray">
                    This product may have been removed or is no longer available.
                </p>
                <Link href="/catalog" className="bg-primary mt-6 inline-block rounded-md px-6 py-2 text-white font-medium">
                    Continue shopping
                </Link>
            </div>
        );
    }

    const gallery = product.gallery.length ? product.gallery : [PLACEHOLDER_IMAGE];
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.name)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${product.name} ${shareUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.name)}`,
    };

    const reviewList = data?.data?.reviews ?? data?.reviews ?? [];

    return (
        <div className="container py-5 md:py-8">
            <nav aria-label="Breadcrumb" className="text-sm text-gray mb-5">
                <ol className="flex flex-wrap items-center gap-1">
                    <li><Link href="/" className="hover:text-primary">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li><Link href="/catalog" className="hover:text-primary">Shop</Link></li>
                    {product.category && (
                        <>
                            <li aria-hidden="true">/</li>
                            <li>
                                <Link href={getCategoryRelativeUrl(product.category)} className="hover:text-primary">
                                    {product.category.name}
                                </Link>
                            </li>
                        </>
                    )}
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="text-dark font-medium">{product.name}</li>
                </ol>
            </nav>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Gallery */}
                <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-md border border-light-white bg-white">
                        <img
                            src={gallery[Math.min(activeImage, gallery.length - 1)]}
                            alt={product.name}
                            width="600"
                            height="600"
                            className="aspect-square w-full object-cover"
                            onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                        />
                    </div>
                    {gallery.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            {gallery.map((image, index) => (
                                <button
                                    key={image + index}
                                    type="button"
                                    aria-label={`Show image ${index + 1}`}
                                    aria-current={index === activeImage}
                                    onClick={() => setActiveImage(index)}
                                    className={`w-20 h-20 overflow-hidden rounded border-2 ${
                                        index === activeImage ? 'border-primary' : 'border-light-white'
                                    }`}
                                >
                                    <img
                                        src={image}
                                        alt=""
                                        width="80"
                                        height="80"
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div>
                    <h1 className="text-dark text-2xl md:text-3xl font-semibold leading-tight">
                        {product.name}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <RatingStars average={product.rating.average} count={product.rating.count} />
                        {product.productCode && (
                            <span className="text-sm text-gray">SKU: {product.productCode}</span>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-end gap-3">
                        <span className="text-dark text-3xl font-semibold">
                            <span className="text-xl mr-1">৳</span>
                            {selectedVariant?.price ?? product.price}
                        </span>
                        {selectedVariant?.compareAtPrice != null && selectedVariant.compareAtPrice > selectedVariant.price && (
                            <span className="text-light-ash text-lg line-through">
                                ৳ {selectedVariant.compareAtPrice}
                            </span>
                        )}
                        {selectedVariant?.discountPercent > 0 && (
                            <span className="bg-danger text-white rounded px-2 py-0.5 text-sm font-semibold">
                                Save {selectedVariant.discountPercent}%
                            </span>
                        )}
                    </div>

                    <p className={`mt-2 font-medium ${product.inStock ? 'text-success' : 'text-danger'}`}>
                        {selectedVariant?.inStock
                            ? `In stock — ${selectedVariant.stockQuantity} available`
                            : 'Currently out of stock'}
                    </p>

                    {/* Variant pickers */}
                    {axes.map((axis) => (
                        <div key={axis.name} className="mt-5">
                            <p className="text-dark text-sm font-semibold mb-2 capitalize">
                                {axis.name}: <span className="font-normal text-gray">{selection[axis.name]}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {axis.values.map((option) => {
                                    const isSelected = selection[axis.name] === option.label;

                                    // An option is offered only where it combines
                                    // with the *other* chosen axes, so a shopper
                                    // is not offered a combination that does not
                                    // exist. The current selection is always
                                    // allowed through so the choice cannot become
                                    // unrepresentable.
                                    const available = variants.some((variant) => {
                                        const attribute = variant.attributes?.[axis.name];
                                        const label = attribute && typeof attribute === 'object'
                                            ? (attribute.name ?? attribute.value)
                                            : attribute;
                                        if (String(label) !== String(option.label)) return false;
                                        if (isSelected) return true;

                                        return Object.entries(selection).every(([name, chosen]) => {
                                            if (name === axis.name) return true;
                                            const other = variant.attributes?.[name];
                                            const otherLabel = other && typeof other === 'object'
                                                ? (other.name ?? other.value)
                                                : other;
                                            return String(otherLabel) === String(chosen);
                                        });
                                    });

                                    return (
                                        <button
                                            key={option.label}
                                            type="button"
                                            disabled={!available}
                                            onClick={() => handleSelect(axis.name, option.label)}
                                            aria-pressed={isSelected}
                                            className={`rounded border px-4 py-1.5 text-sm font-medium capitalize ${
                                                isSelected
                                                    ? 'border-primary bg-primary text-white'
                                                    : available
                                                        ? 'border-light-ash text-dark hover:border-primary'
                                                        : 'border-light-ash text-light-ash cursor-not-allowed line-through'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Quantity and actions */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <div className="border-primary text-primary flex h-[44px] w-[140px] items-center justify-between rounded border-2 px-2">
                            <button
                                type="button"
                                aria-label="decrease quantity"
                                disabled={quantity <= 1}
                                onClick={() => handleQuantityChange('decrease')}
                                className="p-3 flex items-center justify-center disabled:text-light-ash"
                            >
                                <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                                </svg>
                            </button>
                            <span className="text-lg font-semibold mx-2">{quantity}</span>
                            <button
                                type="button"
                                aria-label="increase quantity"
                                disabled={quantity >= (selectedVariant?.stockQuantity || 0)}
                                onClick={() => handleQuantityChange('increase')}
                                className="p-3 flex items-center justify-center disabled:text-light-ash"
                            >
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
                                </svg>
                            </button>
                        </div>

                        <button
                            type="button"
                            disabled={!selectedVariant?.purchasable || isAdding}
                            onClick={() => handleAddToCart(false)}
                            className="bg-primary hover:bg-dark-primary text-white px-6 py-2.5 rounded-md font-semibold disabled:bg-light-ash disabled:cursor-not-allowed"
                        >
                            Add to Cart
                        </button>

                        <button
                            type="button"
                            disabled={!selectedVariant?.purchasable || isAdding}
                            onClick={() => handleAddToCart(true)}
                            className="bg-dark hover:bg-dark-primary text-white px-6 py-2.5 rounded-md font-semibold disabled:bg-light-ash disabled:cursor-not-allowed"
                        >
                            Buy Now
                        </button>

                        <button
                            type="button"
                            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                            aria-pressed={inWishlist}
                            onClick={handleWishlist}
                            className={`rounded border p-2.5 ${inWishlist ? 'border-primary text-primary' : 'border-light-ash text-gray hover:border-primary'}`}
                        >
                            <WishListLgIcon />
                        </button>
                    </div>

                    {cartQuantity > 0 && (
                        <p className="mt-3 text-sm text-gray">
                            {cartQuantity} already in your{' '}
                            <Link href="/cart" className="text-primary font-medium hover:underline">cart</Link>.
                        </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-4">
                        <span className="text-primary font-semibold">Share this product:</span>
                        {[
                            ['facebook', <FacebookIcon key="f" />, 'Share on Facebook'],
                            ['twitter', <XIcon key="x" />, 'Share on Twitter'],
                            ['whatsapp', <WhatsappIcon key="w" />, 'Share on WhatsApp'],
                            ['telegram', <TelegramIcon key="t" />, 'Share on Telegram'],
                        ].map(([key, icon, label]) => (
                            <a
                                key={key}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                href={shareLinks[key]}
                                className="hover:opacity-80 transition-opacity"
                            >
                                {icon}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-10">
                <div className="flex gap-6 border-b border-light-white">
                    {[
                        ['description', 'Description'],
                        ['reviews', `Reviews (${product.rating.count})`],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setActiveTab(key)}
                            aria-current={activeTab === key}
                            className={`pb-2 font-semibold ${
                                activeTab === key
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-gray hover:text-dark'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="py-5">
                    {activeTab === 'description' ? (
                        <div className="text-gray leading-7 whitespace-pre-line">
                            {product.description || 'No description has been provided for this product.'}
                        </div>
                    ) : (
                        <ReviewList reviews={reviewList} isAuthenticated={isAuthenticated} productId={product.id} />
                    )}
                </div>
            </div>

            {/* Related */}
            {related.length > 0 && (
                <section className="mt-10">
                    <h2 className="text-xl font-semibold text-dark mb-4">You may also like</h2>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                        {related.map((entry) => (
                            <ProductCard
                                key={entry.id}
                                product={entry}
                                quantity={cartItems.find((line) => line.variantId === entry.defaultVariantId)?.quantity ?? 0}
                                onAdd={() => addToCart(entry.defaultVariantId, 1)}
                                onIncrease={() => {}}
                                onDecrease={() => {}}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

/**
 * The reviews for a product, with a form for a shopper who has bought it.
 */
function ReviewList({ reviews, isAuthenticated, productId }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (event) => {
        event.preventDefault();

        if (!comment.trim()) {
            toast.error('Please write your review before submitting.');
            return;
        }

        setSubmitting(true);

        try {
            await reviewApi.createReview(productId, { rating, comment: comment.trim() });
            setComment('');
            toast.success('Thank you — your review has been submitted.');
        } catch (err) {
            toast.error(err.message || 'Could not submit your review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
                {reviews.length === 0 ? (
                    <p className="text-gray">No reviews yet. Be the first to review this product.</p>
                ) : (
                    reviews.map((review) => (
                        <article key={review.id} className="border-b border-light-white pb-4">
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-dark">{review.author?.name ?? 'Customer'}</span>
                                <RatingStars average={review.rating} />
                            </div>
                            <p className="mt-1 text-xs text-gray">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString('en-GB') : ''}
                                {review.is_verified_purchase && ' · Verified purchase'}
                            </p>
                            <p className="mt-2 text-gray leading-6">{review.comment}</p>
                        </article>
                    ))
                )}
            </div>

            <div className="lg:col-span-1">
                {isAuthenticated ? (
                    <form onSubmit={submit} className="space-y-3 rounded-md border border-light-white p-4">
                        <h3 className="font-semibold text-dark">Write a review</h3>
                        <div>
                            <label htmlFor="review-rating" className="block text-sm text-gray mb-1">Rating</label>
                            <select
                                id="review-rating"
                                value={rating}
                                onChange={(e) => setRating(Number(e.target.value))}
                                className="w-full rounded border border-light-ash px-3 py-2 text-sm"
                            >
                                {[5, 4, 3, 2, 1].map((value) => (
                                    <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="review-comment" className="block text-sm text-gray mb-1">Your review</label>
                            <textarea
                                id="review-comment"
                                rows={4}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full rounded border border-light-ash px-3 py-2 text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-primary w-full rounded px-4 py-2 text-sm font-semibold text-white disabled:bg-light-ash"
                        >
                            {submitting ? 'Submitting…' : 'Submit review'}
                        </button>
                    </form>
                ) : (
                    <p className="rounded-md border border-light-white p-4 text-sm text-gray">
                        <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link> to leave a review.
                    </p>
                )}
            </div>
        </div>
    );
}

export default Product;
