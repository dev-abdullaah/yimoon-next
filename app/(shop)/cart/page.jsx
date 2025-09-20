// app/(shop)/cart/page.jsx
'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useFloatingCart } from '@/context/CartContext';
import DeleteIcon from '@/components/Icons/DeleteIcon';

export default function Cart() {
    const {
        cartItems,
        total,
        evPointTotal,
        formatCurrency,
        removeItemById,
        increaseQty,
        decreaseQty,
        calculateTotalDiscount
    } = useFloatingCart();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Calculate values using the cart context functions
    const subTotal = cartItems.reduce((sum, item) => sum + (item.qty * item.originalPrice), 0);
    const totalDiscount = calculateTotalDiscount(cartItems);
    const grandTotal = total;

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
                                href="/"
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
                    <form action="#" className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                        <div className="col-span-1 xl:col-span-2">
                            <div>
                                <div className="space-y-2.5">
                                    {cartItems.map((item, index) => {
                                        // Calculate discounts
                                        const itemRegularDiscount = item.discount > 0 ? item.qty * item.discount : 0;
                                        const itemEvDiscount = item.evPoint > 0 ? item.qty * item.evPoint : 0;
                                        const itemFinalPrice = (item.qty * item.price) - itemEvDiscount;

                                        return (
                                            <div key={item.id} className="rounded-md bg-white shadow-custom">
                                                <div className="divide-light-white divide-y px-3 sm:px-5">
                                                    <div className="relative flex items-center gap-2 py-3">
                                                        <Link
                                                            href={`/product/${item.id}`}
                                                        >
                                                            <img
                                                                alt="cart_product"
                                                                loading="lazy"
                                                                width="90"
                                                                height="90"
                                                                className="my-auto"
                                                                src={item.image}
                                                                style={{ color: 'transparent' }}
                                                                onError={(e) => {
                                                                    e.target.src = '/resources/images/product_placeholder.jpg';
                                                                }}
                                                            />
                                                        </Link>
                                                        <div className="text-dark-ash flex w-full flex-col justify-between text-xs sm:flex-row sm:gap-4 md:text-sm">
                                                            <div className="w-full max-w-xs flex flex-col justify-center">
                                                                <div>SN. {index + 1}</div>
                                                                <div className="text-dark font-semibold capitalize">{item.name}</div>
                                                                {item.color && (
                                                                    <div>
                                                                        Color: <span className="font-medium">{item.color}</span>
                                                                    </div>
                                                                )}
                                                                {item.size && (
                                                                    <div>
                                                                        Size: <span className="font-medium">{item.size}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="w-full max-w-xs space-y-1 text-sm text-dark">

                                                                {/* Unit Price */}
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-medium">Unit Price:</div>
                                                                    <div className="font-semibold">{formatCurrency(item.originalPrice)}</div>
                                                                </div>

                                                                {/* After Regular Discount (RG) */}
                                                                {itemRegularDiscount > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-medium">- Discount:</div>
                                                                        <div className="font-semibold">
                                                                            {formatCurrency(item.price)}
                                                                        </div>
                                                                        <div className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-lg py-0.5 sm:py-0.5">
                                                                            -{formatCurrency(itemRegularDiscount)}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* After EV Discount */}
                                                                {itemEvDiscount > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-medium">- EV Discount:</div>
                                                                        <div className="font-semibold">
                                                                            {formatCurrency(item.price - itemEvDiscount)}
                                                                        </div>
                                                                        <div className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-lg py-0.5 sm:py-0.5">
                                                                            -{formatCurrency(itemEvDiscount)}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Final Amount */}
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-medium">Amount:</div>
                                                                    <div className="font-semibold">{formatCurrency(itemFinalPrice)}</div>
                                                                    {(item.originalPrice > item.price || itemEvDiscount > 0) && (
                                                                        <div
                                                                            className="text-light-ash text-lg"
                                                                            style={{
                                                                                textDecoration: 'line-through',
                                                                                textDecorationColor: 'red',
                                                                                textDecorationThickness: '2px'
                                                                            }}
                                                                        >
                                                                            {formatCurrency(item.qty * item.originalPrice)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-row items-center gap-5 pt-3 sm:flex-col sm:justify-center sm:gap-2 sm:pt-0">
                                                                <div className="border-primary text-primary xs:w-32 3xl:w-28 flex h-8 w-28 items-center justify-around rounded border sm:h-9 sm:w-24 sm:border-2">
                                                                    <button
                                                                        type="button"
                                                                        aria-label="decrease-quantity"
                                                                        className="disabled:text-light-ash p-3 font-semibold"
                                                                        disabled={item.qty <= 1}
                                                                        onClick={() => {
                                                                            decreaseQty(item.id);
                                                                            toast.success(`"${item.name}" removed from cart`);
                                                                        }}
                                                                    >
                                                                        <svg
                                                                            width="11"
                                                                            height="4"
                                                                            viewBox="0 0 11 4"
                                                                            fill="currentColor"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                        >
                                                                            <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z"></path>
                                                                        </svg>
                                                                    </button>
                                                                    <div className="w-6 text-center text-base font-bold sm:text-lg">{item.qty}</div>
                                                                    <button
                                                                        type="button"
                                                                        aria-label="increase-quantity"
                                                                        className="disabled:text-light-ash p-3 font-semibold"
                                                                        onClick={() => {
                                                                            increaseQty(item.id);
                                                                            toast.success(`"${item.name}" added to cart`);
                                                                        }}
                                                                    >
                                                                        <svg
                                                                            width="13"
                                                                            height="13"
                                                                            viewBox="0 0 13 13"
                                                                            fill="currentColor"
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                        >
                                                                            <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z"></path>
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    aria-label="delete-product"
                                                                    onClick={() => removeItemById(item.id, item.name)}
                                                                >
                                                                    <DeleteIcon />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
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
                                                    {formatCurrency(subTotal)}
                                                </p>
                                            </li>
                                            {totalDiscount > 0 && (
                                                <li className="flex justify-between">
                                                    <p>Regular Discount</p>
                                                    <p className="flex items-center font-medium text-danger">
                                                        - {formatCurrency(totalDiscount)}
                                                    </p>
                                                </li>
                                            )}
                                            {/* Add EV Points Discount display */}
                                            {evPointTotal > 0 && (
                                                <li className="flex justify-between">
                                                    <p>EV Points Discount</p>
                                                    <p className="flex items-center font-medium text-success">
                                                        - {formatCurrency(evPointTotal)}
                                                    </p>
                                                </li>
                                            )}
                                            <li className="flex justify-between font-bold sm:text-base pt-2 border-t border-light-white">
                                                <p>Total Payable</p>
                                                <p className="flex items-center">{formatCurrency(grandTotal)}</p>
                                            </li>
                                        </div>
                                        <Link
                                            href="/checkout"
                                            className="bg-primary hover:bg-primary mt-7 w-full rounded-md py-2 text-lg font-bold text-white block text-center"
                                        >
                                            Go To Checkout
                                        </Link>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}