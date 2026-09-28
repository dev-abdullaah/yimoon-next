// app/(shop)/checkout/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { checkoutApi, addressApi, accountApi, getProductImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useFloatingCart } from '@/context/CartContext';
import { cartLinePath } from '@/utils/urlHelper';
import DeleteIcon from '@/components/Icons/DeleteIcon';

/**
 * Checkout.
 *
 * Two rules run through the whole page:
 *
 * 1. **Nothing is priced in the browser.** The totals shown here come from
 *    `POST /checkout/preview`, which prices the cart server-side against live
 *    stock, the store's tax and shipping rules, and the coupon. A total summed up
 *    in React would be a total that drifts from what the shopper is charged.
 *
 * 2. **The address is validated by the same endpoint that places the order.**
 *    A preview is requested for every address the shopper types, so by the time
 *    the place button is enabled the server has already agreed the address is
 *    deliverable. Typing an undeliverable address surfaces a server message here
 *    rather than a validation dump after the order is attempted.
 *
 * A saved address is offered to signed-in shoppers because it is faster and
 * removes the chance of a typo in the phone number, which is also the key to
 * guest order tracking. Guests type one out, and the payload is identical —
 * `CheckoutRequest` does not care where the fields came from.
 */

const ZONE_LABELS = {
    inside_dhaka: 'Inside Dhaka',
    outside_dhaka: 'Outside Dhaka',
};

const emptyAddress = {
    recipient_name: '',
    phone_number: '',
    line1: '',
    line2: '',
    area: '',
    city: '',
    postal_code: '',
};

/**
 * A fresh idempotency key for one checkout attempt.
 *
 * Generated when the page mounts and reused for every retry of the *same* place
 * request. That is what makes a double-clicked Place Order button, or a retry
 * after a dropped connection, produce one order instead of two. A new key is
 * minted when the cart or the address changes, because that is a genuinely new
 * order rather than a repeat of the last one.
 */
