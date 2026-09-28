// components/QuickView.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useFloatingCart } from '@/context/CartContext';
import { toProductView } from '@/lib/productView';
import { PLACEHOLDER_IMAGE } from '@/lib/api';
import { getProductUrl } from '@/utils/urlHelper';
import CloseButtonIcon from '@/components/Icons/CloseButtonIcon';
import FacebookIcon from '@/components/Icons/FacebookIcon';
import XIcon from '@/components/Icons/XIcon';
import WhatsappIcon from '@/components/Icons/WhatsappIcon';
import TelegramIcon from '@/components/Icons/TelegramIcon';

/**
 * A modal preview of a product, opened from a product card.
 *
 * Takes a `ProductResource` and flattens it through the same `toProductView` as
 * the card it was opened from, so the price and image shown in the modal are
 * guaranteed to be the ones the shopper just clicked on.
 */
const QuickView = ({ product, onClose }) => {
    const [quantity, setQuantity] = useState(1);
    const [shareUrl, setShareUrl] = useState('');
    const { addToCart } = useFloatingCart();
    const router = useRouter();

    const view = toProductView(product);

    // Sharing needs an absolute URL, which only exists in a browser, so it is
    // derived after mount rather than during render.
    useEffect(() => {
        setShareUrl(view ? getProductUrl(view) : '');
    }, [view]);

    // Changing product resets the quantity, otherwise a shopper who had set
    // three of one item and then opened another would silently order three.
    useEffect(() => {
        setQuantity(1);
    }, [product?.id]);

    if (!view) return null;

    const buyable = view.purchasable && view.defaultVariantId;

    const handleQuantityChange = (action) => {
        setQuantity((prev) => {
            if (action === 'increase') {
                // Never let the stepper promise more than the API will sell.
                return Math.min(prev + 1, view.stockQuantity || prev + 1);
            }
            if (action === 'decrease' && prev > 1) return prev - 1;
            return prev;
        });
    };

    const handleAddToCart = async () => {
        if (!buyable) {
            toast.error('This product is currently unavailable.');
            return;
        }

        await addToCart(view.defaultVariantId, quantity);
        onClose();
    };

    const handleBuyNow = async () => {
        if (!buyable) {
            toast.error('This product is currently unavailable.');
            return;
        }

        await addToCart(view.defaultVariantId, quantity);
        onClose();
        router.push('/checkout');
    };

    const getShareUrl = (platform) => {
        if (!shareUrl) return '#';

        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedName = encodeURIComponent(view.name);

        switch (platform) {
            case 'facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            case 'twitter':
                return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedName}`;
            case 'whatsapp':
                return `https://wa.me/?text=${encodedName}%20${encodedUrl}`;
            case 'telegram':
                return `https://t.me/share/url?url=${encodedUrl}&text=${encodedName}`;
            default:
                return '#';
        }
    };

    return (
        <div className="modal-overlay fixed inset-0 z-[99999] flex items-center justify-center bg-black/70">
            <div className="mx-4 md:mx-10 relative max-w-[1300px] w-full shadow-lg bg-white rounded-xl z-[99999]">
                <div className="flex items-center justify-between rounded-t-xl bg-white px-3 py-2.5 border-b-2 border-light-white">
                    <p className="text-dark text-lg leading-normal font-medium">Quick View</p>
                    <button
                        onClick={onClose}
                        aria-label="modal-close-button"
                        type="button"
                        className="focus:outline-none hover:scale-110 transition-transform"
                    >
                        <CloseButtonIcon />
                    </button>
                </div>
                <div className="px-3 py-3 xl:py-5 bg-white rounded-b-xl">
                    <div className="lg:max-h-[80vh] 3xl:max-h-full overflow-y-auto 2xl:max-w-[1300px]">
                        <div className="text-dark border-light-ash relative grid grid-cols-12 gap-5 border-b pb-4 lg:gap-8 lg:border-none lg:pb-0 xl:gap-12">
                            <div className="col-span-full my-auto py-5 md:col-span-6 md:py-0 lg:col-span-5">
                                <div className="relative">
                                    <img
                                        alt={view.name}
                                        width="540"
                                        height="540"
                                        decoding="async"
                                        className="border-light-white mx-auto rounded-md border md:mx-0"
                                        src={view.image}
                                        onError={(e) => {
                                            e.target.src = PLACEHOLDER_IMAGE;
                                        }}
                                        style={{ color: 'transparent' }}
                                    />
                                </div>
                            </div>

                            <div className="relative col-span-full md:col-span-6 lg:col-span-7">
                                <div>
                                    <h1 className="text-dark text-lg leading-[21px] font-medium md:text-xl md:leading-6 xl:text-[26px] xl:leading-[30px]">
                                        {view.name}
                                    </h1>
                                    {view.category && (
                                        <h2 className="text-primary animate-text-blink mt-2 font-semibold uppercase md:text-base">
                                            {view.category.name}
                                        </h2>
                                    )}
                                </div>

                                {/* Social Media Sharing Section */}
                                <div className="mt-1">
                                    <ul className="flex gap-4 flex-wrap">
                                        <p className="text-primary font-semibold mb-2">Share this product:</p>
                                        <li>
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Share on Facebook"
                                                href={getShareUrl('facebook')}
                                                className="hover:opacity-80 transition-opacity"
                                            >
                                                <FacebookIcon />
                                            </a>
                                        </li>
                                        <li>
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Share on Twitter"
                                                href={getShareUrl('twitter')}
                                                className="hover:opacity-80 transition-opacity"
                                            >
                                                <XIcon />
                                            </a>
                                        </li>
                                        <li>
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Share on WhatsApp"
                                                href={getShareUrl('whatsapp')}
                                                className="hover:opacity-80 transition-opacity"
                                            >
                                                <WhatsappIcon />
                                            </a>
                                        </li>
                                        <li>
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Share on Telegram"
                                                href={getShareUrl('telegram')}
                                                className="hover:opacity-80 transition-opacity"
                                            >
                                                <TelegramIcon />
                                            </a>
                                        </li>
                                    </ul>
                                </div>

                                <ul className="text-gray flex items-center gap-2 lg:gap-3 mt-4 flex-wrap">
                                    <li>
                                        <p className="text-base">
                                            <span>SKU : </span>
                                            <span className="font-semibold text-primary">{view.productCode ?? '—'}</span>
                                        </p>
                                    </li>
                                    <li>
                                        <p className="text-base">
                                            <span>Category : </span>
                                            <span className="font-semibold text-primary">{view.category?.name ?? 'Uncategorised'}</span>
                                        </p>
                                    </li>
                                </ul>

                                <div className="mt-4">
                                    <ul className="flex items-center gap-2.5">
                                        <li className="flex items-center font-semibold text-dark text-xl xl:text-[26px]">
                                            <span className="mr-1 text-lg">৳</span>
                                            {view.price}
                                        </li>
                                        {view.onSale && view.compareAtPrice !== null && (
                                            <li className="relative font-semibold text-light-ash line-through">
                                                ৳ {view.compareAtPrice}
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <p className={`mt-3 font-medium ${view.inStock ? 'text-success' : 'text-danger'}`}>
                                    {view.inStock
                                        ? `In stock (${view.stockQuantity} available)`
                                        : 'Currently out of stock'}
                                </p>

                                {view.description && (
                                    <p className="text-gray mt-3 text-sm leading-6 line-clamp-5">
                                        {view.description}
                                    </p>
                                )}

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <div className="border-primary text-primary flex h-[44px] w-[140px] items-center justify-between rounded border-2 px-2">
                                        <button
                                            type="button"
                                            aria-label="decrease quantity"
                                            className="p-3 flex items-center justify-center disabled:text-light-ash"
                                            disabled={quantity <= 1}
                                            onClick={() => handleQuantityChange('decrease')}
                                        >
                                            <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                                            </svg>
                                        </button>
                                        <p className="text-lg font-semibold mx-2">{quantity}</p>
                                        <button
                                            type="button"
                                            aria-label="increase quantity"
                                            className="p-3 flex items-center justify-center"
                                            onClick={() => handleQuantityChange('increase')}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
                                            </svg>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={!buyable}
                                        onClick={handleAddToCart}
                                        className="bg-primary hover:bg-dark-primary text-white px-6 py-2 rounded-md font-semibold disabled:bg-light-ash disabled:cursor-not-allowed"
                                    >
                                        Add to Cart
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!buyable}
                                        onClick={handleBuyNow}
                                        className="bg-dark hover:bg-dark-primary text-white px-6 py-2 rounded-md font-semibold disabled:bg-light-ash disabled:cursor-not-allowed"
                                    >
                                        Buy Now
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        router.push(`/product/${view.id}/${view.slug}`);
                                    }}
                                    className="mt-4 text-primary font-semibold hover:underline"
                                >
                                    View full details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickView;
