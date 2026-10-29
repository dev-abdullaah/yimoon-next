// app/(shop)/checkout/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFloatingCart } from '@/context/CartContext';
import { toast } from 'react-hot-toast';
import {
    accountApi,
    checkoutApi,
    storefrontApi,
    formatCurrency,
    clearGuestCartToken,
    PLACEHOLDER_IMAGE,
} from '@/lib/api';
import { fbTrack } from '@/utils/fbpixel';
import {
    validateName,
    sanitizeName,
    validatePhoneNumber,
    sanitizePhoneNumber,
    normalizePhoneNumber,
    validateAddress,
    sanitizeAddress,
} from '@/utils/validators';
import EmptyCartIcon from '@/components/Icons/EmptyCartIcon';
import DeleteIconMD from '@/components/Icons/DeleteIconMD';
import CloseButtonIconLG from '@/components/Icons/CloseButtonIconLG';

type DeliveryZone = 'outside_dhaka' | 'inside_dhaka';

interface FormTouched {
    recipientName: boolean;
    contactNumber: boolean;
    address: boolean;
}

const CHECKOUT_STORAGE_KEY = 'guestShippingAddress';

export default function CheckoutPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isAuthenticated, applyUser } = useAuth();
    const {
        cartItems,
        loading: cartLoading,
        setItemQuantity,
        removeItemById,
        clearCart,
        fetchCart,
    } = useFloatingCart();

    // Form fields (all simple text inputs with validation)
    const [recipientName, setRecipientName] = useState<string>('');
    const [contactNumber, setContactNumber] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>('outside_dhaka');
    const [paymentMethod, setPaymentMethod] = useState<string>('cod');
    const [storageHydrated, setStorageHydrated] = useState<boolean>(false);

    const [formTouched, setFormTouched] = useState<FormTouched>({
        recipientName: false,
        contactNumber: false,
        address: false,
    });

    // Track whether the user (or browser storage) has populated each field so server auto-fill never overwrites typed values
    const userEditedRef = useRef<{ name: boolean; phone: boolean; address: boolean }>({
        name: false,
        phone: false,
        address: false,
    });

    // Restore typed details from localStorage on mount so reloading preserves the form
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.recipientName) {
                    setRecipientName(sanitizeName(parsed.recipientName));
                    userEditedRef.current.name = true;
                }
                if (parsed?.contactNumber) {
                    setContactNumber(sanitizePhoneNumber(parsed.contactNumber));
                    userEditedRef.current.phone = true;
                }
                if (parsed?.address) {
                    setAddress(sanitizeAddress(parsed.address));
                    userEditedRef.current.address = true;
                }
                if (parsed?.deliveryZone === 'inside_dhaka' || parsed?.deliveryZone === 'outside_dhaka') {
                    setDeliveryZone(parsed.deliveryZone);
                }
            }
        } catch (err) {
            console.error('Error restoring checkout details from localStorage:', err);
        } finally {
            setStorageHydrated(true);
        }
    }, []);

    // Persist typed details to localStorage whenever any field changes
    useEffect(() => {
        if (!storageHydrated || typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(
                CHECKOUT_STORAGE_KEY,
                JSON.stringify({
                    userId: user?.id ?? null,
                    recipientName,
                    contactNumber,
                    address,
                    deliveryZone,
                })
            );
        } catch (err) {
            console.error('Error saving checkout details to localStorage:', err);
        }
    }, [storageHydrated, user?.id, recipientName, contactNumber, address, deliveryZone]);

    // Coupon state
    const [couponCode, setCouponCode] = useState<string>('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
    const [couponLoading, setCouponLoading] = useState<boolean>(false);
    const [couponError, setCouponError] = useState<string>('');

    // Live server quote
    const [quoteSummary, setQuoteSummary] = useState<any | null>(null);

    // Order confirmation state
    const [orderCompleted, setOrderCompleted] = useState<boolean>(false);
    const [orderConfirmationData, setOrderConfirmationData] = useState<any | null>(null);
    const [updatingQuantities, setUpdatingQuantities] = useState<Record<string | number, boolean>>({});

    // Unique idempotency key per checkout session to guard against duplicate submissions
    const idempotencyKeyRef = useRef<string>(
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    );

    const hasTrackedInitiateCheckoutRef = useRef<boolean>(false);

    // Storefront settings (for top helpline phone number)
    const { data: sfResponse } = useQuery({
        queryKey: ['storefrontConfig'],
        queryFn: () => storefrontApi.getConfig(),
        staleTime: 10 * 60 * 1000,
    });
    const contactPhone: string = sfResponse?.data?.settings?.contact_phone || '01872306498';

    // Fetch fresh profile for logged-in users so saved name, phone, and address are always up-to-date
    const { data: profileData } = useQuery({
        queryKey: ['account', user?.id],
        queryFn: () => accountApi.getProfile(),
        enabled: Boolean(isAuthenticated && user),
        staleTime: 60 * 1000,
    });

    // Auto-populate name, phone number, and address when a logged-in user visits checkout
    useEffect(() => {
        if (!storageHydrated) return;
        const sourceUser = profileData?.data || profileData || user;
        if (!sourceUser) return;

        const savedName =
            sourceUser.name ||
            sourceUser.default_address?.recipient_name ||
            sourceUser.addresses?.[0]?.recipient_name ||
            '';

        const savedPhone = sanitizePhoneNumber(
            sourceUser.phone_number ||
            sourceUser.phone ||
            sourceUser.default_address?.phone_number ||
            sourceUser.addresses?.[0]?.phone_number ||
            ''
        );

        const savedAddress =
            sourceUser.address ||
            sourceUser.default_address?.line1 ||
            sourceUser.addresses?.[0]?.line1 ||
            '';

        if (!userEditedRef.current.name && savedName) {
            setRecipientName(sanitizeName(savedName));
        }
        if (!userEditedRef.current.phone && savedPhone) {
            setContactNumber(savedPhone);
        }
        if (!userEditedRef.current.address && savedAddress) {
            setAddress(sanitizeAddress(savedAddress));
            if (/dhaka|ঢাকা/i.test(savedAddress)) {
                setDeliveryZone('inside_dhaka');
            }
        }
    }, [storageHydrated, user, profileData]);

    // Fetch available payment methods and shipping rules from backend
    const { data: paymentMethodsData } = useQuery({
        queryKey: ['checkoutPaymentMethods'],
        queryFn: () => checkoutApi.getPaymentMethods(),
        staleTime: 5 * 60 * 1000,
    });

    const shippingConfig =
        paymentMethodsData?.data?.shipping ??
        paymentMethodsData?.shipping ??
        sfResponse?.data?.shipping ??
        sfResponse?.shipping ??
        null;

    const insideDhakaRate: number = Number(shippingConfig?.zones?.inside_dhaka?.flat_rate ?? 70);
    const outsideDhakaRate: number = Number(shippingConfig?.zones?.outside_dhaka?.flat_rate ?? 100);
    const insideDhakaFreeThreshold: number | null =
        shippingConfig?.zones?.inside_dhaka?.free_threshold !== undefined && shippingConfig?.zones?.inside_dhaka?.free_threshold !== null
            ? Number(shippingConfig.zones.inside_dhaka.free_threshold)
            : 3000;
    const outsideDhakaFreeThreshold: number | null =
        shippingConfig?.zones?.outside_dhaka?.free_threshold !== undefined && shippingConfig?.zones?.outside_dhaka?.free_threshold !== null
            ? Number(shippingConfig.zones.outside_dhaka.free_threshold)
            : 3000;

    const availablePaymentMethods: Array<{ key: string; label?: string }> =
        paymentMethodsData?.data?.methods && paymentMethodsData.data.methods.length > 0
            ? paymentMethodsData.data.methods
            : [{ key: 'cod', label: 'Cash On Delivery' }];

    // Subtotal, shipping & total calculation
    const subtotal = cartItems.reduce((total, item) => {
        const price = Number(item.unitPrice ?? item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return total + price * quantity;
    }, 0);

    // Compute whether the current zone qualifies for free delivery
    const activeZoneFreeThreshold = deliveryZone === 'inside_dhaka' ? insideDhakaFreeThreshold : outsideDhakaFreeThreshold;
    const isFreeDeliveryEligible = activeZoneFreeThreshold !== null && subtotal >= activeZoneFreeThreshold;
    const activeZoneBaseFee = deliveryZone === 'inside_dhaka' ? insideDhakaRate : outsideDhakaRate;

    const localShippingFee = subtotal > 0 ? (isFreeDeliveryEligible ? 0 : activeZoneBaseFee) : 0;
    const shippingFee = quoteSummary ? Number(quoteSummary.shipping ?? localShippingFee) : localShippingFee;
    const isFreeShipping = shippingFee === 0 && subtotal > 0;
    const discountAmount = quoteSummary
        ? Number(quoteSummary.discount ?? 0)
        : Number(appliedCoupon?.discount ?? 0);
    const totalPayable = quoteSummary
        ? Number(quoteSummary.total ?? Math.max(0, subtotal - discountAmount) + shippingFee)
        : Math.max(0, subtotal - discountAmount) + shippingFee;

    // Track Facebook Pixel InitiateCheckout once
    useEffect(() => {
        if (!cartLoading && cartItems.length > 0 && !hasTrackedInitiateCheckoutRef.current) {
            hasTrackedInitiateCheckoutRef.current = true;
            fbTrack('InitiateCheckout', {
                content_ids: cartItems.map((item) => String(item.productId || item.variantId || item.id)),
                content_type: 'product',
                value: subtotal,
                currency: 'BDT',
                num_items: cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
            });
        }
    }, [cartLoading, cartItems, subtotal]);

    // Live server quote preview when delivery zone or coupon changes
    useEffect(() => {
        if (cartItems.length === 0) {
            setQuoteSummary(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const payload: Record<string, any> = {
                    recipient_name: recipientName.trim() || 'Customer',
                    phone_number: validatePhoneNumber(contactNumber)
                        ? normalizePhoneNumber(contactNumber)
                        : '01700000000',
                    line1: address.trim() || 'Bangladesh',
                    city: deliveryZone === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
                    country: 'BD',
                    coupon_code: appliedCoupon?.code || null,
                };

                const res = await checkoutApi.preview(payload);
                const summary = res?.data?.summary;
                if (summary) {
                    setQuoteSummary(summary);
                }
            } catch {
                // Keep local estimate on preview error
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [deliveryZone, appliedCoupon?.code, cartItems.length, subtotal, recipientName, contactNumber, address]);

    // Field validation helpers
    const isNameValid = validateName(recipientName);
    const isPhoneValid = validatePhoneNumber(contactNumber);
    const isAddressValid = validateAddress(address);

    const nameError =
        formTouched.recipientName && !isNameValid
            ? 'দয়া করে আপনার সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর)'
            : null;
    const phoneError =
        formTouched.contactNumber && !isPhoneValid
            ? 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার লিখুন'
            : null;
    const addressError =
        formTouched.address && !isAddressValid
            ? 'দয়া করে আপনার সম্পূর্ণ ঠিকানা লিখুন (কমপক্ষে ৫ অক্ষর)'
            : null;

    // Quantity controls inside Order Summary
    const handleQuantityChange = async (lineId: number | string, newQuantity: number) => {
        if (newQuantity < 1) return;
        setUpdatingQuantities((prev) => ({ ...prev, [lineId]: true }));
        try {
            await setItemQuantity(lineId, newQuantity);
        } finally {
            setUpdatingQuantities((prev) => ({ ...prev, [lineId]: false }));
        }
    };

    const handleRemoveItem = async (lineId: number | string, itemName?: string) => {
        setUpdatingQuantities((prev) => ({ ...prev, [lineId]: true }));
        try {
            await removeItemById(lineId, itemName || null);
        } finally {
            setUpdatingQuantities((prev) => ({ ...prev, [lineId]: false }));
        }
    };

    // Coupon handler
    const handleApplyCoupon = async () => {
        const code = couponCode.trim();
        if (!code) {
            setCouponError('দয়া করে কুপন কোড লিখুন');
            return;
        }

        setCouponLoading(true);
        setCouponError('');

        try {
            const payload = {
                recipient_name: recipientName.trim() || 'Customer',
                phone_number: validatePhoneNumber(contactNumber)
                    ? normalizePhoneNumber(contactNumber)
                    : '01700000000',
                line1: address.trim() || 'Bangladesh',
                city: deliveryZone === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
                country: 'BD',
                coupon_code: code,
            };

            const response = await checkoutApi.preview(payload);
            const summary = response?.data?.summary;

            if (summary && summary.coupon_code && Number(summary.discount) > 0) {
                setAppliedCoupon({
                    code: summary.coupon_code,
                    discount: Number(summary.discount),
                });
                setQuoteSummary(summary);
                toast.success(`কুপন "${summary.coupon_code}" সফলভাবে যুক্ত হয়েছে!`);
            } else {
                setAppliedCoupon(null);
                setCouponError('কুপন কোডটি সঠিক নয় অথবা এই অর্ডারে প্রযোজ্য নয়।');
                toast.error('কুপন কোডটি সঠিক নয়।');
            }
        } catch (error: any) {
            setAppliedCoupon(null);
            setCouponError(error?.message || 'কুপন কোড যাচাই করা যায়নি।');
            toast.error(error?.message || 'কুপন কোড যাচাই করা যায়নি।');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
        toast.success('কুপন সরানো হয়েছে');
    };

    // Place order mutation
    const placeOrderMutation = useMutation({
        mutationFn: async (orderPayload: any) => {
            return checkoutApi.placeOrder(orderPayload);
        },
        onSuccess: async (data: any) => {
            const payload = data?.data || data;
            const order = payload?.order;

            // Save/update logged-in user's name, phone_number, and address in their profile
            if (isAuthenticated && user) {
                try {
                    const updatedProfile = await accountApi.updateProfile({
                        name: recipientName.trim(),
                        phone_number: normalizePhoneNumber(contactNumber.trim()),
                        address: address.trim(),
                    });
                    const savedUser = updatedProfile?.data ?? updatedProfile;
                    if (savedUser?.name) {
                        applyUser(savedUser);
                    }
                    queryClient.invalidateQueries({ queryKey: ['account'] });
                    queryClient.invalidateQueries({ queryKey: ['addresses'] });
                } catch {
                    // Do not block order success if profile sync fails (e.g. duplicate phone)
                }
            }

            // If external gateway requires redirect
            if (payload?.action === 'redirect' && payload?.redirect_url) {
                await clearCart();
                clearGuestCartToken();
                window.location.href = payload.redirect_url;
                return;
            }

            setOrderCompleted(true);
            setOrderConfirmationData({
                orderId: order?.id,
                orderNo: order?.order_number_short || order?.order_number || order?.id,
                totalAmount: order?.totals?.total ?? totalPayable,
                paymentMethod: order?.payment?.method || paymentMethod,
                status: order?.status_label || order?.status || 'Pending',
                recipientName: recipientName.trim(),
                contactNumber: normalizePhoneNumber(contactNumber.trim()),
                address: address.trim(),
            });

            fbTrack('Purchase', {
                content_ids: cartItems.map((item) => String(item.productId || item.variantId || item.id)),
                content_type: 'product',
                value: Number(order?.totals?.total ?? totalPayable),
                currency: 'BDT',
                order_id: String(order?.order_number || order?.id || ''),
                num_items: cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
            });

            toast.success('আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            await clearCart();
            clearGuestCartToken();
            await fetchCart();
        },
        onError: (error: any) => {
            idempotencyKeyRef.current =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            toast.error(error?.message || 'অর্ডার সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
        },
    });

    const handleSubmitOrder = (e: React.FormEvent) => {
        e.preventDefault();

        setFormTouched({
            recipientName: true,
            contactNumber: true,
            address: true,
        });

        if (!isNameValid) {
            toast.error('দয়া করে আপনার সঠিক নাম লিখুন');
            return;
        }

        if (!isPhoneValid) {
            toast.error('সঠিক ১১ ডিজিটের মোবাইল নাম্বার লিখুন');
            return;
        }

        if (!isAddressValid) {
            toast.error('দয়া করে আপনার সম্পূর্ণ ঠিকানা লিখুন');
            return;
        }

        const orderPayload: Record<string, any> = {
            recipient_name: recipientName.trim(),
            phone_number: normalizePhoneNumber(contactNumber.trim()),
            line1: address.trim(),
            city: deliveryZone === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
            country: 'BD',
            payment_method: paymentMethod || 'cod',
            coupon_code: appliedCoupon?.code || null,
            idempotency_key: idempotencyKeyRef.current,
        };

        placeOrderMutation.mutate(orderPayload);
    };

    // Empty cart state
    if (cartItems.length === 0 && !orderCompleted) {
        return (
            <div className="checkout-bn-wrap">
                <div className="checkout-bn-card flex flex-col items-center justify-center py-12 text-center">
                    <EmptyCartIcon />
                    <p className="text-xl text-dark font-semibold mt-4">আপনার কার্টে কোনো পণ্য নেই!</p>
                    <p className="text-sm text-gray mt-1">অর্ডার করতে প্রথমে আপনার পছন্দের পণ্য কার্টে যুক্ত করুন।</p>
                    <Link
                        href="/catalog"
                        className="mt-5 bg-primary hover:bg-dark-primary text-white font-semibold px-6 py-2.5 rounded-md transition-colors"
                    >
                        শপিং করুন
                    </Link>
                </div>
            </div>
        );
    }

    // Order Success Confirmation Page (Exact match to previous clean design)
    if (orderCompleted && orderConfirmationData) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12 py-10">
                <section>
                    <div className="mb-10 2xl:px-20">
                        <div className="rounded-md bg-white shadow-custom text-center max-w-2xl mx-auto order-success-card">
                            <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-dark">Order Placed Successfully!</h1>
                            <p className="text-gray mt-2 text-sm md:text-base">
                                Thank you for your order. We are now preparing your items for delivery.
                            </p>

                            {orderConfirmationData.orderNo && (
                                <div className="my-6 inline-block rounded-md border border-light-ash bg-slate-50 px-6 py-3">
                                    <p className="text-xs uppercase tracking-wider text-gray">ORDER REFERENCE</p>
                                    <p className="text-xl md:text-2xl font-bold text-primary mt-0.5">
                                        {orderConfirmationData.orderNo}
                                    </p>
                                </div>
                            )}

                            <div className="text-center border-t border-light-white pt-4 mt-2 text-sm text-dark space-y-1">
                                <p>
                                    <span className="font-semibold text-gray">Recipient:</span> {orderConfirmationData.recipientName}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray">Phone:</span> {orderConfirmationData.contactNumber}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray">Delivery Address:</span> {orderConfirmationData.address}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray">Payment Method:</span> Cash On Delivery (COD)
                                </p>
                            </div>

                            <div className="order-success-actions flex flex-wrap justify-center gap-4">
                                <Link
                                    href="/"
                                    className="bg-primary hover:bg-dark-primary text-white px-6 py-2.5 rounded-md font-semibold transition-colors"
                                >
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <div className="checkout-bn-wrap">
            {/* Top Helpline Callout Box */}
            <div className="checkout-bn-helpline">
                যেকোনো প্রয়োজনে কল করতে{' '}
                <a
                    href={`tel:${contactPhone.replace(/[^+\d]/g, '')}`}
                    className="text-primary font-bold hover:underline"
                >
                    {contactPhone}
                </a>{' '}
                এর উপরে ক্লিক করুন।
            </div>

            <div className="checkout-bn-grid">
                {/* Card 1: Single-Page Bangla Order Form */}
                <form onSubmit={handleSubmitOrder} className="checkout-bn-card" noValidate>
                    {/* 1. Name Field */}
                    <div className="checkout-bn-field">
                        <label htmlFor="checkout-name" className="checkout-bn-label">
                            আপনার নাম লিখুন <span className="text-danger">*</span>
                        </label>
                        <input
                            id="checkout-name"
                            type="text"
                            placeholder="আপনার নাম লিখুন"
                            value={recipientName}
                            onChange={(e) => {
                                userEditedRef.current.name = true;
                                setRecipientName(sanitizeName(e.target.value));
                            }}
                            onBlur={() => setFormTouched((prev) => ({ ...prev, recipientName: true }))}
                            maxLength={80}
                            required
                            className={`checkout-bn-input ${nameError ? 'checkout-bn-input--error' : ''}`}
                        />
                        {nameError && <p className="checkout-bn-error">{nameError}</p>}
                    </div>

                    {/* 2. Mobile Number Field */}
                    <div className="checkout-bn-field">
                        <label htmlFor="checkout-phone" className="checkout-bn-label">
                            আপনার নাম্বার লিখুন <span className="text-danger">*</span>
                        </label>
                        <input
                            id="checkout-phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="আপনার সঠিক মোবাইল নাম্বার লিখুন"
                            value={contactNumber}
                            onChange={(e) => {
                                userEditedRef.current.phone = true;
                                setContactNumber(sanitizePhoneNumber(e.target.value));
                            }}
                            onBlur={() => setFormTouched((prev) => ({ ...prev, contactNumber: true }))}
                            required
                            className={`checkout-bn-input ${phoneError ? 'checkout-bn-input--error' : ''}`}
                        />
                        {phoneError && <p className="checkout-bn-error">{phoneError}</p>}
                    </div>

                    {/* 3. Address Field */}
                    <div className="checkout-bn-field">
                        <label htmlFor="checkout-address" className="checkout-bn-label">
                            ঠিকানা লিখুন <span className="text-danger">*</span>
                        </label>
                        <input
                            id="checkout-address"
                            type="text"
                            placeholder="আপনার বাড়ির নাম-নম্বর, গ্রাম বা এলাকার নাম, থানা, জেলা"
                            value={address}
                            onChange={(e) => {
                                userEditedRef.current.address = true;
                                setAddress(sanitizeAddress(e.target.value));
                            }}
                            onBlur={() => setFormTouched((prev) => ({ ...prev, address: true }))}
                            maxLength={250}
                            required
                            className={`checkout-bn-input ${addressError ? 'checkout-bn-input--error' : ''}`}
                        />
                        {addressError && <p className="checkout-bn-error">{addressError}</p>}
                    </div>

                    {/* 4. Delivery Area Radio Group */}
                    <div className="checkout-bn-field">
                        <label className="checkout-bn-label">
                            ডেলিভারি এরিয়া নির্বাচন করুন <span className="text-danger">*</span>
                        </label>
                        <div className="checkout-bn-radio-stack">
                            <label
                                className={`checkout-bn-radio-item ${
                                    deliveryZone === 'outside_dhaka' ? 'checkout-bn-radio-item--active' : ''
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="delivery_zone"
                                    value="outside_dhaka"
                                    checked={deliveryZone === 'outside_dhaka'}
                                    onChange={() => setDeliveryZone('outside_dhaka')}
                                />
                                <span>
                                    ঢাকার বাহিরে {outsideDhakaFreeThreshold !== null && subtotal >= outsideDhakaFreeThreshold ? (
                                        <span className="text-emerald-700 font-bold">ফ্রি</span>
                                    ) : (
                                        `${outsideDhakaRate} টাকা`
                                    )}
                                </span>
                            </label>
                            <label
                                className={`checkout-bn-radio-item ${
                                    deliveryZone === 'inside_dhaka' ? 'checkout-bn-radio-item--active' : ''
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="delivery_zone"
                                    value="inside_dhaka"
                                    checked={deliveryZone === 'inside_dhaka'}
                                    onChange={() => setDeliveryZone('inside_dhaka')}
                                />
                                <span>
                                    ঢাকার ভিতরে {insideDhakaFreeThreshold !== null && subtotal >= insideDhakaFreeThreshold ? (
                                        <span className="text-emerald-700 font-bold">ফ্রি</span>
                                    ) : (
                                        `${insideDhakaRate} টাকা`
                                    )}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* 5. Payment Method */}
                    <div className="checkout-bn-field">
                        <label className="checkout-bn-label">পেমেন্ট মেথড</label>
                        <div className="checkout-bn-radio-stack">
                            <label className="checkout-bn-radio-item checkout-bn-radio-item--active">
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="cod"
                                    checked={paymentMethod === 'cod'}
                                    onChange={() => setPaymentMethod('cod')}
                                />
                                <span>Cash On Delivery</span>
                            </label>
                        </div>
                    </div>

                    {/* 6. Submit Button */}
                    <button
                        type="submit"
                        disabled={placeOrderMutation.isPending}
                        className="checkout-bn-submit"
                    >
                        {placeOrderMutation.isPending ? 'অর্ডার প্রসেস হচ্ছে...' : 'অর্ডার করুন'}
                    </button>
                </form>

                {/* Card 2: Order Information (`অর্ডারের তথ্য`) */}
                <div className="checkout-bn-card">
                    <h2 className="checkout-bn-summary-title">অর্ডারের তথ্য</h2>

                    {/* Cart Items List */}
                    <div className="divide-y divide-slate-200">
                        {cartItems.map((item) => {
                            const itemId = item.id;
                            const isUpdating = Boolean(updatingQuantities[itemId]);
                            const unitPrice = Number(item.unitPrice ?? item.price) || 0;
                            const lineTotal = unitPrice * (Number(item.quantity) || 1);

                            return (
                                <div key={itemId} className="py-3 first:pt-0 flex items-start gap-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.image || PLACEHOLDER_IMAGE}
                                        alt={item.name}
                                        className="w-14 h-14 rounded-md object-cover border border-slate-200 shrink-0"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = PLACEHOLDER_IMAGE;
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-dark leading-snug line-clamp-2">
                                            {item.name}
                                        </p>
                                        {(item.attributeLabel || item.variantName) && (
                                            <p className="text-xs text-gray mt-0.5">
                                                {item.attributeLabel || item.variantName}
                                            </p>
                                        )}

                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <div className="checkout-bn-qty-box">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuantityChange(itemId, item.quantity - 1)}
                                                    disabled={item.quantity <= 1 || isUpdating}
                                                    className="checkout-bn-qty-btn"
                                                    aria-label="Decrease quantity"
                                                >
                                                    −
                                                </button>
                                                <span className="checkout-bn-qty-val">
                                                    {isUpdating ? '...' : item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuantityChange(itemId, item.quantity + 1)}
                                                    disabled={isUpdating || item.quantity >= (item.maxQuantity || Infinity)}
                                                    className="checkout-bn-qty-btn"
                                                    aria-label="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2.5">
                                                <span className="text-sm font-bold text-primary">
                                                    {formatCurrency(lineTotal)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(itemId, item.name)}
                                                    disabled={isUpdating}
                                                    className="checkout-bn-remove-btn"
                                                    aria-label="Remove item"
                                                    title="পণ্যটি সরান"
                                                >
                                                    <DeleteIconMD className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Coupon Input */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        {appliedCoupon ? (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-xs">
                                <span className="text-emerald-800 font-semibold">
                                    কুপন ({appliedCoupon.code}): -{formatCurrency(appliedCoupon.discount)}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemoveCoupon}
                                    className="text-danger font-semibold hover:underline cursor-pointer"
                                >
                                    সরান
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="কুপন কোড থাকলে লিখুন"
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(e.target.value);
                                            if (couponError) setCouponError('');
                                        }}
                                        className="checkout-bn-input text-xs py-2"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyCoupon}
                                        disabled={couponLoading || !couponCode.trim()}
                                        className="bg-dark hover:bg-primary text-white text-xs font-semibold px-3.5 py-2 rounded-md shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        {couponLoading ? '...' : 'এপ্লাই'}
                                    </button>
                                </div>
                                {couponError && <p className="checkout-bn-error">{couponError}</p>}
                            </div>
                        )}
                    </div>

                    {/* Totals Breakdown */}
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-dark-ash">
                            <span>সাবটোটাল</span>
                            <span className="font-semibold text-dark">{formatCurrency(subtotal)}</span>
                        </div>

                        {discountAmount > 0 && (
                            <div className="flex items-center justify-between text-emerald-700">
                                <span>ডিসকাউন্ট</span>
                                <span className="font-semibold">- {formatCurrency(discountAmount)}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-dark-ash">
                            <span>
                                ডেলিভারি চার্জ ({deliveryZone === 'inside_dhaka' ? 'ঢাকার ভিতরে' : 'ঢাকার বাহিরে'})
                            </span>
                            <span className={`font-semibold ${isFreeShipping ? 'text-emerald-700 font-bold' : 'text-dark'}`}>
                                {isFreeShipping ? 'ফ্রি' : formatCurrency(shippingFee)}
                            </span>
                        </div>

                        <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-base font-bold text-dark">
                            <span>সর্বমোট</span>
                            <span className="text-primary text-lg">{formatCurrency(totalPayable)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
