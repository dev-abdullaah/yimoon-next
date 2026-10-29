// app/(shop)/product/[productId]/[slug]/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useFloatingCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { catalogApi, recommendationApi, reviewApi, wishlistApi, PLACEHOLDER_IMAGE } from '@/lib/api';
import { toProductView, selectableVariants, variantOptionAxes, VariantView } from '@/lib/productView';
import { getProductRelativeUrl, getCategoryRelativeUrl } from '@/utils/urlHelper';
import { ProductCard } from '@/components/Home/Products/ProductRow';
import QuickView from '@/components/QuickView';
import useQuickView from '@/hooks/useQuickView';
import FacebookIconMD from '@/components/Icons/FacebookIconMD';
import WhatsappIconMD from '@/components/Icons/WhatsappIconMD';
import TelegramIconMD from '@/components/Icons/TelegramIconMD';
import WishListIconLG from '@/components/Icons/WishListIconLG';
import RightArrowIconLG from '@/components/Icons/RightArrowIconLG';
import ShippedIconMD from '@/components/Icons/ShippedIconMD';
import AddressIconMD from '@/components/Icons/AddressIconMD';
import TakaIconSM from '@/components/Icons/TakaIconSM';
import ReturnMoneyIconMD from '@/components/Icons/ReturnMoneyIconMD';
import ShieldIconMD from '@/components/Icons/ShieldIconMD';
import RedPhoneCallIconMD from '@/components/Icons/RedPhoneCallIconMD';

/** Star row for a 0–5 rating. */
interface RatingStarsProps {
    average: number | string;
    count?: number;
    size?: string;
}

