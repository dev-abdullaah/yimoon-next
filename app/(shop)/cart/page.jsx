// app/(shop)/cart/page.jsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useFloatingCart } from '@/context/CartContext';
import { cartLinePath } from '@/utils/urlHelper';
import { PLACEHOLDER_IMAGE } from '@/lib/api';
import DeleteIcon from '@/components/Icons/DeleteIcon';

/**
 * A shopper-readable sentence for an `issues[]` reason.
 *
 * The API reports why a line cannot be bought as a stable code so that clients
 * can act on it; showing the code itself would be meaningless to the person
 * reading the cart.
 */
const ISSUE_REASONS = {
    no_longer_available: 'is no longer available',
    insufficient_stock: 'has less stock left than your cart holds',
    out_of_stock: 'is out of stock',
};

const issueText = (issue) => {
    const reason = ISSUE_REASONS[issue.reason] ?? 'is no longer available';
    return `${issue.product ?? 'An item'} ${reason}.`;
};


/**
 * The full cart page.
 *
 * Every figure on this page — the line totals, the subtotal, the discount, the
 * grand total — comes from the API's quote rather than being recomputed here.
 * The cart is priced server-side against live stock and the store's own tax and
 * shipping rules, so a total assembled in the browser is a total that will drift
 * from what the shopper is actually charged.
 */