const newIdempotencyKey = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function CheckoutPage() {
    const { isAuthenticated, loading: authLoading, user } = useAuth();
    const {
        cartItems,
        issues,
        checkoutReady,
        loading: cartLoading,
        formatCurrency,
        removeItemById,
        setItemQuantity,
        decreaseQty,
        increaseQty,
        pruneCart,
        refreshAfterAuthChange,
    } = useFloatingCart();

    // Which address the shopper is delivering to: a saved one's id, or the
    // string `NEW` for the form. One field, so it is impossible to have a saved
    // address selected and the form half-filled at the same time.
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [address, setAddress] = useState(emptyAddress);
    const [districtId, setDistrictId] = useState('');
    const [coupon, setCoupon] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const [comment, setComment] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
    const [placing, setPlacing] = useState(false);
    const [placedOrder, setPlacedOrder] = useState(null);

    const [quote, setQuote] = useState(null);
    const [quoting, setQuoting] = useState(false);
    const [quoteError, setQuoteError] = useState(null);

    // ---- Saved addresses -------------------------------------------------

    const [savedAddresses, setSavedAddresses] = useState([]);

    useEffect(() => {
        if (!isAuthenticated) {
            setSavedAddresses([]);
            return;
        }

        let cancelled = false;

        accountApi
            .getAddresses()
            .then((response) => {
                if (cancelled) return;

                const addresses = response?.data ?? [];

                setSavedAddresses(addresses);

                // Preselect the default, else the first — the alternative is a
                // shopper with a saved address still being asked to type one
                // for no reason.
                const preferred = addresses.find((entry) => entry.is_default) ?? addresses[0] ?? null;

                if (preferred) {
                    setSelectedAddressId(preferred.id);
                } else {
                    setSelectedAddressId('NEW');
                }
            })
            .catch(() => {
                // A failed address load is not a reason to block checkout: the
                // typed form is always available, so the shopper can carry on.
                if (!cancelled) setSelectedAddressId('NEW');
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    // ---- District list ---------------------------------------------------

    const [districts, setDistricts] = useState([]);

    useEffect(() => {
        let cancelled = false;

        addressApi
            .getDistricts()
            .then((response) => {
                if (!cancelled) setDistricts(response?.data?.districts ?? []);
            })
            .catch(() => {
                // The district list only feeds the select. If it cannot load the
                // shopper can still type a city by hand, so this is left as a
                // free-text field rather than an error.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Pre-fill the typed form with the signed-in shopper's own name and phone,
    // which are the two fields they have most likely typed before. Only once,
    // when the form is first opened for someone who has not edited it.
    useEffect(() => {
        if (selectedAddressId !== 'NEW' || !user) return;

        setAddress((prev) => ({
            ...prev,
            recipient_name: prev.recipient_name || user.name || '',
            phone_number: prev.phone_number || user.phone_number || '',
        }));
    }, [selectedAddressId, user]);

    // ---- Payment methods -------------------------------------------------

    useEffect(() => {
        let cancelled = false;

        checkoutApi
            .getPaymentMethods()
            .then((response) => {
                if (cancelled) return;

                const methods = response?.data?.methods ?? [];

                setPaymentMethod((current) => {
                    // Keep whatever is still on offer; otherwise take the first.
                    // Never keep a method the server has since stopped offering,
                    // or the place request would be refused for a gateway the
                    // shopper could not have picked anyway.
                    if (current && methods.some((method) => method.key === current)) {
                        return current;
                    }

                    return methods[0]?.key ?? '';
                });
            })
            .catch((error) => {
                if (!cancelled) toast.error(error.message || 'Could not load payment methods');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // ---- The payload the API expects ------------------------------------

    // Exactly the shape `CheckoutRequest` and `CheckoutController::preview`
    // read. Sending `shipping_address_id` *instead of* the typed fields is what
    // the backend's `required_with_all` rules are written around, so the two are
    // never sent together — the saved one wins, as the server assumes.
    const addressPayload = useMemo(() => {
        if (selectedAddressId && selectedAddressId !== 'NEW') {
            return { shipping_address_id: selectedAddressId };
        }

        const district = districts.find((entry) => String(entry.id) === String(districtId));

        return {
            recipient_name: address.recipient_name.trim(),
            phone_number: address.phone_number.trim(),
            line1: address.line1.trim(),
            line2: address.line2.trim() || null,
            area: address.area.trim() || null,
            // The district is chosen from the Bangladesh list the API serves
            // because that is what determines the shipping rate; the zone rules
            // match on the city name, not an id.
            city: (district?.name_en ?? address.city).trim(),
            postal_code: address.postal_code.trim() || null,
            country: 'BD',
        };
    }, [selectedAddressId, address, districtId, districts]);

    // Whether the typed form has enough in it to be worth pricing. The server
    // would reject a partial address, so there is no point asking for a quote
    // the shopper cannot act on.
    const typedAddressComplete =
        selectedAddressId === 'NEW' &&
        Boolean(
            address.recipient_name.trim() &&
                address.phone_number.trim() &&
                address.line1.trim() &&
                (districts.find((entry) => String(entry.id) === String(districtId)) || address.city.trim())
        );

    const canPrice =
        cartItems.length > 0 && (Boolean(selectedAddressId) || typedAddressComplete);

    // ---- Live quote ------------------------------------------------------

    // Re-priced whenever the delivery destination or the coupon changes. The
    // delay is a debounce: pricing on every keystroke would fire a request per
    // character, and the throttled `checkout` middleware would start refusing
    // the shopper's own typing.
    useEffect(() => {
        if (!canPrice) {
            setQuote(null);
            setQuoteError(null);
            return;
        }

        let cancelled = false;
        const handle = setTimeout(() => {
            setQuoting(true);
            setQuoteError(null);

            checkoutApi
                .preview({ ...addressPayload, coupon_code: appliedCoupon || null })
                .then((response) => {
                    if (cancelled) return;
                    setQuote(response?.data ?? null);
                })
                .catch((error) => {
                    if (cancelled) return;
                    // A quote that cannot be produced is surfaced, not hidden:
                    // the totals on screen would otherwise silently be the
                    // previous address's.
                    setQuote(null);
                    setQuoteError(error.message || 'Could not price this order yet');
                })
                .finally(() => {
                    if (!cancelled) setQuoting(false);
                });
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [canPrice, addressPayload, appliedCoupon]);

    // A new cart, address or coupon is a new order, so the old key is retired.
    // Reusing it would make the server reject the genuine new order as a repeat.
    useEffect(() => {
        setIdempotencyKey(newIdempotencyKey());
    }, [selectedAddressId, addressPayload, appliedCoupon]);

    // ---- Actions ---------------------------------------------------------

    const applyCoupon = (event) => {
        event.preventDefault();

        const code = coupon.trim();

        if (!code) {
            setAppliedCoupon('');
            return;
        }

        // Applied as-is; the server decides. A rejected code comes back as a
        // quote error naming the coupon, which is clearer than a client-side
        // guess at the rules.
        setAppliedCoupon(code);
    };

    const placeOrder = async (event) => {
        event.preventDefault();

        if (!quote) {
            toast.error('Wait for the order total to finish updating.');
            return;
        }

        if (issues.length > 0) {
            toast.error('Remove the unavailable items from your cart first.');
            return;
        }

        setPlacing(true);

        try {
            const response = await checkoutApi.placeOrder({
                ...addressPayload,
                payment_method: paymentMethod,
                coupon_code: appliedCoupon || null,
                comment: comment.trim() || null,
                idempotency_key: idempotencyKey,
            });

            const payload = response?.data ?? null;
            const order = payload?.order ?? null;
            const intent = payload ?? {};

            setPlacedOrder({
                order,
                payment: intent.payment ?? null,
                instructions: intent.instructions ?? null,
            });

            // The cart is now the server's history, not a live cart. Refetching
            // rather than clearing locally means the header count is the real
            // one rather than an optimistic zero.
            await Promise.allSettled([refreshAfterAuthChange(), pruneCartSilently()]);

            if (intent.action === 'redirect' && intent.redirect_url) {
                // A redirect gateway (bKash, Nagad) owns the next screen
                // entirely, so hand the whole tab over to it.
                window.location.href = intent.redirect_url;
                return;
            }

            if (intent.action === 'confirm') {
                // An inline gateway (Stripe) needs its own client SDK to
                // complete. Without one bundled, the shopper is told what
                // happened rather than left on a button that does nothing.
                toast.error(
                    'This payment method needs a step we cannot show here. Your order is saved — please pay from your order page.'
                );
            }
        } catch (error) {
            const fields = error.errors ?? null;

            toast.error(
                fields
                    ? Object.values(fields).flat()[0]
                    : error.message || 'Could not place your order'
            );
        } finally {
            setPlacing(false);
        }
    };

    // Clearing the cart after a successful order is housekeeping, not part of
    // placing it — a failure to clear must not turn a placed order into an
    // error on screen.
    const pruneCartSilently = async () => {
        try {
            await pruneCart();
        } catch {
            // Ignored deliberately; the order exists either way and the next
            // cart fetch will show the truth.
        }
    };

    const updateAddress = (key) => (event) =>
        setAddress((prev) => ({ ...prev, [key]: event.target.value }));

    // ---- Guards ----------------------------------------------------------

    // Signing in merges a guest cart into the shopper's, so the basket can
    // change underneath the checkout. The cart is re-read once the session is
    // known, otherwise a guest who signs in at the last step would place the
    // order against a cart that is no longer theirs.
    useEffect(() => {
        if (!authLoading) refreshAfterAuthChange();
        // Intentionally keyed on the session state alone: re-running this on
        // every cart change would loop, since refreshing the cart changes it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated]);

    if (placedOrder) {
        return <OrderPlaced placed={placedOrder} />;
    }

    if (authLoading || cartLoading) {
        return (
            <main className="container mx-auto px-5 py-10 md:px-7 lg:px-12">
                <div className="h-96 w-full animate-pulse rounded-md bg-slate-200" />
            </main>
        );
    }

    if (cartItems.length === 0) {
        return (
            <main className="container mx-auto px-5 py-10 md:px-7 lg:px-12">
                <div className="py-16 text-center">
                    <p className="text-lg font-semibold text-dark">There is nothing to check out</p>
                    <p className="mt-1 text-gray">Add something to your cart first.</p>
                    <Link
                        href="/catalog"
                        className="bg-primary mt-6 inline-block rounded-md px-6 py-2 font-medium text-white"
                    >
                        Browse products
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-5 py-6 md:px-7 lg:px-12">
            <h1 className="text-dark text-2xl font-semibold">Checkout</h1>

            <form
                onSubmit={placeOrder}
                className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]"
            >
                <div className="space-y-8">
                    <Lines
                        items={cartItems}
                        formatCurrency={formatCurrency}
                        onDecrease={decreaseQty}
                        onIncrease={increaseQty}
                        onSetQuantity={setItemQuantity}
                        onRemove={removeItemById}
                    />

                    {issues.length > 0 && (
                        <div className="rounded-md border border-danger bg-red-50 p-4">
                            <h2 className="text-danger font-semibold">Some items cannot be ordered</h2>
                            <ul className="mt-2 text-sm text-danger">
                                {issues.map((issue) => (
                                    <li key={issue.cart_item_id ?? issue.product}>
                                        {issue.product} — {issueText(issue)}
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={pruneCart}
                                className="border-danger mt-3 rounded border px-3 py-1.5 text-sm"
                            >
                                Remove them and continue
                            </button>
                        </div>
                    )}

                    <AddressSection
                        isAuthenticated={isAuthenticated}
                        savedAddresses={savedAddresses}
                        selectedAddressId={selectedAddressId}
                        onSelect={setSelectedAddressId}
                        address={address}
                        onChange={updateAddress}
                        districts={districts}
                        districtId={districtId}
                        onDistrictChange={setDistrictId}
                        quote={quote}
                        quoting={quoting}
                        quoteError={quoteError}
                        formatCurrency={formatCurrency}
                    />

                    <section>
                        <h2 className="text-dark mb-3 font-semibold">Payment Method</h2>

                        <PaymentMethods value={paymentMethod} onChange={setPaymentMethod} quote={quote} />
                    </section>

                    <section>
                        <label htmlFor="order-comment" className="text-dark mb-1 block font-semibold">
                            Order notes (optional)
                        </label>
                        <textarea
                            id="order-comment"
                            rows={3}
                            maxLength={500}
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            placeholder="Anything the courier should know — e.g. call before arriving."
                            className="border-light-ash focus:border-primary w-full rounded-md border px-3 py-2 text-sm outline-0"
                        />
                    </section>
                </div>

                <aside className="lg:sticky lg:top-24 lg:h-fit">
                    <Summary
                        quote={quote}
                        quoting={quoting}
                        quoteError={quoteError}
                        issues={issues}
                        checkoutReady={checkoutReady}
                        canPrice={canPrice}
                        placing={placing}
                        paymentMethod={paymentMethod}
                        coupon={coupon}
                        appliedCoupon={appliedCoupon}
                        onCouponChange={setCoupon}
                        onApplyCoupon={applyCoupon}
                        onClearCoupon={() => {
                            setCoupon('');
                            setAppliedCoupon('');
                        }}
                        formatCurrency={formatCurrency}
                        needsSignInForSaved={isAuthenticated && savedAddresses.length === 0}
                    />
                </aside>
            </form>
        </main>
    );
}

/** The cart lines, editable right up to the moment the order is placed. */
function Lines({ items, formatCurrency, onDecrease, onIncrease, onSetQuantity, onRemove }) {
    return (
        <section>
            <h2 className="text-dark mb-3 font-semibold">
                Your Items ({items.length})
            </h2>

            <ul className="space-y-3">
                {items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-4 border-b border-light-white pb-3">
                        <Link href={cartLinePath(item)} className="shrink-0">
                            <img
                                src={getProductImageUrl(item.image)}
                                alt={item.name}
                                width="72"
                                height="72"
                                loading="lazy"
                                className="h-[72px] w-[72px] rounded object-cover"
                                onError={(event) => {
                                    event.target.src = PLACEHOLDER_IMAGE;
                                }}
                            />
                        </Link>

                        <div className="min-w-0 flex-1">
                            <Link
                                href={cartLinePath(item)}
                                className="text-dark hover:text-primary text-sm font-medium"
                            >
                                {item.name}
                            </Link>
                            {item.variantName && (
                                <p className="text-xs text-gray">{item.variantName}</p>
                            )}
                            <p className="text-sm font-semibold">
                                {formatCurrency(item.unitPrice)}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onDecrease(item.id)}
                                aria-label={`Decrease quantity of ${item.name}`}
                                className="border-light-ash h-8 w-8 rounded border"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                min={1}
                                // `maxQuantity` is Infinity when the API reported
                                // no ceiling, and a number input cannot take
                                // Infinity — so the attribute is only set when
                                // there is a real limit.
                                max={Number.isFinite(item.maxQuantity) ? item.maxQuantity : undefined}
                                value={item.quantity}
                                onChange={(event) => onSetQuantity(item.id, event.target.value)}
                                aria-label={`Quantity of ${item.name}`}
                                className="border-light-ash w-16 rounded border px-2 py-1 text-center text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => onIncrease(item.id)}
                                aria-label={`Increase quantity of ${item.name}`}
                                className="border-light-ash h-8 w-8 rounded border"
                            >
                                +
                            </button>
                        </div>

                        <span className="w-24 text-right font-semibold">
                            {formatCurrency(item.lineTotal)}
                        </span>

                        <button
                            type="button"
                            onClick={() => onRemove(item.id, item.name)}
                            aria-label={`Remove ${item.name} from your cart`}
                        >
                            <DeleteIcon />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Saved-address picker for signed-in shoppers, or the typed form for guests. */
function AddressSection({
    isAuthenticated,
    savedAddresses,
    selectedAddressId,
    onSelect,
    address,
    onChange,
    districts,
    districtId,
    onDistrictChange,
    quote,
    quoting,
    quoteError,
    formatCurrency,
}) {
    const typing = selectedAddressId === 'NEW';

    return (
        <section>
            <h2 className="text-dark mb-3 font-semibold">Delivery Address</h2>

            {isAuthenticated && savedAddresses.length > 0 && (
                <ul className="mb-4 grid gap-2 sm:grid-cols-2">
                    {savedAddresses.map((saved) => (
                        <li key={saved.id}>
                            <label
                                className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm ${
                                    selectedAddressId === saved.id
                                        ? 'border-primary bg-blue-50/40'
                                        : 'border-light-white'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="address"
                                    className="mt-1"
                                    checked={selectedAddressId === saved.id}
                                    onChange={() => onSelect(saved.id)}
                                />
                                <span>
                                    <span className="text-dark block font-medium">
                                        {saved.label ? `${saved.label} — ` : ''}
                                        {saved.recipient_name}
                                    </span>
                                    <span className="text-gray block">
                                        {saved.line1}
                                        {saved.line2 ? `, ${saved.line2}` : ''}
                                        {saved.area ? `, ${saved.area}` : ''}
                                        {saved.city ? `, ${saved.city}` : ''}
                                    </span>
                                    <span className="text-gray block">{saved.phone_number}</span>
                                </span>
                            </label>
                        </li>
                    ))}

                    <li>
                        <label
                            className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-medium ${
                                typing ? 'border-primary bg-blue-50/40' : 'border-light-white'
                            }`}
                        >
                            <input
                                type="radio"
                                name="address"
                                className="mr-1"
                                checked={typing}
                                onChange={() => onSelect('NEW')}
                            />
                            Use a different address
                        </label>
                    </li>
                </ul>
            )}

            {!isAuthenticated && (
                <p className="text-gray mb-3 text-sm">
                    You are checking out as a guest.{' '}
                    <Link href="/login?redirect=/checkout" className="text-primary hover:underline">
                        Sign in
                    </Link>{' '}
                    to use a saved address.
                </p>
            )}

            {typing && (
                <div className="grid gap-3 rounded-md border border-light-white p-4 sm:grid-cols-2">
                    <Field
                        id="co-name"
                        label="Recipient name"
                        value={address.recipient_name}
                        onChange={onChange('recipient_name')}
                        required
                    />
                    <Field
                        id="co-phone"
                        label="Phone number"
                        type="tel"
                        value={address.phone_number}
                        onChange={onChange('phone_number')}
                        hint="A Bangladeshi mobile number, e.g. 01712345678"
                        required
                    />

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray">District</span>
                        <select
                            value={districtId}
                            onChange={(event) => onDistrictChange(event.target.value)}
                            required
                            className="border-light-ash focus:border-primary w-full rounded-md border bg-white px-3 py-2 text-sm outline-0"
                        >
                            <option value="">Select a district…</option>
                            {districts.map((district) => (
                                <option key={district.id} value={district.id}>
                                    {district.name_en} ({district.division})
                                </option>
                            ))}
                        </select>
                        <span className="mt-1 block text-xs text-gray">
                            The district decides your delivery rate.
                        </span>
                    </label>

                    <Field
                        id="co-postal"
                        label="Postal code (optional)"
                        value={address.postal_code}
                        onChange={onChange('postal_code')}
                    />

                    <div className="sm:col-span-2">
                        <Field
                            id="co-line1"
                            label="House and street"
                            value={address.line1}
                            onChange={onChange('line1')}
                            required
                        />
                    </div>

                    <Field
                        id="co-area"
                        label="Area or landmark (optional)"
                        value={address.area}
                        onChange={onChange('area')}
                    />
                    <Field
                        id="co-line2"
                        label="Apartment, floor (optional)"
                        value={address.line2}
                        onChange={onChange('line2')}
                    />
                </div>
            )}

            <p className="mt-3 text-sm">
                {quoting && <span className="text-gray">Updating delivery cost…</span>}
                {quoteError && <span className="text-danger">{quoteError}</span>}
                {!quoting && !quoteError && quote && (
                    <span className="text-gray">
                        Delivery to{' '}
                        <span className="text-dark font-medium">
                            {ZONE_LABELS[quote.summary?.shipping_zone] ?? 'your district'}
                        </span>{' '}
                        — {formatCurrency(quote.summary?.shipping ?? 0)}
                        {quote.summary?.free_shipping_applied && ' (free on this order)'}
                    </span>
                )}
            </p>
        </section>
    );
}

/**
 * The payment methods on offer.
 *
 * The list is whatever `GET /checkout/payment-methods` returned — only gateways
 * this deployment is actually configured for — rather than a hard-coded list.
 * Offering a gateway with no keys and then refusing the order is worse than not
 * offering it.
 */
function PaymentMethods({ value, onChange, quote }) {
    const methods = quote?.payment_methods ?? [];

    if (methods.length === 0) {
        return (
            <p className="rounded-md border border-danger bg-red-50 p-3 text-sm text-danger">
                No payment method is available right now, so orders cannot be placed. Please
                contact us.
            </p>
        );
    }

    return (
        <ul className="space-y-2">
            {methods.map((method) => (
                <li key={method.key}>
                    <label
                        className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm ${
                            value === method.key ? 'border-primary bg-blue-50/40' : 'border-light-white'
                        }`}
                    >
                        <input
                            type="radio"
                            name="payment_method"
                            className="mt-1"
                            checked={value === method.key}
                            onChange={() => onChange(method.key)}
                        />
                        <span>
                            <span className="text-dark block font-medium">{method.label}</span>
                            {method.instructions && (
                                <span className="text-gray block">{method.instructions}</span>
                            )}
                        </span>
                    </label>
                </li>
            ))}
        </ul>
    );
}

/** The order summary and the Place Order button. */
function Summary({
    quote,
    quoting,
    quoteError,
    issues,
    checkoutReady,
    canPrice,
    placing,
    paymentMethod,
    coupon,
    appliedCoupon,
    onCouponChange,
    onApplyCoupon,
    onClearCoupon,
    formatCurrency,
}) {
    const summary = quote?.summary ?? null;

    return (
        <div className="space-y-4 rounded-md border border-light-white p-5">
            <h2 className="text-dark font-semibold">Order Summary</h2>

            {summary ? (
                <>
                    <Row label="Subtotal" value={formatCurrency(summary.subtotal)} />
                    {summary.discount > 0 && (
                        <Row
                            label={`Discount${summary.coupon_code ? ` (${summary.coupon_code})` : ''}`}
                            value={`− ${formatCurrency(summary.discount)}`}
                            tone="text-success"
                        />
                    )}
                    <Row
                        label="Delivery"
                        value={
                            summary.shipping === 0
                                ? 'Free'
                                : formatCurrency(summary.shipping)
                        }
                    />
                    {summary.tax > 0 && <Row label="Tax" value={formatCurrency(summary.tax)} />}

                    <div className="border-t border-light-white pt-2">
                        <Row label="Total" value={formatCurrency(summary.total)} emphasis />
                    </div>

                    {summary.savings > 0 && (
                        <p className="text-success text-sm">
                            You are saving {formatCurrency(summary.savings)} on this order.
                        </p>
                    )}
                </>
            ) : (
                <p className="text-gray text-sm">
                    {quoteError
                        ? 'The total could not be calculated.'
                        : 'Enter a delivery address to see your total.'}
                </p>
            )}

            <form onSubmit={onApplyCoupon} className="border-t border-light-white pt-4">
                <label htmlFor="coupon" className="mb-1 block text-sm font-medium text-gray">
                    Coupon code
                </label>

                {appliedCoupon ? (
                    <p className="flex items-center justify-between rounded bg-green-50 px-3 py-2 text-sm">
                        <span className="text-success font-medium">{appliedCoupon} applied</span>
                        <button
                            type="button"
                            onClick={onClearCoupon}
                            className="text-gray hover:text-danger"
                        >
                            Remove
                        </button>
                    </p>
                ) : (
                    <div className="flex gap-2">
                        <input
                            id="coupon"
                            type="text"
                            value={coupon}
                            onChange={(event) => onCouponChange(event.target.value)}
                            placeholder="Enter a code"
                            className="border-light-ash focus:border-primary w-full rounded-md border px-3 py-2 text-sm outline-0"
                        />
                        <button
                            type="submit"
                            className="border-light-ash shrink-0 rounded-md border px-4 py-2 text-sm font-medium"
                        >
                            Apply
                        </button>
                    </div>
                )}
            </form>

            <button
                type="submit"
                // Disabled until the server has priced this exact basket for
                // this exact address. Placing an order is the one action here
                // that cannot be taken back, so it waits for a real quote.
                disabled={
                    placing ||
                    quoting ||
                    !canPrice ||
                    !summary ||
                    !paymentMethod ||
                    issues.length > 0 ||
                    !checkoutReady
                }
                className="bg-primary w-full rounded-md px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
                {placing ? 'Placing your order…' : 'Place Order'}
            </button>

            {issues.length > 0 && (
                <p className="text-danger text-sm">
                    Remove the unavailable items above before ordering.
                </p>
            )}

            {quoteError && !summary && <p className="text-danger text-sm">{quoteError}</p>}

            <p className="text-xs text-gray">
                The total shown is the one you will be charged.
            </p>
        </div>
    );
}

const Row = ({ label, value, tone = '', emphasis = false }) => (
    <div className={`flex justify-between text-sm ${emphasis ? 'text-dark text-base font-semibold' : ''}`}>
        <span className={emphasis ? '' : 'text-gray'}>{label}</span>
        <span className={tone}>{value}</span>
    </div>
);

const Field = ({ id, label, value, onChange, type = 'text', hint, required }) => (
    <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray">
            {label}
        </label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            className="border-light-ash focus:border-primary w-full rounded-md border px-3 py-2 text-sm outline-0"
        />
        {hint && <p className="mt-1 text-xs text-gray">{hint}</p>}
    </div>
);

/** A shopper-readable sentence for an `issues[]` reason code. */
const ISSUE_REASONS = {
    no_longer_available: 'is no longer available',
    insufficient_stock: 'has less stock left than your cart holds',
    out_of_stock: 'is out of stock',
};

const issueText = (issue) => ISSUE_REASONS[issue.reason] ?? 'is no longer available';

/**
 * The confirmation screen.
 *
 * Shown in place of the checkout rather than as a toast, so the order number
 * stays on screen to be copied, and the invoice is reachable without hunting
 * through the dashboard.
 */
function OrderPlaced({ placed }) {
    const order = placed.order ?? null;

    return (
        <main className="container mx-auto px-5 py-10 md:px-7 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-dark text-2xl font-semibold">Thank you for your order</h1>

                {order && (
                    <p className="text-gray mt-2">
                        Your order number is{' '}
                        <span className="text-dark font-semibold">
                            {order.order_number_short ?? order.order_number}
                        </span>
                        .
                    </p>
                )}

                {placed.payment && (
                    <p className="text-gray mt-1 text-sm">
                        Payment: {placed.payment.provider} — {placed.payment.status}
                    </p>
                )}

                {placed.instructions && (
                    <p className="text-gray mt-1 text-sm">{placed.instructions}</p>
                )}

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                        href="/dashboard?section=orders"
                        className="bg-primary rounded-md px-6 py-2 font-medium text-white"
                    >
                        View your orders
                    </Link>
                    <Link
                        href="/catalog"
                        className="border-light-ash rounded-md border px-6 py-2 font-medium"
                    >
                        Continue shopping
                    </Link>
                </div>
            </div>
        </main>
    );
}
