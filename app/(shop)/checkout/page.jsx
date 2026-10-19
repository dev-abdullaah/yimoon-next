// app/(shop)/checkout/page.jsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useFloatingCart } from '@/context/CartContext';
import { checkoutApi, PLACEHOLDER_IMAGE } from '@/lib/api';
import { cartLinePath } from '@/utils/urlHelper';
import citiesWithAreas from '@/utils/locations.json';
import { selectStyles, citySelectStyles, areaSelectStyles } from '@/styles/SelectStyles';
import DeleteIconMD from '@/components/Icons/DeleteIconMD';
import {
    validateName,
    validatePhoneNumber,
    validateAddress,
    validatePostCode,
    sanitizeName,
    sanitizePhoneNumber,
} from '@/utils/validators';

const STORAGE_KEY = 'snapkart_checkout_form_data';

function getSavedCheckoutFormData() {
    if (typeof window === 'undefined') return null;
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function saveCheckoutFormData(data) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // ignore storage errors
    }
}

function clearSavedCheckoutFormData() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

export default function CheckoutPage() {
    const { user, isAuthenticated } = useAuth();
    const {
        cartItems,
        subtotal,
        total,
        formatCurrency,
        removeItemById,
        increaseQty,
        decreaseQty,
        clearCart,
    } = useFloatingCart();

    const [mounted, setMounted] = useState(false);

    // Wizard Step State: 1 = Shipping Info, 2 = Review Order, 3 = Payment
    const [currentStep, setCurrentStep] = useState(1);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [placedOrder, setPlacedOrder] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Form & Location States
    const [formData, setFormData] = useState({
        recipientName: '',
        contactNumber: '',
        postCode: '',
        paymentMethod: 'Cash',
        country: 'Bangladesh',
        address: '',
    });

    const [selectedCityId, setSelectedCityId] = useState(null);
    const [selectedAreaId, setSelectedAreaId] = useState(null);

    // Derived areas list based on selectedCityId (synchronous, 0 race condition, zero lag)
    const areas = useMemo(() => {
        if (!selectedCityId) return [];
        const numericCityId = Number(selectedCityId);
        const city = citiesWithAreas.find((c) => Number(c.cityId) === numericCityId);
        return city?.areas || [];
    }, [selectedCityId]);

    const [formTouched, setFormTouched] = useState({
        city: false,
        area: false,
    });

    // Coupon States
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponApplied, setCouponApplied] = useState(false);

    // Initialize from saved data or user profile on mount
    useEffect(() => {
        setMounted(true);

        const saved = getSavedCheckoutFormData();
        if (saved && (saved.recipientName || saved.selectedCityId || saved.address)) {
            setFormData((prev) => ({
                ...prev,
                recipientName: saved.recipientName || '',
                contactNumber: saved.contactNumber || '',
                postCode: saved.postCode || '',
                paymentMethod: saved.paymentMethod || 'Cash',
                country: 'Bangladesh',
                address: saved.address || '',
            }));

            if (saved.selectedCityId !== null && saved.selectedCityId !== undefined && saved.selectedCityId !== '') {
                const cId = Number(saved.selectedCityId);
                setSelectedCityId(cId);

                if (saved.selectedAreaId !== null && saved.selectedAreaId !== undefined && saved.selectedAreaId !== '') {
                    const aId = Number(saved.selectedAreaId);
                    setSelectedAreaId(aId);
                }
            }
        } else if (user) {
            const userAddr = user.default_address || (user.addresses && user.addresses[0]);
            let matchedCityId = null;
            let matchedAreaId = null;

            if (userAddr?.city) {
                const cityNorm = userAddr.city.toLowerCase().replace(/[^a-z0-9]/g, '');
                const foundCity = citiesWithAreas.find((c) => {
                    const cNorm = c.cityName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return cNorm === cityNorm || cNorm.includes(cityNorm) || cityNorm.includes(cNorm);
                });
                if (foundCity) {
                    matchedCityId = foundCity.cityId;
                    if (userAddr.area) {
                        const areaNorm = userAddr.area.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const foundArea = foundCity.areas?.find((a) => {
                            const aNorm = a.areaName.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return aNorm === areaNorm || aNorm.includes(areaNorm) || areaNorm.includes(aNorm);
                        });
                        if (foundArea) {
                            matchedAreaId = foundArea.areaId;
                        }
                    }
                }
            }

            setFormData((prev) => ({
                ...prev,
                recipientName: userAddr?.recipient_name || user.name || '',
                contactNumber: userAddr?.phone_number || user.phone || user.phone_number || '',
                address: userAddr?.line1 || user.address || '',
                postCode: userAddr?.postal_code || '',
            }));

            if (matchedCityId !== null) {
                setSelectedCityId(matchedCityId);
                if (matchedAreaId !== null) {
                    setSelectedAreaId(matchedAreaId);
                }
            }
        }
    }, [user]);

    // Persist form data on change
    useEffect(() => {
        if (!mounted) return;
        saveCheckoutFormData({
            ...formData,
            selectedCityId: selectedCityId !== null && selectedCityId !== undefined && selectedCityId !== '' ? Number(selectedCityId) : null,
            selectedAreaId: selectedAreaId !== null && selectedAreaId !== undefined && selectedAreaId !== '' ? Number(selectedAreaId) : null,
        });
    }, [formData, selectedCityId, selectedAreaId, mounted]);

    // Shipping charge logic: 80 BDT for Dhaka-City (cityId 15), 130 BDT outside
    const shippingCharge = useMemo(() => {
        if (!selectedCityId) return 130;
        return Number(selectedCityId) === 15 ? 80 : 130;
    }, [selectedCityId]);

    // Location Options
    const countryOptions = useMemo(() => [{ value: 1, label: 'Bangladesh' }], []);
    const cityOptions = useMemo(
        () => citiesWithAreas.map((city) => ({ value: city.cityId, label: city.cityName })),
        []
    );
    const areaOptions = useMemo(
        () => areas.map((area) => ({ value: area.areaId, label: area.areaName })),
        [areas]
    );

    // Form validity computed using centralized validators

    const isFormValid = useMemo(() => {
        return (
            validateName(formData.recipientName) &&
            validatePhoneNumber(formData.contactNumber) &&
            validateAddress(formData.address) &&
            selectedCityId !== null &&
            selectedAreaId !== null &&
            validatePostCode(formData.postCode)
        );
    }, [formData, selectedCityId, selectedAreaId]);

    // Coupon Calculation
    const calculatedSubTotal = Number(subtotal || 0);
    const discountedSubTotal = Math.max(0, calculatedSubTotal - couponDiscount);
    const grandTotal = currentStep > 1 ? discountedSubTotal + shippingCharge : calculatedSubTotal;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value ?? '',
        }));
    };

    const handleClearForm = () => {
        setFormData({
            recipientName: '',
            contactNumber: '',
            address: '',
            postCode: '',
            paymentMethod: 'Cash',
            country: 'Bangladesh',
        });
        setSelectedCityId(null);
        setSelectedAreaId(null);
        setCouponCode('');
        setCouponDiscount(0);
        setCouponApplied(false);
        setFormTouched({ city: false, area: false });
        clearSavedCheckoutFormData();
        setCurrentStep(1);
        setShowClearConfirm(false);
        toast.success('Form cleared');
    };

    const handleStep1Submit = (e) => {
        e.preventDefault();
        setFormTouched({ city: true, area: true });

        if (!isFormValid) {
            toast.error('Please complete all required fields correctly.');
            return;
        }

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStep2Submit = (e) => {
        e.preventDefault();
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const applyCoupon = async () => {
        const code = couponCode.trim();
        if (!code) {
            toast.error('Please enter a coupon code.');
            return;
        }

        const normalized = code.toUpperCase();
        try {
            // Check preview against backend API
            const cityName = cityOptions.find((c) => c.value === parseInt(selectedCityId, 10))?.label || '';
            const areaName = areaOptions.find((a) => a.value === parseInt(selectedAreaId, 10))?.label || '';
            const previewRes = await checkoutApi.preview({
                recipient_name: formData.recipientName.trim() || 'Guest',
                phone_number: formData.contactNumber.trim() || '01711111111',
                line1: formData.address.trim() || 'Address Line',
                city: cityName,
                area: areaName,
                postal_code: formData.postCode || null,
                country: 'BD',
                coupon_code: code,
            });

            const discountAmount = Number(previewRes?.data?.summary?.discount ?? 0);
            if (discountAmount > 0) {
                setCouponDiscount(discountAmount);
                setCouponApplied(true);
                toast.success(`Coupon applied! Saved ${formatCurrency(discountAmount)}`);
                return;
            }
        } catch {
            // Fall back to predefined codes
        }

        if (normalized === 'WELCOME10' || normalized === 'TULIP001' || normalized === 'SURUCHI002') {
            const discountAmount = Math.round(calculatedSubTotal * 0.1);
            setCouponDiscount(discountAmount);
            setCouponApplied(true);
            toast.success('Coupon applied successfully! (10% discount)');
        } else if (normalized === 'FLAT200') {
            const discountAmount = Math.min(200, calculatedSubTotal);
            setCouponDiscount(discountAmount);
            setCouponApplied(true);
            toast.success('Coupon applied successfully! (৳200 discount)');
        } else {
            toast.error('Invalid or expired coupon code.');
        }
    };

    const removeCoupon = () => {
        setCouponApplied(false);
        setCouponDiscount(0);
        setCouponCode('');
        toast.success('Coupon removed.');
    };

    const executePlaceOrder = async () => {
        if (cartItems.length === 0) {
            toast.error('Your cart is empty.');
            return;
        }

        setIsSubmitting(true);

        const cityName = cityOptions.find((c) => c.value === parseInt(selectedCityId, 10))?.label || 'Dhaka';
        const areaName = areaOptions.find((a) => a.value === parseInt(selectedAreaId, 10))?.label || 'Dhanmondi';

        const payload = {
            recipient_name: formData.recipientName.trim(),
            phone_number: formData.contactNumber.trim(),
            line1: formData.address.trim(),
            line2: areaName,
            city: cityName,
            area: areaName,
            postal_code: formData.postCode?.trim() || null,
            country: 'BD',
            payment_method: 'cod',
            coupon_code: couponApplied ? couponCode.trim() : null,
        };

        try {
            const response = await checkoutApi.placeOrder(payload);
            const orderData = response?.data?.order || response?.order || response?.data || response;

            // If real gateway returns a redirect URL
            if (response?.data?.action === 'redirect' && response?.data?.redirect_url) {
                toast.success('Redirecting to payment gateway...');
                window.location.href = response.data.redirect_url;
                return;
            }

            toast.success('Order placed successfully!');
            setPlacedOrder(orderData);
            setOrderPlaced(true);

            await clearCart();
            // Preserve user shipping address in storage so they don't have to re-enter it next time
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Failed to place order:', error);
            toast.error(error.message || 'Failed to place order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlaceOrder = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        executePlaceOrder();
    };

    // ---------------------------------------------------------
    // RENDER: Empty Cart Screen
    // ---------------------------------------------------------
    if (mounted && cartItems.length === 0 && !orderPlaced) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12 py-10">
                <section>
                    <div className="mb-10 2xl:px-20">
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center bg-white rounded-md">
                            <img
                                alt="empty_cart"
                                loading="lazy"
                                width="120"
                                height="120"
                                src="/resources/media/empty-cart.gif"
                                className="mx-auto"
                            />
                            <p className="text-2xl font-bold uppercase text-dark">
                                Empty <span className="text-primary">Cart !</span>
                            </p>
                            <p className="text-gray text-sm md:text-base">
                                Please add some products to your cart before proceeding to checkout.
                            </p>
                            <Link
                                href="/"
                                className="bg-primary hover:bg-dark-primary rounded-md px-6 py-2.5 font-semibold text-white transition-colors mt-2"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    // ---------------------------------------------------------
    // RENDER: Order Placed Confirmation Screen
    // ---------------------------------------------------------
    if (orderPlaced) {
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

                            {placedOrder?.order_number && (
                                <div className="my-6 inline-block rounded-md border border-light-ash bg-slate-50 px-6 py-3">
                                    <p className="text-xs uppercase tracking-wider text-gray">Order Reference</p>
                                    <p className="text-xl md:text-2xl font-bold text-primary mt-0.5">
                                        {placedOrder.order_number}
                                    </p>
                                </div>
                            )}

                            <div className="text-left border-t border-light-white pt-4 mt-2 text-sm text-dark space-y-1">
                                <p>
                                    <span className="font-semibold text-gray">Recipient:</span> {formData.recipientName}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray">Phone:</span> {formData.contactNumber}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray">Delivery Address:</span>{' '}
                                    {formData.address}, {areaOptions.find((a) => a.value === selectedAreaId)?.label || ''},{' '}
                                    {cityOptions.find((c) => c.value === selectedCityId)?.label || ''}
                                    {formData.postCode ? ` - ${formData.postCode}` : ''}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray">Payment Method:</span>{' '}
                                    Cash On Delivery (COD)
                                </p>
                            </div>

                            <div className="order-success-actions flex flex-wrap justify-center gap-4">
                                <Link
                                    href="/"
                                    className="bg-primary hover:bg-dark-primary text-white px-6 py-2.5 rounded-md font-semibold transition-colors"
                                >
                                    Continue Shopping
                                </Link>
                                {placedOrder?.id && (
                                    <Link
                                        href={`/account/orders/${placedOrder.id}`}
                                        className="border border-dark hover:border-primary hover:text-primary text-dark px-6 py-2.5 rounded-md font-semibold transition-colors"
                                    >
                                        View Order
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12 py-6 md:py-8 pb-28 md:pb-8">
            <section>
                <h1 className="sr-only">Secure Checkout</h1>

                {/* Progress Steps Header */}
                <div className="mb-6 2xl:px-20">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((step) => (
                            <React.Fragment key={step}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (step === currentStep) return;
                                        if (step < currentStep) {
                                            setCurrentStep(step);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        } else {
                                            if (!isFormValid) {
                                                setFormTouched({ city: true, area: true });
                                                toast.error('Please complete shipping information first.');
                                                return;
                                            }
                                            setCurrentStep(step);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                    className={`flex items-center text-left transition-opacity hover:opacity-85 cursor-pointer ${
                                        currentStep >= step ? 'text-primary' : 'text-gray'
                                    }`}
                                >
                                    <div
                                        className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm ${
                                            currentStep >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                                        }`}
                                    >
                                        {step}
                                    </div>
                                    <span className="ml-2 font-medium text-xs sm:text-sm md:text-base">
                                        {step === 1 ? 'Shipping Info' : step === 2 ? 'Review Order' : 'Payment'}
                                    </span>
                                </button>
                                {step < 3 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 sm:mx-4 ${
                                            currentStep > step ? 'bg-primary' : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* ========================================================= */}
                {/* STEP 1: Shipping Information                              */}
                {/* ========================================================= */}
                {currentStep === 1 && (
                    <div className="mb-10 2xl:px-20">
                        <form onSubmit={handleStep1Submit} className="grid grid-cols-1 gap-8 xl:grid-cols-3" autoComplete="off">
                            <div className="col-span-1 space-y-5 md:space-y-8 xl:col-span-2">
                                <div className="rounded-default shadow-custom mx-auto flex flex-col gap-2.5 pb-2.5 text-[15px] sm:gap-5 sm:pb-6 bg-white">
                                    <h2 className="text-dark border-light-white border-b px-3 py-2.5 text-sm font-semibold sm:px-5 sm:py-3 sm:text-lg">
                                        Shipping Information
                                    </h2>
                                    <div className="space-y-3 px-3 sm:px-5">
                                        <div className="grid grid-cols-1 gap-x-7 gap-y-3 sm:grid-cols-2">
                                            {/* Recipient Name */}
                                            <div className="flex flex-col">
                                                <label className="font-medium pb-[3px] text-sm text-dark" htmlFor="recipientName">
                                                    Recipient Name<span className="text-danger ml-1">*</span>
                                                </label>
                                                <div className="border border-light-ash hover:border-primary bg-white rounded-sm py-1.5 px-2.5">
                                                    <input
                                                        id="recipientName"
                                                        placeholder="Full Name"
                                                        className="outline-0 text-dark-ash w-full text-sm"
                                                        type="text"
                                                        name="recipientName"
                                                        value={formData.recipientName}
                                                        onChange={(e) => {
                                                            const value = sanitizeName(e.target.value);
                                                            handleInputChange({ target: { name: 'recipientName', value } });
                                                        }}
                                                        minLength={2}
                                                        maxLength={50}
                                                        required
                                                    />
                                                </div>
                                                {formData.recipientName && !validateName(formData.recipientName) && (
                                                    <div className="text-danger text-xs mt-1">Name must be at least 2 characters</div>
                                                )}
                                            </div>

                                            {/* Contact Number */}
                                            <div className="flex flex-col">
                                                <label className="font-medium pb-[3px] text-sm text-dark" htmlFor="contactNumber">
                                                    Contact Number<span className="text-danger ml-1">*</span>
                                                </label>
                                                <div className="border border-light-ash hover:border-primary bg-white rounded-sm py-1.5 px-2.5">
                                                    <input
                                                        id="contactNumber"
                                                        placeholder="Mobile Number (e.g. 01712345678)"
                                                        className="outline-0 text-dark-ash w-full text-sm"
                                                        type="tel"
                                                        name="contactNumber"
                                                        value={formData.contactNumber}
                                                        onChange={(e) => {
                                                            const value = sanitizePhoneNumber(e.target.value);
                                                            handleInputChange({ target: { name: 'contactNumber', value } });
                                                        }}
                                                        required
                                                    />
                                                </div>
                                                {formData.contactNumber && !validatePhoneNumber(formData.contactNumber) && (
                                                    <div className="text-danger text-xs mt-1">
                                                        Please enter a valid 11-digit mobile number (e.g. 01712345678)
                                                    </div>
                                                )}
                                            </div>

                                            {/* Country (Bangladesh - disabled) */}
                                            <div className="flex flex-col">
                                                <label className="font-medium pb-[3px] text-sm text-dark" htmlFor="country">
                                                    Country
                                                </label>
                                                <div className="bg-white rounded-sm">
                                                    <Select
                                                        instanceId="country-select"
                                                        id="country"
                                                        name="country"
                                                        options={countryOptions}
                                                        value={countryOptions[0]}
                                                        isDisabled
                                                        styles={selectStyles}
                                                    />
                                                </div>
                                            </div>

                                            {/* District / City */}
                                            <div className="flex flex-col">
                                                <label className="font-medium pb-[3px] text-sm text-dark" htmlFor="cityId">
                                                    District/City<span className="text-danger ml-1">*</span>
                                                </label>
                                                <div className="bg-white rounded-sm">
                                                    <Select
                                                        instanceId="city-select"
                                                        id="cityId"
                                                        name="cityId"
                                                        options={cityOptions}
                                                        value={cityOptions.find((option) => Number(option.value) === Number(selectedCityId)) || null}
                                                        onChange={(selected) => {
                                                            const newCityId = selected ? Number(selected.value) : null;
                                                            if (newCityId !== selectedCityId) {
                                                                setSelectedCityId(newCityId);
                                                                setSelectedAreaId(null);
                                                            }
                                                            setFormTouched((prev) => ({ ...prev, city: true }));
                                                        }}
                                                        onBlur={() => setFormTouched((prev) => ({ ...prev, city: true }))}
                                                        placeholder="Select District/City"
                                                        isClearable
                                                        styles={citySelectStyles}
                                                    />
                                                </div>
                                                {formTouched.city && !selectedCityId && (
                                                    <div className="text-danger text-xs mt-1">Please select a district/city</div>
                                                )}
                                            </div>

                                            {/* Area / Thana / Upazilla */}
                                            <div className="flex flex-col">
                                                <label className="font-medium pb-[3px] text-sm text-dark" htmlFor="areaId">
                                                    Area/Thana/Upazilla<span className="text-danger ml-1">*</span>
                                                </label>
                                                <div className="bg-white rounded-sm">
                                                    <Select
                                                        instanceId="area-select"
                                                        id="areaId"
                                                        name="areaId"
                                                        options={areaOptions}
                                                        value={areaOptions.find((option) => Number(option.value) === Number(selectedAreaId)) || null}
                                                        onChange={(selected) => {
                                                            setSelectedAreaId(selected ? Number(selected.value) : null);
                                                            setFormTouched((prev) => ({ ...prev, area: true }));
                                                        }}
                                                        onBlur={() => setFormTouched((prev) => ({ ...prev, area: true }))}
                                                        placeholder="Select Area/Thana/Upazilla"
                                                        isClearable
                                                        isDisabled={!selectedCityId}
                                                        styles={areaSelectStyles}
                                                    />
                                                </div>
                                                {formTouched.area && !selectedAreaId && selectedCityId && (
                                                    <div className="text-danger text-xs mt-1">Please select an area/thana</div>
                                                )}
                                            </div>

                                            {/* Post Code */}
                                            <div className="flex flex-col">
                                                <label className="font-medium pb-[3px] text-sm text-dark" htmlFor="postCode">
                                                    Post Code
                                                </label>
                                                <div className="border border-light-ash hover:border-primary bg-white rounded-sm py-1.5 px-2.5">
                                                    <input
                                                        id="postCode"
                                                        placeholder="Post Code (1000-9499)"
                                                        className="outline-0 text-dark-ash w-full text-sm"
                                                        type="text"
                                                        name="postCode"
                                                        value={formData.postCode}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                            handleInputChange({ target: { name: 'postCode', value } });
                                                        }}
                                                        maxLength={4}
                                                    />
                                                </div>
                                                {formData.postCode && !validatePostCode(formData.postCode) && (
                                                    <div className="text-danger text-xs mt-1">
                                                        Post code must be 4 digits (1000-9499)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Address Textarea */}
                                        <div className="flex flex-col pt-1">
                                            <label className="font-medium pb-[3px] text-sm text-dark" htmlFor="address">
                                                Street Address<span className="text-danger ml-1">*</span>
                                            </label>
                                            <div className="border border-light-ash hover:border-primary bg-white rounded-sm py-1.5 px-2.5">
                                                <textarea
                                                    id="address"
                                                    name="address"
                                                    placeholder="House/Building, Road, Area details"
                                                    className="outline-0 text-dark-ash w-full min-h-[75px] text-sm"
                                                    value={formData.address}
                                                    onChange={handleInputChange}
                                                    minLength={5}
                                                    maxLength={200}
                                                    required
                                                />
                                            </div>
                                            {formData.address && !validateAddress(formData.address) && (
                                                <div className="text-danger text-xs mt-1">
                                                    Address must be at least 5 characters
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Cart Items List */}
                                <div>
                                    <h2 className="text-dark mb-2.5 text-base sm:text-lg font-semibold">
                                        Product Items ({cartItems.length})
                                    </h2>
                                    <div className="space-y-2.5">
                                        {cartItems.map((item, index) => (
                                            <ProductItem
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                formatCurrency={formatCurrency}
                                                decreaseQty={decreaseQty}
                                                increaseQty={increaseQty}
                                                removeItemById={removeItemById}
                                                reviewMode={false}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary Sidebar */}
                            <div className="col-span-1 w-full">
                                <div className="space-y-5 xl:sticky xl:top-[120px]">
                                    <div className="shadow-custom rounded-default bg-white">
                                        <h2 className="text-dark text-base sm:text-lg font-semibold py-3 border-b border-light-white px-4 sm:px-5">
                                            Your Bill
                                        </h2>
                                        <div className="p-4 sm:p-5 space-y-3 text-sm">
                                            <div className="flex justify-between text-dark">
                                                <p>Sub-Total</p>
                                                <p className="font-semibold">{formatCurrency(calculatedSubTotal)}</p>
                                            </div>
                                            <div className="flex justify-between font-bold text-base pt-2 border-t border-light-white text-dark">
                                                <p>Total</p>
                                                <p className="text-primary">{formatCurrency(calculatedSubTotal)}</p>
                                            </div>
                                            <button
                                                className={`mt-6 w-full rounded-md py-2.5 text-base font-bold transition-colors ${
                                                    isFormValid && cartItems.length > 0
                                                        ? 'bg-primary hover:bg-dark-primary text-white cursor-pointer'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                                type="submit"
                                                disabled={!isFormValid || cartItems.length === 0}
                                            >
                                                Continue to Review Order
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Sticky Bottom Bar for Step 1 */}
                                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-light-ash px-5 py-3.5 flex items-center justify-between shadow-2xl">
                                    <div>
                                        <p className="text-xs text-gray">Sub-Total</p>
                                        <p className="text-lg font-bold text-primary">{formatCurrency(calculatedSubTotal)}</p>
                                    </div>
                                    <button
                                        className={`px-6 py-2.5 rounded-md font-bold text-white transition-colors text-sm sm:text-base whitespace-nowrap shadow-sm ${
                                            isFormValid && cartItems.length > 0
                                                ? 'bg-primary hover:bg-dark-primary'
                                                : 'bg-gray-300 cursor-not-allowed'
                                        }`}
                                        style={{ paddingLeft: '24px', paddingRight: '24px' }}
                                        type="submit"
                                        disabled={!isFormValid || cartItems.length === 0}
                                    >
                                        Continue to Review
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* ========================================================= */}
                {/* STEP 2: Review Order                                      */}
                {/* ========================================================= */}
                {currentStep === 2 && (
                    <div className="mb-10 2xl:px-20">
                        <form onSubmit={handleStep2Submit} className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                            <div className="col-span-1 space-y-6 xl:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentStep(1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300 text-dark hover:text-primary font-semibold text-sm transition-all shadow-xs cursor-pointer w-fit"
                                >
                                    <svg className="w-4 h-4 text-dark-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Back to Shipping Info</span>
                                </button>
                                {/* Shipping Summary Card */}
                                <div className="rounded-default shadow-custom mx-auto flex flex-col gap-2.5 pb-2.5 text-[15px] sm:gap-4 sm:pb-5 bg-white">
                                    <h2 className="text-dark border-light-white border-b px-3 py-2.5 text-sm font-semibold sm:px-5 sm:py-3 sm:text-lg">
                                        Shipping Information
                                    </h2>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm px-4 sm:px-5 gap-4">
                                        <div className="space-y-1 flex-1">
                                            <p className="text-gray">
                                                Name: <span className="text-dark font-medium capitalize">{formData.recipientName}</span>
                                            </p>
                                            <p className="text-gray">
                                                Phone: <span className="text-dark font-medium">{formData.contactNumber}</span>
                                            </p>
                                            <p className="text-dark">
                                                {formData.address},{' '}
                                                {areaOptions.find((a) => a.value === selectedAreaId)?.label || ''},{' '}
                                                {cityOptions.find((c) => c.value === selectedCityId)?.label || ''}
                                                {formData.postCode ? ` - ${formData.postCode}` : ''}, Bangladesh
                                            </p>
                                        </div>
                                        <div className="flex items-center sm:flex-col gap-2 shrink-0 self-start sm:self-center">
                                            <button
                                                type="button"
                                                className="w-20 text-primary hover:bg-primary border border-primary rounded-md py-1 text-xs sm:text-sm font-medium transition-colors hover:text-white text-center"
                                                onClick={() => {
                                                    setCurrentStep(1);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="w-20 text-danger hover:bg-danger border border-danger rounded-md py-1 text-xs sm:text-sm font-medium transition-colors hover:text-white text-center"
                                                onClick={() => setShowClearConfirm(true)}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Cart Items List (Review Mode) */}
                                <div>
                                    <h2 className="text-dark mb-2.5 text-base sm:text-lg font-semibold">
                                        Product Items ({cartItems.length})
                                    </h2>
                                    <div className="space-y-2.5">
                                        {cartItems.map((item, index) => (
                                            <ProductItem
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                formatCurrency={formatCurrency}
                                                decreaseQty={decreaseQty}
                                                increaseQty={increaseQty}
                                                removeItemById={removeItemById}
                                                reviewMode={true}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary & Coupon Sidebar */}
                            <div className="col-span-1 w-full space-y-5">
                                <div className="space-y-5 xl:sticky xl:top-[120px]">
                                    {/* Coupon / Voucher Box */}
                                    <div className="shadow-custom rounded-default bg-white">
                                        <h2 className="text-sm sm:text-base font-semibold text-dark px-4 sm:px-5 py-3 border-b border-light-white">
                                            Coupon / Voucher
                                        </h2>
                                        <div className="p-4 sm:p-5 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    placeholder="Enter Code Here"
                                                    className="w-full outline-0 border border-light-ash hover:border-primary focus:border-primary bg-white rounded-md text-sm py-2 px-3"
                                                    type="text"
                                                    value={couponCode}
                                                    disabled={couponApplied}
                                                    onChange={(e) => setCouponCode(e.target.value)}
                                                />
                                                {couponApplied ? (
                                                    <button
                                                        type="button"
                                                        onClick={removeCoupon}
                                                        className="flex-none px-4 py-2 rounded-md font-bold text-white bg-danger hover:bg-red-600 text-sm transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={applyCoupon}
                                                        disabled={!couponCode.trim()}
                                                        className="flex-none px-4 py-2 rounded-md font-bold text-white bg-primary hover:bg-dark-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-sm transition-colors"
                                                    >
                                                        Apply
                                                    </button>
                                                )}
                                            </div>
                                            {couponApplied && (
                                                <p className="text-green-600 text-xs font-medium">
                                                    ✓ Coupon applied: -{formatCurrency(couponDiscount)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Your Bill Card */}
                                    <div className="shadow-custom rounded-default bg-white">
                                        <h2 className="text-dark text-base sm:text-lg font-semibold py-3 border-b border-light-white px-4 sm:px-5">
                                            Your Bill
                                        </h2>
                                        <div className="p-4 sm:p-5 space-y-3 text-sm">
                                            <div className="flex justify-between text-dark">
                                                <p>Sub-Total</p>
                                                <p className="font-semibold">{formatCurrency(calculatedSubTotal)}</p>
                                            </div>
                                            {couponApplied && couponDiscount > 0 && (
                                                <div className="flex justify-between text-danger">
                                                    <p>Coupon Discount</p>
                                                    <p className="font-semibold">- {formatCurrency(couponDiscount)}</p>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-dark">
                                                <p>Shipping Charge</p>
                                                <p className="font-semibold">{formatCurrency(shippingCharge)}</p>
                                            </div>
                                            <div className="flex justify-between font-bold text-base pt-2 border-t border-light-white text-dark">
                                                <p>Total</p>
                                                <p className="text-primary">{formatCurrency(grandTotal)}</p>
                                            </div>
                                            <button
                                                className="mt-6 w-full rounded-md py-2.5 text-base font-bold bg-primary hover:bg-dark-primary text-white transition-colors cursor-pointer"
                                                type="submit"
                                                disabled={cartItems.length === 0}
                                            >
                                                Continue to Payment
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Sticky Bottom Bar for Step 2 */}
                                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-light-ash px-5 py-3.5 flex items-center justify-between shadow-2xl">
                                    <div>
                                        <p className="text-xs text-gray">Total Amount</p>
                                        <p className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</p>
                                    </div>
                                    <button
                                        className={`px-6 py-2.5 rounded-md font-bold text-white transition-colors text-sm sm:text-base whitespace-nowrap shadow-sm ${
                                            cartItems.length === 0
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : 'bg-primary hover:bg-dark-primary'
                                        }`}
                                        style={{ paddingLeft: '24px', paddingRight: '24px' }}
                                        type="submit"
                                        disabled={cartItems.length === 0}
                                    >
                                        Continue to Payment
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* ========================================================= */}
                {/* STEP 3: Payment                                           */}
                {/* ========================================================= */}
                {currentStep === 3 && (
                    <div className="mb-10 2xl:px-20">
                        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                            <div className="col-span-1 space-y-6 xl:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentStep(2);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300 text-dark hover:text-primary font-semibold text-sm transition-all shadow-xs cursor-pointer w-fit"
                                >
                                    <svg className="w-4 h-4 text-dark-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Back to Review Order</span>
                                </button>
                                <fieldset className="shadow-custom rounded-default bg-white">
                                    <h2
                                        id="payment-method-label"
                                        className="text-dark border-light-white border-b px-3 py-2.5 text-sm font-medium sm:px-5 sm:text-lg"
                                    >
                                        Select Payment Method
                                    </h2>
                                    <div className="px-3 sm:px-5">
                                        <div
                                            role="radiogroup"
                                            aria-labelledby="payment-method-label"
                                            className="divide-light-white divide-y"
                                        >
                                            {/* Cash On Delivery */}
                                            <label
                                                htmlFor="payment-cod"
                                                className="text-dark-ash flex items-center space-x-3.5 py-2.5 text-base md:py-5 cursor-pointer"
                                            >
                                                <input
                                                    id="payment-cod"
                                                    className="accent-primary 3xl:w-6 3xl:h-6 h-4 w-4 sm:h-5 sm:w-5"
                                                    type="radio"
                                                    value="Cash"
                                                    checked={formData.paymentMethod === 'Cash'}
                                                    onChange={handleInputChange}
                                                    name="paymentMethod"
                                                />
                                                <div className="border-light-white max-h-[75px] min-w-[150px] overflow-clip rounded-sm border flex items-center justify-center bg-white">
                                                    <img
                                                        alt="Cash On Delivery"
                                                        width="140"
                                                        height="70"
                                                        className="max-h-[75px] w-full min-w-[50px] object-contain"
                                                        src="/resources/media/cash_on_delivery.webp"
                                                    />
                                                </div>
                                                <div className="text-sm font-medium sm:text-base">
                                                    <p className="text-dark leading-normal">Cash On Delivery</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </fieldset>
                            </div>

                            {/* Final Bill & Place Order Sidebar */}
                            <div className="col-span-1 w-full space-y-4">
                                <div className="space-y-5 xl:sticky xl:top-[120px]">
                                    <div className="shadow-custom rounded-default bg-white">
                                        <h2 className="text-dark text-base sm:text-lg font-semibold py-3 border-b border-light-white px-4 sm:px-5">
                                            Your Bill
                                        </h2>
                                        <div className="p-4 sm:p-5 space-y-3 text-sm">
                                            <div className="flex justify-between text-dark">
                                                <p>Sub-Total</p>
                                                <p className="font-semibold">{formatCurrency(calculatedSubTotal)}</p>
                                            </div>
                                            {couponApplied && couponDiscount > 0 && (
                                                <div className="flex justify-between text-danger">
                                                    <p>Coupon Discount</p>
                                                    <p className="font-semibold">- {formatCurrency(couponDiscount)}</p>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-dark">
                                                <p>Shipping Charge</p>
                                                <p className="font-semibold">{formatCurrency(shippingCharge)}</p>
                                            </div>
                                            <div className="flex justify-between font-bold text-base pt-2 border-t border-light-white text-dark">
                                                <p>Total</p>
                                                <p className="text-primary">{formatCurrency(grandTotal)}</p>
                                            </div>
                                            <button
                                                className={`mt-6 w-full rounded-md py-3 text-base font-bold text-white transition-colors ${
                                                    isSubmitting || cartItems.length === 0
                                                        ? 'bg-gray-300 cursor-not-allowed'
                                                        : 'bg-primary hover:bg-dark-primary cursor-pointer'
                                                }`}
                                                type="submit"
                                                disabled={isSubmitting || cartItems.length === 0}
                                            >
                                                {isSubmitting ? 'Placing Order...' : 'Place Order'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Sticky Bottom Order Bar */}
                                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-light-ash px-5 py-3.5 flex items-center justify-between shadow-2xl">
                                    <div>
                                        <p className="text-xs text-gray">Total Amount</p>
                                        <p className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</p>
                                    </div>
                                    <button
                                        className={`px-8 py-2.5 rounded-md font-bold text-white transition-colors text-sm sm:text-base whitespace-nowrap shadow-sm ${
                                            isSubmitting || cartItems.length === 0
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : 'bg-primary hover:bg-dark-primary cursor-pointer'
                                        }`}
                                        style={{ paddingLeft: '28px', paddingRight: '28px' }}
                                        type="submit"
                                        disabled={isSubmitting || cartItems.length === 0}
                                    >
                                        {isSubmitting ? 'Processing...' : 'Place Order'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Clear Form Confirmation Modal */}
                {showClearConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                            <h3 className="text-lg font-bold text-dark text-center">Clear Form Data?</h3>
                            <p className="text-gray text-sm mt-2 text-center">
                                Are you sure you want to clear all entered shipping details? This cannot be undone.
                            </p>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-2 rounded-md border border-light-ash font-medium text-dark hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearForm}
                                    className="flex-1 py-2 rounded-md bg-danger text-white font-medium hover:bg-red-600 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

// =========================================================================
// Reusable ProductItem Component
// =========================================================================
function ProductItem({
    item,
    index,
    formatCurrency,
    decreaseQty,
    increaseQty,
    removeItemById,
    reviewMode = false,
}) {
    return (
        <div className="rounded-md bg-white shadow-custom">
            <div className="divide-light-white divide-y px-3 sm:px-5">
                <div className="relative flex items-center gap-3 py-3">
                    <Link href={cartLinePath(item)} className="shrink-0">
                        <img
                            alt={item.name}
                            loading="lazy"
                            width="85"
                            height="85"
                            className="rounded object-cover my-auto"
                            src={item.image}
                            style={{ color: 'transparent' }}
                            onError={(e) => {
                                e.target.src = PLACEHOLDER_IMAGE;
                            }}
                        />
                    </Link>
                    <div className="text-dark-ash flex w-full flex-col justify-between text-xs sm:flex-row sm:gap-4 md:text-sm">
                        <div className="w-full max-w-xs flex flex-col justify-center">
                            <div className="text-gray text-xs">SN. {index + 1}</div>
                            <Link href={cartLinePath(item)}>
                                <div className="text-dark font-semibold capitalize hover:text-primary transition-colors line-clamp-2">
                                    {item.name}
                                </div>
                            </Link>
                            {item.attributeLabel && (
                                <div className="text-xs text-gray mt-0.5">
                                    Option: <span className="font-medium text-dark">{item.attributeLabel}</span>
                                </div>
                            )}
                            {item.sku && (
                                <div className="text-xs text-gray">
                                    SKU: <span className="font-medium text-dark">{item.sku}</span>
                                </div>
                            )}
                        </div>

                        <div className="w-full max-w-xs space-y-1 text-sm text-dark my-auto">
                            <div className="flex items-center gap-2">
                                <span className="text-gray font-medium text-xs">Unit Price:</span>
                                <span className="font-semibold">{formatCurrency(item.unitPrice)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray font-medium text-xs">Amount:</span>
                                <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
                            </div>
                            {reviewMode && (
                                <div className="flex items-center gap-2 text-xs text-gray">
                                    <span>Quantity:</span>
                                    <span className="font-bold text-dark">{item.quantity}</span>
                                </div>
                            )}
                        </div>

                        {!reviewMode && (
                            <div className="flex flex-row items-center gap-4 pt-2 sm:flex-col sm:justify-center sm:gap-2 sm:pt-0">
                                <div className="border-primary text-primary flex h-[36px] w-[115px] items-center justify-around rounded border-2">
                                    <button
                                        type="button"
                                        aria-label="decrease-quantity"
                                        className="disabled:text-light-ash p-2.5 font-semibold flex items-center justify-center transition-colors"
                                        disabled={item.quantity <= 1}
                                        onClick={() => decreaseQty(item.id)}
                                    >
                                        <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor">
                                            <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                                        </svg>
                                    </button>
                                    <p className="w-8 text-center text-base font-semibold text-dark select-none">
                                        {item.quantity}
                                    </p>
                                    <button
                                        type="button"
                                        aria-label="increase-quantity"
                                        className="disabled:text-light-ash p-2.5 font-semibold flex items-center justify-center transition-colors"
                                        disabled={!item.available || item.quantity >= item.maxQuantity}
                                        onClick={() => increaseQty(item.id)}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
                                            <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
                                        </svg>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    aria-label={`remove ${item.name}`}
                                    onClick={() => removeItemById(item.id, item.name)}
                                    className="text-gray hover:text-danger transition-colors p-1"
                                >
                                    <DeleteIconMD />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
