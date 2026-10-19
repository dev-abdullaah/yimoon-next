// app/(marketing)/landing/[slug]/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect, FormEvent, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useFloatingCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { catalogApi, reviewApi, checkoutApi, PLACEHOLDER_IMAGE } from '@/lib/api';
import { toProductView, selectableVariants, variantOptionAxes, VariantView } from '@/lib/productView';
import { getProductRelativeUrl, getCategoryRelativeUrl } from '@/utils/urlHelper';
import { fbTrack } from '@/utils/fbpixel';

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

export default function ProductLandingPage() {
    const params = useParams<{ slug: string }>();
    const slug = params?.slug;
    const router = useRouter();
    const searchParams = useSearchParams();

    const { addToCart, cartItems, increaseQty, decreaseQty, clearCart } = useFloatingCart();
    const { isAuthenticated } = useAuth();

    // Product and Variant States
    const [quantity, setQuantity] = useState<number>(1);
    const [activeImage, setActiveImage] = useState<number>(0);
    const [selection, setSelection] = useState<Record<string, string | number>>({});
    const [activeTab, setActiveTab] = useState<string>('description');
    const [isAdding, setIsAdding] = useState<boolean>(false);

    // Landing Page Direct Checkout States
    const [customerName, setCustomerName] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [shippingZone, setShippingZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
    const [placedOrder, setPlacedOrder] = useState<any | null>(null);

    // UTM / Ad campaign attribution state
    const [utmData, setUtmData] = useState<{
        source?: string;
        medium?: string;
        campaign?: string;
        content?: string;
        term?: string;
        fbclid?: string;
        ttclid?: string;
    }>({});

    const hasTrackedCheckoutRef = useRef<boolean>(false);


    // Fetch product by slug or ID
    const { data, isLoading, error } = useQuery({
        queryKey: ['landing-product', slug],
        queryFn: () => (slug ? catalogApi.getProduct(slug) : null),
        retry: 1,
        enabled: Boolean(slug),
    });

    const product = useMemo(() => toProductView(data?.data ?? data), [data]);
    const variants = useMemo(() => selectableVariants(product), [product]);
    const axes = useMemo(() => variantOptionAxes(product), [product]);

    // Parse and persist UTM tracking parameters
    useEffect(() => {
        if (!searchParams) return;
        const utm = {
            source: searchParams.get('utm_source') || undefined,
            medium: searchParams.get('utm_medium') || undefined,
            campaign: searchParams.get('utm_campaign') || undefined,
            content: searchParams.get('utm_content') || undefined,
            term: searchParams.get('utm_term') || undefined,
            fbclid: searchParams.get('fbclid') || undefined,
            ttclid: searchParams.get('ttclid') || undefined,
        };

        if (Object.values(utm).some(Boolean)) {
            setUtmData(utm);
            try {
                sessionStorage.setItem('kq_landing_utm', JSON.stringify(utm));
            } catch {
                // ignore storage error
            }
        } else {
            try {
                const stored = sessionStorage.getItem('kq_landing_utm');
                if (stored) setUtmData(JSON.parse(stored));
            } catch {
                // ignore
            }
        }
    }, [searchParams]);

    // Track Facebook Pixel ViewContent event
    useEffect(() => {
        if (!product) return;
        fbTrack('ViewContent', {
            content_name: product.name,
            content_ids: [String(product.id)],
            content_type: 'product',
            value: product.price,
            currency: 'BDT',
        });
    }, [product]);

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

    const cartLine = useMemo(() => {
        return cartItems.find((item) => item.variantId === selectedVariant?.id);
    }, [cartItems, selectedVariant?.id]);

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

    const handleQuantityChange = useCallback((action: 'increase' | 'decrease') => {
        const ceiling = selectedVariant?.stockQuantity || Infinity;
        if (action === 'increase') {
            setQuantity((prev) => Math.min(prev + 1, ceiling));
        } else if (action === 'decrease') {
            setQuantity((prev) => Math.max(1, prev - 1));
        }
    }, [selectedVariant?.stockQuantity]);

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

    // Financial & Shipping Calculations
    const effectivePrice = selectedVariant?.price ?? product?.price ?? 0;
    const comparePrice = selectedVariant?.compareAtPrice ?? product?.compareAtPrice ?? null;
    const hasDiscount = comparePrice !== null && Number(comparePrice) > Number(effectivePrice);
    const saveAmount = hasDiscount ? Math.round(Number(comparePrice) - Number(effectivePrice)) : 0;
    const brandName = typeof product?.brand === 'object' && product?.brand !== null
        ? ((product.brand as any).name || 'King Queen')
        : (product?.brand || 'King Queen');

    const subtotal = effectivePrice * quantity;
    const isFreeShipping = quantity >= 3;
    const shippingCost = isFreeShipping ? 0 : (shippingZone === 'inside_dhaka' ? 80 : 120);
    const grandTotal = subtotal + shippingCost;

    // Smooth scroll to Direct Order Form
    const scrollToOrderForm = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (!hasTrackedCheckoutRef.current && product) {
            hasTrackedCheckoutRef.current = true;
            fbTrack('InitiateCheckout', {
                content_name: product.name,
                content_ids: [String(product.id)],
                value: grandTotal,
                currency: 'BDT',
                num_items: quantity,
            });
        }
        const el = document.getElementById('order-form');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Form Validation
    const validateForm = (): boolean => {
        const errors: { name?: string; phone?: string; address?: string } = {};

        if (!customerName.trim() || customerName.trim().length < 2) {
            errors.name = 'দয়া করে আপনার পূর্ণ নাম লিখুন';
        }

        const phoneClean = phoneNumber.trim().replace(/[^\d+]/g, '');
        const bdMobileRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
        if (!phoneClean || !bdMobileRegex.test(phoneClean)) {
            errors.phone = 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)';
        }

        if (!address.trim() || address.trim().length < 5) {
            errors.address = 'দয়া করে সম্পূর্ণ ঠিকানা লিখুন (বাসা/রোড, থানা, জেলা)';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle Direct Order Placement
    const handleDirectOrder = async (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('দয়া করে ফর্মের লাল চিহ্নিত তথ্যগুলো সঠিক করুন');
            return;
        }

        if (!product) return;

        const targetVariant = selectedVariant || product.defaultVariant || variants[0];
        if (!targetVariant?.purchasable && !targetVariant?.inStock) {
            toast.error('এই প্রোডাক্টটি বর্তমানে স্টকে নেই');
            return;
        }

        setIsSubmitting(true);

        try {
            // Synchronize cart with single landing purchase
            await clearCart();
            await addToCart(targetVariant.id, quantity, product.name);

            // Construct order attribution notes
            const utmParts = Object.entries(utmData)
                .filter(([_, v]) => Boolean(v))
                .map(([k, v]) => `${k}=${v}`)
                .join(', ');

            const orderNotes = notes.trim()
                ? `${notes.trim()}${utmParts ? ` [Ad Attribution: ${utmParts}]` : ''}`
                : (utmParts ? `[Ad Attribution: ${utmParts}]` : '');

            const payload = {
                recipient_name: customerName.trim(),
                phone_number: phoneNumber.trim(),
                line1: address.trim(),
                city: shippingZone === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
                postal_code: '1200',
                country: 'BD',
                payment_method: 'cod',
                instructions: orderNotes,
                comment: orderNotes,
            };

            const response = await checkoutApi.placeOrder(payload);
            const orderData = response?.data?.order || response?.order || response?.data || response;

            setPlacedOrder(orderData);
            toast.success('🎉 আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!');

            // Track Meta Pixel Purchase event
            fbTrack('Purchase', {
                content_name: product.name,
                content_ids: [String(product.id)],
                value: grandTotal,
                currency: 'BDT',
                num_items: quantity,
            });

            // Scroll up to confirmation block smoothly
            const formSection = document.getElementById('order-form');
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (err: any) {
            toast.error(err?.message || 'অর্ডার করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন বা ফোনে যোগাযোগ করুন।');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <ProductSkeleton />;
    }

    if (error || !product) {
        return (
            <div className="container mx-auto px-5 md:px-7 lg:px-12 py-20 text-center">
                <h1 className="text-2xl font-semibold text-dark">প্রোডাক্টটি পাওয়া যায়নি</h1>
                <p className="mt-2 text-gray">
                    দুঃখিত, আপনি যে প্রোডাক্টটির ল্যান্ডিং পেইজ খুঁজছেন তা বর্তমানে সক্রিয় নেই অথবা মুছে ফেলা হয়েছে।
                </p>
                <Link href="/catalog" className="bg-primary mt-6 inline-block rounded-md px-6 py-2.5 text-white font-medium hover:bg-dark-primary transition-colors">
                    অন্যান্য প্রোডাক্ট দেখুন
                </Link>
            </div>
        );
    }

    const gallery = product.gallery.length ? product.gallery : [PLACEHOLDER_IMAGE];
    const reviewList = data?.data?.reviews ?? data?.reviews ?? [];
    return (
        <main className="container mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-6 max-w-4xl overflow-x-hidden pb-36 md:pb-16">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-gray mb-3 sm:mb-5">
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

            <section className="mb-8 space-y-10">
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
                                        disabled={quantity <= 1}
                                        onClick={() => handleQuantityChange('decrease')}
                                        className="disabled:text-light-ash p-2 font-semibold hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                                        </svg>
                                    </button>
                                    <p className="text-base font-semibold text-dark select-none">{quantity}</p>
                                    <button
                                        type="button"
                                        aria-label="increase quantity"
                                        disabled={quantity >= (selectedVariant?.stockQuantity || Infinity)}
                                        onClick={() => handleQuantityChange('increase')}
                                        className="disabled:text-light-ash p-2 font-semibold hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Action Button - Direct Landing Order */}
                            <div className="pt-4 pb-2">
                                <button
                                    type="button"
                                    onClick={scrollToOrderForm}
                                    className="bg-primary hover:bg-dark-primary text-white w-full rounded-lg py-3.5 px-6 font-bold text-base sm:text-lg uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>⚡ সরাসরি ক্যাশ অন ডেলিভারিতে অর্ডার করুন</span>
                                </button>
                            </div>

                            {/* Conversion Trust Highlights */}
                            <div className="mt-3 pt-3 border-t landing-divider grid grid-cols-3 gap-2 text-center">
                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50/80 border landing-subdivider">
                                    <span className="text-base sm:text-lg">🚚</span>
                                    <span className="text-[11px] sm:text-xs font-semibold text-dark mt-0.5">ক্যাশ অন ডেলিভারি</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50/80 border landing-subdivider">
                                    <span className="text-base sm:text-lg">🛡️</span>
                                    <span className="text-[11px] sm:text-xs font-semibold text-dark mt-0.5">পণ্য দেখে পেমেন্ট</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50/80 border landing-subdivider">
                                    <span className="text-base sm:text-lg">⚡</span>
                                    <span className="text-[11px] sm:text-xs font-semibold text-dark mt-0.5">সারাদেশে দ্রুত ডেলিভারি</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =========================================================================
                        LANDING PAGE ENHANCEMENT: DIRECT 1-PAGE CHECKOUT ORDER FORM
                        ========================================================================= */}
                    <section
                        id="order-form"
                        className="scroll-mt-20 landing-order-section p-5 sm:p-7 md:p-8 overflow-hidden w-full max-w-full"
                    >
                        {placedOrder ? (
                            /* Order Success State View */
                            <div className="text-center py-6 space-y-5">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>

                                <h2 className="text-2xl font-bold text-emerald-700 md:text-3xl">
                                    🎉 আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!
                                </h2>
                                <p className="text-base text-gray-700">
                                    অর্ডার নম্বর:{' '}
                                    <span className="font-bold text-dark">
                                        #{placedOrder.order_number_short || placedOrder.order_number || placedOrder.id}
                                    </span>
                                </p>

                                <div className="mx-auto max-w-xl rounded-xl landing-summary-card p-6 text-left text-sm space-y-2.5">
                                    <p><strong className="text-gray-900">কাস্টমার নাম:</strong> {customerName}</p>
                                    <p><strong className="text-gray-900">মোবাইল নাম্বার:</strong> {phoneNumber}</p>
                                    <p><strong className="text-gray-900">ডেলিভারি ঠিকানা:</strong> {address}</p>
                                    <p><strong className="text-gray-900">অর্ডারকৃত পণ্য:</strong> {product.name} {selectedVariant?.name ? `(${selectedVariant.name})` : ''} × {quantity}</p>
                                    <p><strong className="text-gray-900">মোট প্রদেয় টাকা:</strong> <span className="font-bold text-primary text-base">৳ {grandTotal.toFixed(2)}</span> (ক্যাশ অন ডেলিভারি)</p>
                                </div>

                                <p className="text-sm text-gray max-w-lg mx-auto">
                                    আমাদের কাস্টমার কেয়ার প্রতিনিধি শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করে অর্ডারটি কনফার্ম করবেন। যেকোনো তথ্যের জন্য আমাদের সাথে যোগাযোগ করতে পারেন।
                                </p>

                                <div className="pt-4 flex flex-wrap justify-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                             setPlacedOrder(null);
                                             setQuantity(1);
                                        }}
                                        className="bg-primary hover:bg-dark-primary text-white rounded-md px-6 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
                                    >
                                        আরেকটি অর্ডার করুন
                                    </button>
                                    <Link
                                        href="/catalog"
                                        className="border border-slate-300 text-dark hover:bg-slate-50 rounded-md px-6 py-2.5 text-sm font-semibold transition-colors"
                                    >
                                        অন্যান্য প্রোডাক্ট দেখুন
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            /* Direct Order Form */
                            <div>
                                <div className="text-center pb-5 mb-6 border-b landing-divider">
                                    <h2 className="text-xl md:text-2xl font-bold text-dark">
                                        সরাসরি অর্ডার করতে নিচের ফর্মটি পূরণ করুন
                                    </h2>
                                    <p className="mt-1 text-sm text-gray">
                                        কোনো অগ্রিম পেমেন্ট নেই — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন (ক্যাশ অন ডেলিভারি)
                                    </p>

                                    {/* Promotional Free Shipping Notice */}
                                    <div className="mt-3.5 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full">
                                        <span>🎁 ৩ টি বা তার বেশি অর্ডার করলেই সারাদেশে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!</span>
                                    </div>
                                </div>

                                <form onSubmit={handleDirectOrder} className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 w-full min-w-0 max-w-full">
                                    {/* Billing & Shipping Details (7 cols) */}
                                    <div className="md:col-span-7 space-y-4 min-w-0 w-full">
                                        <h3 className="font-bold text-dark text-base border-b landing-divider pb-2.5 flex items-center gap-2">
                                            <span>১. আপনার ডেলিভারি তথ্য</span>
                                        </h3>

                                        <div>
                                            <label htmlFor="customer-name" className="block text-sm font-semibold text-dark mb-1.5">
                                                আপনার পূর্ণ নাম <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                id="customer-name"
                                                type="text"
                                                placeholder="আপনার পূর্ণ নাম"
                                                value={customerName}
                                                onChange={(e) => {
                                                    setCustomerName(e.target.value);
                                                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                                                }}
                                                className={`landing-input ${formErrors.name ? 'landing-input-error' : ''}`}
                                            />
                                            {formErrors.name && (
                                                <p className="mt-1 text-xs text-danger font-medium">{formErrors.name}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="customer-phone" className="block text-sm font-semibold text-dark mb-1.5">
                                                মোবাইল নাম্বার <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                id="customer-phone"
                                                type="tel"
                                                placeholder="মোবাইল নাম্বার"
                                                value={phoneNumber}
                                                onChange={(e) => {
                                                    setPhoneNumber(e.target.value);
                                                    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                                                }}
                                                className={`landing-input ${formErrors.phone ? 'landing-input-error' : ''}`}
                                            />
                                            {formErrors.phone && (
                                                <p className="mt-1 text-xs text-danger font-medium">{formErrors.phone}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="customer-address" className="block text-sm font-semibold text-dark mb-1.5">
                                                সম্পূর্ণ ঠিকানা (বাসা নং, রোড, থানা, জেলা) <span className="text-danger">*</span>
                                            </label>
                                            <textarea
                                                id="customer-address"
                                                rows={2}
                                                placeholder="আপনার পূর্ণ ঠিকানা বিস্তারিত লিখুন"
                                                value={address}
                                                onChange={(e) => {
                                                    setAddress(e.target.value);
                                                    if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: undefined }));
                                                }}
                                                className={`landing-input ${formErrors.address ? 'landing-input-error' : ''}`}
                                            />
                                            {formErrors.address && (
                                                <p className="mt-1 text-xs text-danger font-medium">{formErrors.address}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-dark mb-1.5">
                                                ডেলিভারি এরিয়া সিলেক্ট করুন
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <label
                                                    onClick={() => setShippingZone('inside_dhaka')}
                                                    className={`flex items-center gap-3 landing-radio-card ${
                                                        shippingZone === 'inside_dhaka' ? 'selected' : ''
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="shipping_zone"
                                                        value="inside_dhaka"
                                                        checked={shippingZone === 'inside_dhaka'}
                                                        onChange={() => setShippingZone('inside_dhaka')}
                                                        className="w-4 h-4 text-primary accent-primary cursor-pointer shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0 flex items-center justify-between">
                                                        <span className="font-semibold text-sm">ঢাকার ভিতরে</span>
                                                        <span className="text-xs font-semibold ml-2">
                                                            {isFreeShipping ? <span className="text-emerald-600 font-bold">ফ্রি (৳ 0)</span> : '৳ 80.00'}
                                                        </span>
                                                    </div>
                                                </label>

                                                <label
                                                    onClick={() => setShippingZone('outside_dhaka')}
                                                    className={`flex items-center gap-3 landing-radio-card ${
                                                        shippingZone === 'outside_dhaka' ? 'selected' : ''
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="shipping_zone"
                                                        value="outside_dhaka"
                                                        checked={shippingZone === 'outside_dhaka'}
                                                        onChange={() => setShippingZone('outside_dhaka')}
                                                        className="w-4 h-4 text-primary accent-primary cursor-pointer shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0 flex items-center justify-between">
                                                        <span className="font-semibold text-sm">ঢাকার বাহিরে</span>
                                                        <span className="text-xs font-semibold ml-2">
                                                            {isFreeShipping ? <span className="text-emerald-600 font-bold">ফ্রি (৳ 0)</span> : '৳ 120.00'}
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="customer-notes" className="block text-sm font-semibold text-dark mb-1.5">
                                                অর্ডার সম্পর্কিত বিশেষ নোট (ঐচ্ছিক)
                                            </label>
                                            <input
                                                id="customer-notes"
                                                type="text"
                                                placeholder="যেমন: সাইজ বা কালার সংক্রান্ত বিশেষ নির্দেশনা"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="landing-input"
                                            />
                                        </div>
                                    </div>

                                    {/* Order Summary & Submit (5 cols) */}
                                    <div className="md:col-span-5 flex flex-col justify-between landing-summary-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
                                        <div className="space-y-4 min-w-0 w-full">
                                            <h3 className="font-bold text-dark text-base border-b landing-subdivider pb-2.5">
                                                ২. অর্ডার সামারি
                                            </h3>

                                            {/* Product Item Preview */}
                                            <div className="flex gap-2.5 sm:gap-3 items-start border-b landing-subdivider pb-3 min-w-0 w-full">
                                                <img
                                                    src={gallery[activeImage] || PLACEHOLDER_IMAGE}
                                                    alt={product.name}
                                                    className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-gray-200 shrink-0 mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0 pr-1">
                                                    <h4 className="text-sm font-semibold text-dark leading-snug break-words" title={product.name}>
                                                        {product.name}
                                                    </h4>
                                                    {selectedVariant?.name && (
                                                        <p className="text-xs text-gray mt-0.5 break-words">ভ্যারিয়েন্ট: {selectedVariant.name}</p>
                                                    )}
                                                    <p className="text-xs font-semibold text-primary mt-1">৳ {effectivePrice} × {quantity}</p>
                                                </div>
                                                <div className="text-right shrink-0 pl-1">
                                                    <span className="text-sm sm:text-base font-bold text-dark whitespace-nowrap">৳ {subtotal}</span>
                                                </div>
                                            </div>

                                            {/* Quantity Quick Selector inside Summary */}
                                            <div className="flex items-center justify-between text-sm py-1">
                                                <span className="text-gray font-medium">অর্ডারের পরিমাণ:</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        aria-label="Decrease quantity"
                                                        disabled={quantity <= 1}
                                                        onClick={() => handleQuantityChange('decrease')}
                                                        className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center font-bold text-dark disabled:opacity-40 hover:border-gray-300 transition-colors shadow-xs"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-6 text-center font-bold text-dark">{quantity}</span>
                                                    <button
                                                        type="button"
                                                        aria-label="Increase quantity"
                                                        disabled={quantity >= (selectedVariant?.stockQuantity || Infinity)}
                                                        onClick={() => handleQuantityChange('increase')}
                                                        className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center font-bold text-dark disabled:opacity-40 hover:border-gray-300 transition-colors shadow-xs"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Cost Breakdown */}
                                            <div className="space-y-2 border-t landing-subdivider pt-3 text-sm">
                                                <div className="flex justify-between text-gray">
                                                    <span>পণ্যের মোট মূল্য:</span>
                                                    <span className="font-semibold text-dark">৳ {subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray">
                                                    <span>ডেলিভারি চার্জ:</span>
                                                    <span className={`font-semibold ${isFreeShipping ? 'text-emerald-600 font-bold' : 'text-dark'}`}>
                                                        {isFreeShipping ? 'ফ্রি (৳ 0.00)' : `৳ ${shippingCost.toFixed(2)}`}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-base font-bold text-dark border-t landing-subdivider pt-2.5">
                                                    <span>সর্বমোট প্রদেয়:</span>
                                                    <span className="text-primary text-xl">৳ {grandTotal.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Cash on delivery notice */}
                                            <div className="landing-cod-notice flex items-center gap-2 text-xs">
                                                <span>✓</span>
                                                <span>ক্যাশ অন ডেলিভারি (পণ্য পেয়ে টাকা পরিশোধ করুন)</span>
                                            </div>
                                        </div>

                                        <div className="pt-5">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="bg-primary hover:bg-dark-primary disabled:bg-primary/50 text-white w-full rounded-lg py-3.5 px-4 font-bold text-base uppercase tracking-wider transition-all shadow hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                {isSubmitting ? (
                                                    <span>অর্ডার প্রসেস হচ্ছে...</span>
                                                ) : (
                                                    <span>অর্ডার কনফার্ম করুন — ৳ {grandTotal.toFixed(2)}</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </section>

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

                        <div className="border-primary rounded-lg border-2 p-5 break-words">
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
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Inside Dhaka City: 2–3 working days (Standard delivery charge applies).</li>
                                        <li>Outside Dhaka City: 3–5 working days via reliable nationwide courier service.</li>
                                        <li>Cash on Delivery available all over Bangladesh.</li>
                                    </ul>
                                    <p className="font-semibold text-dark pt-3">Replacement & Return Policy:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong className="text-dark">15 Days</strong> replacement policy for damaged, defective, or incorrect items.</li>
                                        <li>Products must be unused, unaltered, with original packaging and invoice intact.</li>
                                        <li>Dedicated customer support ready to assist you 7 days a week.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>

            </section>

            {/* Mobile Sticky Order Bar */}
            <div
                style={{ bottom: '64px', zIndex: 35 }}
                className="md:hidden fixed left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 shadow-lg flex items-center justify-between gap-3"
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                    <img
                        src={gallery[activeImage] || PLACEHOLDER_IMAGE}
                        alt=""
                        className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="text-xs font-semibold text-dark truncate">{product.name}</div>
                        <div className="text-sm font-bold text-primary">৳ {effectivePrice}</div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={scrollToOrderForm}
                    className="bg-primary hover:bg-dark-primary text-white text-xs font-bold px-3.5 py-2 rounded-md uppercase tracking-wider shrink-0 shadow whitespace-nowrap"
                >
                    ⚡ অর্ডার করুন
                </button>
            </div>
        </main>
    );
}

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
            <section className="mb-8 space-y-10">
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
            </section>
        </main>
    );
}