export default function Cart() {
    const {
        cartItems,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        savings,
        itemCount,
        freeShippingApplied,
        issues,
        checkoutReady,
        loading,
        formatCurrency,
        removeItemById,
        increaseQty,
        decreaseQty,
        setItemQuantity,
        clearCart,
        pruneCart,
    } = useFloatingCart();

    // Arriving from a product page should show the cart from the top, not
    // halfway down wherever the previous scroll position was.
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (cartItems.length === 0) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12">
                <section>
                    <div className="mb-10 2xl:px-20">
                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                            <img
                                alt="empty_cart"
                                loading="lazy"
                                width="100"
                                height="100"
                                className="color-transparent"
                                src="/resources/media/empty-cart.gif"
                                style={{ color: 'transparent' }}
                            />
                            <p className="text-2xl font-bold uppercase">
                                Empty <span className="text-primary">Cart !</span>
                            </p>
                            <p>Please add some product to the Cart</p>
                            <Link
                                href="/catalog"
                                className="bg-primary rounded-md px-6 py-2 font-medium text-white"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12">
            <section>
                <div className="mb-10 2xl:px-20">
                    <div className="mb-4 flex items-center justify-between">
                        <h1 className="text-dark text-lg font-semibold sm:text-xl">
                            Your Cart <span className="text-gray">({itemCount})</span>
                        </h1>
                        <button
                            type="button"
                            onClick={clearCart}
                            className="text-gray text-sm hover:text-danger"
                        >
                            Clear cart
                        </button>
                    </div>

                    {/*
                     * Lines the API can no longer sell. These are shown as
                     * problems to act on rather than as a failure, because a
                     * shopper who stocked up days ago did nothing wrong.
                     */}
                    {issues.length > 0 && (
                        <div className="mb-4 rounded-md border border-danger bg-red-50 p-4">
                            <p className="font-semibold text-danger">
                                {issues.length} item{issues.length === 1 ? '' : 's'} can no longer be ordered
                            </p>
                            <ul className="mt-2 list-disc pl-5 text-sm text-gray">
                                {issues.map((issue, index) => (
                                    <li key={issue.variant_id ?? index}>{issueText(issue)}</li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={pruneCart}
                                disabled={loading}
                                className="bg-danger mt-3 rounded-md px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                Remove unavailable items
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                        <div className="col-span-1 xl:col-span-2">
                            <div className="space-y-2.5">
                                {cartItems.map((item, index) => (
                                    <div key={item.id} className="rounded-md bg-white shadow-custom">
                                        <div className="divide-light-white divide-y px-3 sm:px-5">
                                            <div className="relative flex items-center gap-2 py-3">
                                                <Link href={cartLinePath(item)}>
                                                    <img
                                                        alt={item.name}
                                                        loading="lazy"
                                                        width="90"
                                                        height="90"
                                                        className="my-auto"
                                                        src={item.image}
                                                        style={{ color: 'transparent' }}
                                                        onError={(e) => {
                                                            e.target.src = PLACEHOLDER_IMAGE;
                                                        }}
                                                    />
                                                </Link>
                                                <div className="text-dark-ash flex w-full flex-col justify-between text-xs sm:flex-row sm:gap-4 md:text-sm">
                                                    <div className="w-full max-w-xs flex flex-col justify-center">
                                                        <div>SN. {index + 1}</div>
                                                        <Link href={cartLinePath(item)}>
                                                            <div className="text-dark font-semibold capitalize hover:text-primary">
                                                                {item.name}
                                                            </div>
                                                        </Link>
                                                        {item.attributeLabel && (
                                                            <div>
                                                                Option: <span className="font-medium">{item.attributeLabel}</span>
                                                            </div>
                                                        )}
                                                        {item.sku && (
                                                            <div className="text-gray">
                                                                SKU: <span className="font-medium">{item.sku}</span>
                                                            </div>
                                                        )}
                                                        {!item.available && (
                                                            <div className="text-danger font-medium">
                                                                No longer available — please remove
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="w-full max-w-xs space-y-1 text-sm text-dark">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium">Unit Price:</div>
                                                            <div className="font-semibold">
                                                                {formatCurrency(item.unitPrice)}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium">Amount:</div>
                                                            <div className="font-semibold">
                                                                {formatCurrency(item.lineTotal)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-row items-center gap-5 pt-3 sm:flex-col sm:justify-center sm:gap-2 sm:pt-0">
                                                        <div className="border-primary text-primary flex h-[36px] w-[115px] items-center justify-around rounded border-2">
                                                            <button
                                                                type="button"
                                                                aria-label="decrease-quantity"
                                                                className="disabled:text-light-ash p-2.5 font-semibold flex items-center justify-center transition-colors"
                                                                disabled={item.quantity <= 1}
                                                                onClick={() => decreaseQty(item.id)}
                                                            >
                                                                <svg
                                                                    width="11"
                                                                    height="4"
                                                                    viewBox="0 0 11 4"
                                                                    fill="currentColor"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                >
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
                                                                <svg
                                                                    width="13"
                                                                    height="13"
                                                                    viewBox="0 0 13 13"
                                                                    fill="currentColor"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                >
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
                                                            <DeleteIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="sticky top-[137px] col-span-1 w-full">
                            <div className="sticky top-[157px] space-y-5">
                                <div className="shadow-custom rounded-default">
                                    <h2 className="text-dark text-sm sm:text-lg font-semibold py-2.5 border-b border-light-white px-3 sm:px-5">
                                        Your Bill
                                    </h2>
                                    <ul className="pb-2.5 sm:pb-5 px-3 sm:px-5">
                                        <div className="mt-3 space-y-3 text-sm">
                                            <li className="flex justify-between">
                                                <p>Sub-Total</p>
                                                <p className="flex items-center font-medium">
                                                    {formatCurrency(subtotal)}
                                                </p>
                                            </li>
                                            {discount > 0 && (
                                                <li className="flex justify-between">
                                                    <p>Discount</p>
                                                    <p className="flex items-center font-medium text-success">
                                                        - {formatCurrency(discount)}
                                                    </p>
                                                </li>
                                            )}
                                            {shipping > 0 && (
                                                <li className="flex justify-between">
                                                    <p>Delivery</p>
                                                    <p className="flex items-center font-medium">
                                                        {formatCurrency(shipping)}
                                                    </p>
                                                </li>
                                            )}
                                            {freeShippingApplied && (
                                                <li className="flex justify-between text-success">
                                                    <p>Free delivery applied</p>
                                                    <p className="font-medium">—</p>
                                                </li>
                                            )}
                                            {tax > 0 && (
                                                <li className="flex justify-between">
                                                    <p>Tax</p>
                                                    <p className="flex items-center font-medium">
                                                        {formatCurrency(tax)}
                                                    </p>
                                                </li>
                                            )}
                                            <li className="flex justify-between font-bold sm:text-base pt-2 border-t border-light-white">
                                                <p>Total Payable</p>
                                                <p className="flex items-center">{formatCurrency(total)}</p>
                                            </li>
                                            {savings > 0 && (
                                                <li className="flex justify-between text-success">
                                                    <p>You save</p>
                                                    <p className="font-medium">{formatCurrency(savings)}</p>
                                                </li>
                                            )}
                                        </div>

                                        {/*
                                         * The checkout button states *why* it is
                                         * unavailable rather than sitting inert.
                                         */}
                                        {checkoutReady ? (
                                            <Link
                                                href="/checkout"
                                                className="bg-primary hover:bg-dark-primary mt-7 w-full rounded-md py-2 text-lg font-bold text-white block text-center"
                                            >
                                                Go To Checkout
                                            </Link>
                                        ) : (
                                            <div className="mt-7 rounded-md border border-light-white bg-slate-50 p-3 text-center text-sm text-gray">
                                                {issues.length > 0
                                                    ? 'Remove the unavailable items to continue to checkout.'
                                                    : 'Your cart needs attention before checkout.'}
                                            </div>
                                        )}

                                        <p className="mt-3 text-center text-xs text-gray">
                                            Delivery and tax are confirmed at checkout for your address.
                                        </p>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