function RatingStars({ average, count = 0, size = 'text-sm' }: RatingStarsProps) {
    const rounded = Math.round(Number(average) || 0);

    return (
        <span className="inline-flex items-center gap-1">
            <span className={`inline-flex ${size} text-warning`} aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={star <= rounded ? 'text-warning' : 'text-light-ash'}
                    >
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
    const params = useParams<{ productId: string; slug: string }>();
    const productId = params?.productId;
    const slug = params?.slug;
    const router = useRouter();
    const { addToCart, cartItems, increaseQty, decreaseQty } = useFloatingCart();
    const { isAuthenticated } = useAuth();

    const [quantity, setQuantity] = useState<number>(1);
    const [activeImage, setActiveImage] = useState<number>(0);
    const [selection, setSelection] = useState<Record<string, string | number>>({});
    const [activeTab, setActiveTab] = useState<string>('description');
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [inWishlist, setInWishlist] = useState<boolean>(false);

    const {
        selectedProduct,
        showQuickView,
        handleQuickViewOpen,
        handleQuickViewClose,
    } = useQuickView();

    const { data, isLoading, error } = useQuery({
        queryKey: ['product', slug],
        queryFn: () => (slug ? catalogApi.getProduct(slug) : null),
        retry: 0,
        enabled: Boolean(slug),
    });

    const product = useMemo(() => toProductView(data?.data ?? data), [data]);

    // Keep canonical URL synchronized
    useEffect(() => {
        if (!product) return;

        if (String(product.id) !== String(productId) || product.slug !== slug) {
            router.replace(getProductRelativeUrl(product));
        }
    }, [product, productId, slug, router]);

    const variants = useMemo(() => selectableVariants(product), [product]);
    const axes = useMemo(() => variantOptionAxes(product), [product]);

    /**
     * Resolves the selected variant based on user attribute choices.
     */
    const selectedVariant = useMemo<VariantView | null>(() => {
        if (variants.length === 0) return product?.defaultVariant ?? null;

        const chosen = Object.entries(selection);
        const matches = variants.filter((variant) => chosen.every(([axis, value]) => {
            const attribute = variant.attributes?.[axis];
            const label = attribute && typeof attribute === 'object'
                ? ((attribute as any).name ?? (attribute as any).value)
                : attribute;
            return String(label) === String(value);
        }));

        if (matches.length === 0) return product?.defaultVariant ?? variants[0] ?? null;
        if (matches.length === 1) return matches[0];

        return [...matches].sort((a, b) => a.price - b.price)[0];
    }, [variants, selection, product?.defaultVariant]);

    // Initialize option choices
    useEffect(() => {
        if (!product) return;

        const initial: Record<string, string | number> = {};

        for (const axis of axes) {
            const preferred = selectedVariant?.attributes?.[axis.name];
            const label = preferred && typeof preferred === 'object'
                ? ((preferred as any).name ?? (preferred as any).value)
                : preferred;
            initial[axis.name] = label ?? axis.values[0]?.label ?? '';
        }

        setSelection(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id, axes.length]);

    // Clamp quantity to available stock
    useEffect(() => {
        const ceiling = selectedVariant?.stockQuantity || 0;
        setQuantity((prev) => (ceiling > 0 ? Math.min(prev, ceiling) : prev));
    }, [selectedVariant?.id, selectedVariant?.stockQuantity]);

    // Related products query
    const relatedQuery = useQuery({
        queryKey: ['related', product?.id, product?.category?.id],
        queryFn: async () => {
            if (!product?.id) return [];
            try {
                const res = await recommendationApi.related(product.id);
                const list = res?.data?.products ?? res?.products ?? [];
                if (list.length > 0) return list;
            } catch {
                // fall through to category fallback
            }

            if (product.category?.slug) {
                const catRes = await catalogApi.getCategoryProducts(product.category.slug, { per_page: 7 });
                const catList = catRes?.data ?? catRes ?? [];
                return catList.filter((p: any) => p.id !== product.id);
            }
            return [];
        },
        enabled: Boolean(product?.id),
    });

    const related = useMemo(() => {
        const raw = Array.isArray(relatedQuery.data)
            ? relatedQuery.data
            : (relatedQuery.data?.data?.products ?? relatedQuery.data?.products ?? []);
        return raw.map(toProductView).filter((entry: any) => entry && entry.id !== product?.id).slice(0, 6);
    }, [relatedQuery.data, product?.id]);

    // Wishlist check
    const wishlistQuery = useQuery({
        queryKey: ['wishlist', 'check', selectedVariant?.id],
        queryFn: () => (selectedVariant?.id ? wishlistApi.checkWishlist(selectedVariant.id) : null),
        enabled: isAuthenticated && Boolean(selectedVariant?.id),
    });

    useEffect(() => {
        const payload = wishlistQuery.data?.data ?? wishlistQuery.data;
        if (payload) setInWishlist(Boolean(payload.in_wishlist ?? payload.exists));
    }, [wishlistQuery.data]);

    const cartLine = useMemo(() => {
        return cartItems.find((item) => item.variantId === selectedVariant?.id);
    }, [cartItems, selectedVariant?.id]);

    const cartQuantity = cartLine ? cartLine.quantity : 0;
    const displayQuantity = cartQuantity > 0 ? cartQuantity : quantity;

    const handleSelect = useCallback((axisName: string, value: string | number) => {
        setSelection((prev) => {
            const next = { ...prev, [axisName]: value };

            const stillValid = selectableVariants({ variants }).some((variant) =>
                Object.entries(next).every(([axis, chosen]) => {
                    const attribute = variant.attributes?.[axis];
                    const label = attribute && typeof attribute === 'object'
                        ? ((attribute as any).name ?? (attribute as any).value)
                        : attribute;
                    return String(label) === String(chosen);
                })
            );

            return stillValid ? next : { [axisName]: value };
        });
    }, [variants]);

    const handleQuantityChange = useCallback(async (action: 'increase' | 'decrease') => {
        if (cartLine) {
            if (action === 'increase') {
                const ceiling = selectedVariant?.stockQuantity || cartLine.maxQuantity || Infinity;
                if (cartLine.quantity < ceiling) {
                    await increaseQty(cartLine.id);
                } else {
                    toast.error(`Only ${ceiling} items available in stock.`);
                }
            } else if (action === 'decrease') {
                await decreaseQty(cartLine.id);
            }
        } else {
            if (action === 'increase') {
                const ceiling = selectedVariant?.stockQuantity || Infinity;
                setQuantity((prev) => Math.min(prev + 1, ceiling));
            } else if (action === 'decrease') {
                setQuantity((prev) => Math.max(1, prev - 1));
            }
        }
    }, [cartLine, selectedVariant?.stockQuantity, increaseQty, decreaseQty]);

    const handleAddToCart = useCallback(async (thenCheckout = false) => {
        const targetVariant = selectedVariant || product?.defaultVariant || variants[0];
        if (!targetVariant?.purchasable && !targetVariant?.inStock) {
            toast.error('This option is currently unavailable.');
            return;
        }

        setIsAdding(true);

        try {
            if (thenCheckout && cartLine) {
                router.push('/checkout');
                return;
            }

            const qtyToAdd = cartLine ? 1 : quantity;
            await addToCart(targetVariant.id, qtyToAdd, product?.name);

            if (thenCheckout) {
                router.push('/checkout');
            }
        } finally {
            setIsAdding(false);
        }
    }, [addToCart, selectedVariant, product?.defaultVariant, variants, quantity, cartLine, router, product?.name]);

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
        } catch (err: any) {
            toast.error(err.message || 'Could not update your wishlist');
        }
    }, [isAuthenticated, inWishlist, selectedVariant, router]);

    if (isLoading) {
        return <ProductSkeleton />;
    }

    if (error || !product) {
        return (
            <div className="container mx-auto px-5 md:px-7 lg:px-12 py-20 text-center">
                <h1 className="text-2xl font-semibold text-dark">Product not found</h1>
                <p className="mt-2 text-gray">
                    This product may have been removed or is no longer available.
                </p>
                <Link href="/catalog" className="bg-primary mt-6 inline-block rounded-md px-6 py-2.5 text-white font-medium hover:bg-dark-primary transition-colors">
                    Continue Shopping
                </Link>
            </div>
        );
    }

    const gallery = product.gallery.length ? product.gallery : [PLACEHOLDER_IMAGE];
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${product.name} ${shareUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.name)}`,
    };

    const reviewList = data?.data?.reviews ?? data?.reviews ?? [];

    const effectivePrice = selectedVariant?.price ?? product.price ?? 0;
    const comparePrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice ?? null;
    const hasDiscount = comparePrice !== null && Number(comparePrice) > Number(effectivePrice);
    const saveAmount = hasDiscount ? Math.round(Number(comparePrice) - Number(effectivePrice)) : 0;
    const brandName = typeof product.brand === 'object' && product.brand !== null
        ? ((product.brand as any).name || 'King Queen')
        : (product.brand || 'King Queen');

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12 py-5 md:py-8">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="text-sm text-gray mb-6">
                <ol className="flex flex-wrap items-center gap-1.5">
                    <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li><Link href="/catalog" className="hover:text-primary transition-colors">Shop</Link></li>
                    {product.category && (
                        <>
                            <li aria-hidden="true">/</li>
                            <li>
                                <Link href={getCategoryRelativeUrl(product.category)} className="hover:text-primary transition-colors">
                                    {product.category.name}
                                </Link>
                            </li>
                        </>
                    )}
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="text-dark font-medium truncate max-w-[250px] sm:max-w-none">{product.name}</li>
                </ol>
            </nav>

            <section className="mb-8 grid grid-cols-4 gap-8 xl:gap-12 2xl:grid-cols-5">
                {/* Main Product Column (Col 1-4) */}
                <div className="col-span-4 space-y-10">
                    <div className="text-dark border-light-ash relative grid grid-cols-12 gap-6 border-b pb-8 lg:gap-8 lg:border-none lg:pb-0 xl:gap-12">
                        {/* Gallery Section (5 Columns) */}
                        <div className="col-span-full my-auto py-2 md:col-span-6 md:py-0 lg:col-span-5">
                            <div className="space-y-3">
                                <div className="relative overflow-hidden rounded-md border border-light-white bg-white">
                                    <img
                                        src={gallery[Math.min(activeImage, gallery.length - 1)]}
                                        alt={product.name}
                                        width="540"
                                        height="540"
                                        className="aspect-square w-full object-cover rounded-md"
                                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                                    />
                                </div>
                                {gallery.length > 1 && (
                                    <div className="flex flex-wrap gap-2.5 pt-1">
                                        {gallery.map((image, index) => (
                                            <button
                                                key={image + index}
                                                type="button"
                                                aria-label={`Show image ${index + 1}`}
                                                aria-current={index === activeImage}
                                                onClick={() => setActiveImage(index)}
                                                className={`w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-md border-2 transition-all ${
                                                    index === activeImage ? 'border-primary shadow-sm' : 'border-light-white opacity-70 hover:opacity-100'
                                                }`}
                                            >
                                                <img
                                                    src={image}
                                                    alt=""
                                                    width="80"
                                                    height="80"
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product Details Section (7 Columns) */}
                        <div className="relative col-span-full md:col-span-6 lg:col-span-7">
                            <div>
                                <h1 className="text-dark text-xl leading-snug font-medium md:text-2xl xl:text-[28px] xl:leading-[34px]">
                                    {product.name}
                                </h1>
                                <h2 className="text-primary animate-text-blink mt-2 font-semibold uppercase text-xs md:text-sm tracking-wide">
                                    Available online and in-store
                                </h2>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm text-gray">
                                            <span>Brand : </span>
                                            <span className="font-semibold text-primary">{brandName}</span>
                                        </p>
                                        {product.productCode && (
                                            <>
                                                <span className="text-light-ash">|</span>
                                                <p className="text-sm text-gray">
                                                    <span>SKU : </span>
                                                    <span className="font-semibold text-primary">{product.productCode}</span>
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <RatingStars average={product.rating.average} count={product.rating.count} />
                                </div>
                            </div>

                            {/* Price Block */}
                            <div className="pt-3 border-t border-light-ash mt-3 sm:flex items-center lg:items-start justify-between">
                                <ul className="border-l-[6px] border-success px-3 flex items-center gap-4">
                                    <li>
                                        <p className="flex items-center font-semibold text-dark text-3xl xl:text-4xl">
                                            <span className="mr-1 text-2xl xl:text-3xl">৳</span> {effectivePrice}
                                        </p>
                                    </li>
                                    {hasDiscount && (
                                        <>
                                            <li>
                                                <p className="my-auto relative font-semibold flex items-center text-xl xl:text-2xl text-light-ash">
                                                    <span className="mr-0.5 text-lg">৳</span>
                                                    {comparePrice}
                                                    <span className="absolute inset-0 w-full h-[2px] bg-danger transform rotate-[-6deg] top-1/2 -translate-y-1/2" />
                                                </p>
                                            </li>
                                            <li>
                                                <p className="bg-danger text-white px-2 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-md py-0.5">
                                                    <span className="font-medium text-[11px] sm:text-xs">Save</span>
                                                    <span className="text-xs font-medium">৳</span>
                                                    <span>{saveAmount}</span>
                                                </p>
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>

                            {/* Stock Indicator */}
                            <div className="my-3 space-y-2">
                                <p className="text-sm">
                                    <span className="text-gray">Stock : </span>
                                    <span className={`font-semibold ${selectedVariant?.inStock ?? product.inStock ? 'text-success' : 'text-danger'}`}>
                                        {selectedVariant?.inStock ?? product.inStock
                                            ? `In Stock (${selectedVariant?.stockQuantity ?? product.stockQuantity} available)`
                                            : 'Currently Out of Stock'}
                                    </span>
                                </p>
                            </div>

                            {/* Variant Pickers (Size, Color, etc.) */}
                            {axes.map((axis) => {
                                const isSize = axis.name.toLowerCase() === 'size';
                                const isColor = axis.name.toLowerCase() === 'color' || axis.name.toLowerCase() === 'colour';

                                return (
                                    <div key={axis.name} className="mt-4">
                                        <h3 className="text-dark font-medium text-sm mb-1.5 capitalize">
                                            {axis.name} : <span className="font-semibold text-primary">{selection[axis.name]}</span>
                                        </h3>
                                        <div className="flex flex-wrap gap-2.5">
                                            {axis.values.map((option) => {
                                                const isSelected = selection[axis.name] === option.label;

                                                const available = variants.some((variant) => {
                                                    const attribute = variant.attributes?.[axis.name];
                                                    const label = attribute && typeof attribute === 'object'
                                                        ? ((attribute as any).name ?? (attribute as any).value)
                                                        : attribute;
                                                    if (String(label) !== String(option.label)) return false;
                                                    if (isSelected) return true;

                                                    return Object.entries(selection).every(([name, chosen]) => {
                                                        if (name === axis.name) return true;
                                                        const other = variant.attributes?.[name];
                                                        const otherLabel = other && typeof other === 'object'
                                                            ? ((other as any).name ?? (other as any).value)
                                                            : other;
                                                        return String(otherLabel) === String(chosen);
                                                    });
                                                });

                                                if (isSize) {
                                                    return (
                                                        <button
                                                            key={String(option.label)}
                                                            type="button"
                                                            disabled={!available}
                                                            onClick={() => handleSelect(axis.name, option.label)}
                                                            aria-label={`select-size-${option.label}`}
                                                            className={`h-9 min-w-[48px] rounded-md px-3 text-sm font-semibold uppercase transition-all ${
                                                                isSelected
                                                                    ? 'bg-primary border-2 border-primary text-white shadow-sm'
                                                                    : available
                                                                        ? 'border-2 border-primary text-gray hover:bg-primary/10'
                                                                        : 'border-2 border-light-ash text-light-ash cursor-not-allowed line-through'
                                                            }`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    );
                                                }

                                                if (isColor && option.hex) {
                                                    return (
                                                        <button
                                                            key={String(option.label)}
                                                            type="button"
                                                            disabled={!available}
                                                            onClick={() => handleSelect(axis.name, option.label)}
                                                            aria-label={`select-color-${option.label}`}
                                                            className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                                                                isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-light-ash'
                                                            }`}
                                                            style={{ backgroundColor: option.hex }}
                                                            title={String(option.label)}
                                                        />
                                                    );
                                                }

                                                return (
                                                    <button
                                                        key={String(option.label)}
                                                        type="button"
                                                        disabled={!available}
                                                        onClick={() => handleSelect(axis.name, option.label)}
                                                        className={`rounded-md border px-3.5 py-1.5 text-sm font-medium transition-all ${
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
                                );
                            })}

                            {/* Quantity Stepper */}
                            <div className="mt-5 flex items-center gap-3 text-base">
                                <h3 className="font-medium text-dark">Quantity :</h3>
                                <div
                                    style={{ height: '40px', width: '130px' }}
                                    className="border-primary text-primary flex h-10 w-32 items-center justify-around rounded border-2"
                                >
                                    <button
                                        type="button"
                                        aria-label="decrease quantity"
                                        disabled={cartLine ? false : quantity <= 1}
                                        onClick={() => handleQuantityChange('decrease')}
                                        className="disabled:text-light-ash p-2 font-semibold hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                                        </svg>
                                    </button>
                                    <p className="text-base font-semibold text-dark select-none">{displayQuantity}</p>
                                    <button
                                        type="button"
                                        aria-label="increase quantity"
                                        disabled={
                                            cartLine
                                                ? cartLine.quantity >= (selectedVariant?.stockQuantity || cartLine.maxQuantity || Infinity)
                                                : quantity >= (selectedVariant?.stockQuantity || Infinity)
                                        }
                                        onClick={() => handleQuantityChange('increase')}
                                        className="disabled:text-light-ash p-2 font-semibold hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
                                        </svg>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                                    aria-pressed={inWishlist}
                                    onClick={handleWishlist}
                                    style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                                    className={`border-primary text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 transition-all cursor-pointer ${
                                        inWishlist ? 'bg-red-50' : 'hover:bg-primary/5'
                                    }`}
                                    title={inWishlist ? 'In your wishlist (click to remove)' : 'Add to wishlist'}
                                >
                                    <WishListIconLG
                                        className="h-6 w-6 transition-transform hover:scale-110"
                                        style={{ width: '24px', height: '24px' }}
                                        fill={inWishlist ? 'currentColor' : 'none'}
                                        stroke="currentColor"
                                    />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="border-light-ash grid grid-cols-2 gap-4 py-4 text-base font-bold sm:text-lg lg:border-b mt-2">
                                <button
                                    type="button"
                                    className="bg-dark-ash hover:bg-gray disabled:bg-dark-ash/40 rounded-md p-2.5 text-white transition-colors uppercase tracking-wider text-sm font-semibold"
                                    aria-label="Add to Cart"
                                    onClick={() => handleAddToCart(false)}
                                    disabled={!selectedVariant?.purchasable || isAdding}
                                >
                                    {isAdding ? 'ADDING...' : 'ADD TO CART'}
                                </button>
                                <button
                                    type="button"
                                    className="bg-primary hover:bg-dark-primary disabled:bg-primary/40 rounded-md p-2.5 text-white uppercase transition-colors tracking-wider text-sm font-semibold"
                                    aria-label="Buy Now"
                                    onClick={() => handleAddToCart(true)}
                                    disabled={!selectedVariant?.purchasable || isAdding}
                                >
                                    {isAdding ? 'PROCESSING...' : 'BUY NOW'}
                                </button>
                            </div>

                            {cartQuantity > 0 && (
                                <p className="mt-2 text-sm text-gray">
                                    <span className="font-semibold text-primary">{cartQuantity}</span> already in your{' '}
                                    <Link href="/cart" className="text-primary font-medium hover:underline">cart</Link>.
                                </p>
                            )}

                            {/* Social Share Section */}
                            <div className="mt-4">
                                <p className="text-primary font-semibold text-sm">Share On Social Media</p>
                                <ul className="mt-1 flex gap-3.5">
                                    <li>
                                        <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Share on Facebook"
                                            href={shareLinks.facebook}
                                            className="hover:opacity-80 transition-opacity"
                                        >
                                            <FacebookIconMD />
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Share on WhatsApp"
                                            href={shareLinks.whatsapp}
                                            className="hover:opacity-80 transition-opacity"
                                        >
                                            <WhatsappIconMD />
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Share on Telegram"
                                            href={shareLinks.telegram}
                                            className="hover:opacity-80 transition-opacity"
                                        >
                                            <TelegramIconMD />
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Product Information Tabs */}
                    <section aria-labelledby="product-info-section" className="pt-2">
                        <h2 id="product-info-section" className="sr-only">Product Information Tabs</h2>
                        <div
                            role="tablist"
                            aria-label="Product Information Tabs"
                            className="scrollbar-hidden text-dark-ash border-light-white mb-5 inline-flex w-full space-x-2 overflow-x-auto border-b text-sm md:w-auto"
                        >
                            {[
                                ['description', 'Description'],
                                ['specifications', 'Specifications'],
                                ['reviews', `Reviews (${reviewList.length})`],
                                ['shipping', 'Delivery & Return'],
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    role="tab"
                                    id={`tab-${key}`}
                                    type="button"
                                    aria-selected={activeTab === key}
                                    onClick={() => setActiveTab(key)}
                                    className={`hover:text-dark-primary inline min-w-max cursor-pointer px-4 pb-2 font-bold transition-all duration-300 ease-in-out ${
                                        activeTab === key
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-gray border-b-2 border-transparent'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="catalog-card p-5 break-words">
                            {activeTab === 'description' && (
                                <div className="text-gray leading-7 whitespace-pre-line text-sm md:text-base">
                                    {product.description || 'No description available for this product.'}
                                </div>
                            )}

                            {activeTab === 'specifications' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <tbody>
                                            <tr className="border-b border-light-white">
                                                <td className="py-2.5 font-medium text-dark w-1/3">Brand</td>
                                                <td className="py-2.5 text-gray">{brandName}</td>
                                            </tr>
                                            {product.productCode && (
                                                <tr className="border-b border-light-white">
                                                    <td className="py-2.5 font-medium text-dark">SKU</td>
                                                    <td className="py-2.5 text-gray">{product.productCode}</td>
                                                </tr>
                                            )}
                                            {product.category && (
                                                <tr className="border-b border-light-white">
                                                    <td className="py-2.5 font-medium text-dark">Category</td>
                                                    <td className="py-2.5 text-gray">{product.category.name}</td>
                                                </tr>
                                            )}
                                            <tr className="border-b border-light-white">
                                                <td className="py-2.5 font-medium text-dark">Availability</td>
                                                <td className="py-2.5 text-gray">{product.inStock ? 'In Stock' : 'Out of Stock'}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5 font-medium text-dark">Warranty</td>
                                                <td className="py-2.5 text-gray">1 Month Local Seller Warranty</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <ReviewList reviews={reviewList} isAuthenticated={isAuthenticated} productId={product.id} />
                            )}

                            {activeTab === 'shipping' && (
                                <div className="text-gray text-sm md:text-base space-y-3 leading-6">
                                    <p className="font-semibold text-dark">Delivery Information:</p>
                                    <ul className="space-y-1" style={{ listStyle: 'none', paddingLeft: 0 }}>
                                        <li>Inside Dhaka City: 2–3 working days (Standard delivery charge applies).</li>
                                        <li>Outside Dhaka City: 3–5 working days via reliable nationwide courier service.</li>
                                        <li>Cash on Delivery available all over Bangladesh.</li>
                                    </ul>
                                    <p className="font-semibold text-dark pt-3">Replacement & Return Policy:</p>
                                    <ul className="space-y-1" style={{ listStyle: 'none', paddingLeft: 0 }}>
                                        <li><strong className="text-dark">15 Days</strong> replacement policy for damaged, defective, or incorrect items.</li>
                                        <li>Products must be unused, unaltered, with original packaging and invoice intact.</li>
                                        <li>Dedicated customer support ready to assist you 7 days a week.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Sidebar - Service Features / Why Shop with Us (Col 5 on 2xl) */}
                <div className="col-span-full grid grid-cols-2 gap-6 2xl:col-span-1">
                    <section
                        aria-labelledby="service-features"
                        className="text-gray bg-light-white 3xl:py-5 3xl:px-6 hidden rounded-xl p-4 text-sm font-medium sm:block 2xl:col-span-2 2xl:min-h-[580px]"
                    >
                        <h2 id="service-features" className="text-dark font-semibold text-base mb-4 border-b border-light-ash/40 pb-2">
                            Why Shop with Us
                        </h2>
                        <ul role="list" className="space-y-4">
                            <li className="flex items-center gap-3">
                                <span className="hp-trust__icon">
                                    <ShippedIconMD className="w-5 h-5" />
                                </span>
                                <p>Less shipping cost inside <span className="font-bold text-dark">Dhaka City</span></p>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="hp-trust__icon">
                                    <AddressIconMD className="w-5 h-5" />
                                </span>
                                <p>Home delivery all over Bangladesh</p>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="hp-trust__icon">
                                    <TakaIconSM className="w-5 h-5" />
                                </span>
                                <p>Various payment methods</p>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="hp-trust__icon">
                                    <ReturnMoneyIconMD className="w-5 h-5" />
                                </span>
                                <p><span className="font-bold text-dark">15 Days </span>replacement policy only for<span className="font-bold text-dark"> certain products</span></p>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="hp-trust__icon">
                                    <ShieldIconMD className="w-5 h-5" />
                                </span>
                                <p>1 Month Local Seller Warranty</p>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="hp-trust__icon">
                                    <RedPhoneCallIconMD className="w-5 h-5" />
                                </span>
                                <p>Dedicated Customer Support</p>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="hp-trust__icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                                        <path d="m9 12 2 2 4-4" />
                                    </svg>
                                </span>
                                <p>Verified and Trusted Sellers</p>
                            </li>
                        </ul>
                    </section>
                </div>

                {/* Related Products Section */}
                <div className="relative col-span-full mt-4">
                    {showQuickView && (
                        <QuickView
                            product={selectedProduct}
                            onClose={handleQuickViewClose}
                        />
                    )}

                    <div className="sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-slate-100 text-dark rounded-xl">
                        <div className="flex items-center justify-between lg:px-6">
                            <div>
                                <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl capitalize">
                                    Related Products
                                </h2>
                            </div>
                            <Link
                                className="text-dark hover:text-primary transition-colors flex items-center md:gap-1 text-sm font-semibold md:text-base xl:text-xl"
                                href={product.category ? getCategoryRelativeUrl(product.category) : '/catalog'}
                            >
                                See More<span className="sr-only">Related Products Collection</span>
                                <RightArrowIconLG />
                            </Link>
                        </div>
                        <div className="py-4 lg:py-6 lg:px-6">
                            {related.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {related.map((entry: any) => (
                                        <ProductCard
                                            key={entry.id}
                                            product={entry}
                                            quantity={cartItems.find((line) => line.variantId === entry.defaultVariantId)?.quantity ?? 0}
                                            onAdd={() => {
                                                addToCart(entry.defaultVariantId, 1, entry.name);
                                            }}
                                            onIncrease={() => {
                                                const line = cartItems.find((item) => item.variantId === entry.defaultVariantId);
                                                if (line) increaseQty(line.id);
                                            }}
                                            onDecrease={() => {
                                                const line = cartItems.find((item) => item.variantId === entry.defaultVariantId);
                                                if (line) decreaseQty(line.id);
                                            }}
                                            onQuickView={handleQuickViewOpen}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-8 text-gray">No related products found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

interface Review {
    id: number | string;
    author?: { name?: string };
    rating: number;
    created_at?: string;
    is_verified_purchase?: boolean;
    comment: string;
}

interface ReviewListProps {
    reviews: Review[];
    isAuthenticated: boolean;
    productId: string | number;
}

/**
 * Reviews list and review submission form
 */
function ReviewList({ reviews, isAuthenticated, productId }: ReviewListProps) {
    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
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
        } catch (err: any) {
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
                            className="bg-primary w-full rounded px-4 py-2 text-sm font-semibold text-white disabled:bg-light-ash hover:bg-dark-primary transition-colors"
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

/**
 * Skeleton loader matching the complete product layout
 */
function ProductSkeleton() {
    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12 py-5 md:py-8">
            <div className="h-4 w-48 bg-slate-200 animate-pulse rounded mb-6" />
            <section className="mb-8 grid grid-cols-4 gap-8 xl:gap-12 2xl:grid-cols-5">
                <div className="col-span-4 space-y-10">
                    <div className="grid grid-cols-12 gap-6 lg:gap-8 xl:gap-12">
                        <div className="col-span-full md:col-span-6 lg:col-span-5">
                            <div className="aspect-square w-full rounded-md bg-slate-200 animate-pulse" />
                            <div className="flex gap-2.5 mt-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-16 h-16 rounded-md bg-slate-200 animate-pulse" />
                                ))}
                            </div>
                        </div>
                        <div className="col-span-full md:col-span-6 lg:col-span-7 space-y-4">
                            <div className="h-8 w-3/4 rounded bg-slate-200 animate-pulse" />
                            <div className="h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
                            <div className="h-10 w-1/2 rounded bg-slate-200 animate-pulse mt-4" />
                            <div className="h-6 w-1/4 rounded bg-slate-200 animate-pulse" />
                            <div className="h-12 w-full rounded bg-slate-200 animate-pulse mt-6" />
                        </div>
                    </div>
                </div>
                <div className="col-span-full 2xl:col-span-1 hidden 2xl:block">
                    <div className="h-[580px] rounded-xl bg-slate-100 animate-pulse p-4 space-y-6">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="h-8 w-full bg-slate-200 rounded" />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Product;
