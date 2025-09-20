import React, { useState, useEffect } from 'react';
import { useFloatingCart } from '@/context/CartContext';
import { generateSlug, getProductUrl } from '@/utils/urlHelper';
import CloseButtonIcon from '@/components/Icons/CloseButtonIcon';
import FacebookIcon from '@/components/Icons/FacebookIcon';
import XIcon from '@/components/Icons/XIcon';
import WhatsappIcon from '@/components/Icons/WhatsappIcon';
import TelegramIcon from '@/components/Icons/TelegramIcon';

const QuickView = ({ product, onClose }) => {
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useFloatingCart();
    const [productUrl, setProductUrl] = useState('');

    // Generate product URL whenever product changes
    useEffect(() => {
        if (product) {
            // Always use the production URL for sharing
            setProductUrl(getProductUrl(product));
        }
    }, [product]);

    const handleQuantityChange = (action) => {
        if (action === 'increase') {
            setQuantity(prev => prev + 1);
        } else if (action === 'decrease' && quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const handleAddToCart = () => {
        if (product) {
            const cartProduct = {
                id: product.id,
                name: product.name,
                discountedPrice: product.discountedPrice,
                originalPrice: product.originalPrice,
                discount: product.discount,
                evPoint: product.evPoint || 0,
                photo: product.image ? product.image.split('/').pop() : '/resources/images/product_placeholder.jpg',
                category_name: product.category
            };

            addToCart(cartProduct, quantity);
            onClose();
        }
    };

    const handleBuyNow = () => {
        if (product) {
            const cartProduct = {
                id: product.id,
                name: product.name,
                discountedPrice: product.discountedPrice,
                originalPrice: product.originalPrice,
                discount: product.discount,
                evPoint: product.evPoint || 0,
                photo: product.image ? product.image.split('/').pop() : '/resources/images/product_placeholder.jpg',
                category_name: product.category
            };

            addToCart(cartProduct, quantity);
            window.location.href = '/checkout';
        }
    };

    // Generate share URLs for social media platforms
    const getShareUrl = (platform) => {
        if (!productUrl || !product) return '#';

        const encodedUrl = encodeURIComponent(productUrl);
        const encodedName = encodeURIComponent(product.name);

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

    if (!product) return null;

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
                                        alt={product.name}
                                        width="540"
                                        height="540"
                                        decoding="async"
                                        className="border-light-white mx-auto rounded-md border md:mx-0"
                                        src={product.image}
                                        onError={(e) => {
                                            e.target.src = '/resources/images/product_placeholder.jpg';
                                        }}
                                        style={{ color: 'transparent' }}
                                    />
                                    <div
                                        id="lens"
                                        className="pointer-events-none absolute hidden rounded-md border border-gray-400 bg-gray-200/40"
                                        style={{ width: '256.828px', height: '256.828px', zIndex: 10, display: 'none', left: '256.828px', top: '237.414px' }}
                                    ></div>
                                </div>
                            </div>

                            <div className="relative col-span-full md:col-span-6 lg:col-span-7">
                                <div
                                    id="result"
                                    className="border-light-white top-0 left-0 z-20 hidden border bg-no-repeat md:absolute 2xl:top-1/2 2xl:-translate-y-1/2"
                                    style={{
                                        display: 'none',
                                        width: '513.656px',
                                        height: '513.656px',
                                        backgroundImage: `url("${product.image}")`,
                                        backgroundSize: '1000px 1000px',
                                        backgroundPosition: '-500px -462.204px',
                                        borderRadius: '6px',
                                        left: '-1.7vw'
                                    }}
                                ></div>

                                <div>
                                    <h1 className="text-dark text-lg leading-[21px] font-medium md:text-xl md:leading-6 xl:text-[26px] xl:leading-[30px]">
                                        {product.name}
                                    </h1>
                                    <h2 className="text-primary animate-text-blink mt-2 font-semibold uppercase md:text-base">
                                        Available online only
                                    </h2>
                                    <div className="flex justify-between">
                                        <ul className="text-gray flex items-center gap-2 lg:gap-3">
                                            <li>
                                                <p className="text-base">
                                                    <span className="">Brand : </span>
                                                    <span className="font-semibold text-primary">Yi Moon</span>
                                                </p>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Social Media Sharing Section */}
                                <div className="mt-1">
                                    <ul className="flex gap-4">
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

                                <div className="pt-2.5 3xl:py-[13px] border-t border-light-ash mt-2.5 sm:flex items-center lg:items-start justify-between">
                                    <ul className="border-l-[6px] border-success px-2.5 flex items-center gap-4">
                                        <li>
                                            <p className="flex items-center font-semibold text-dark text-3xl xl:text-4xl">
                                                <span className="mr-1 text-3xl">৳</span> {product.discountedPrice}
                                            </p>
                                        </li>
                                        {product.discount > 0 && (
                                            <>
                                                <li>
                                                    <p className="my-auto relative font-semibold flex items-center text-xl xl:text-2xl text-light-ash block">
                                                        <span className="mr-0.5 text-xl xl:text-2xl">৳</span>{product.originalPrice}
                                                        <span className="absolute inset-0 w-full h-[2px] bg-red-500 transform rotate-[-5deg] top-1/2 -translate-y-1/2 left-[0.25px]"></span>
                                                    </p>
                                                </li>
                                                <li>
                                                    <p className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-lg py-0.5 sm:py-0.5">
                                                        <span className="font-medium text-[11px] sm:text-xs">Save</span>
                                                        <span className="text-xs font-medium">৳</span>
                                                        <span>{product.discount}</span>
                                                    </p>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>

                                <div className="3xl:space-y-2.5 my-2.5 space-y-1.5">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                        &nbsp;
                                    </div>

                                    <h2 className="sr-only">&nbsp;</h2>
                                    <p className="text-sm">
                                        &nbsp;
                                    </p>

                                    <div className="flex gap-4">
                                        <div className="cursor-pointer outline-0">
                                            <div className="border-dark-ash hover:border-primary group relative rounded-md border">
                                                <img
                                                    alt="product_variant"
                                                    loading="lazy"
                                                    width="70"
                                                    height="70"
                                                    decoding="async"
                                                    className="mx-auto rounded-md"
                                                    src={product.image}
                                                    onError={(e) => {
                                                        e.target.src = '/resources/images/product_placeholder.jpg';
                                                    }}
                                                    style={{ color: 'transparent' }}
                                                />
                                                <div className="group-hover:bg-primary absolute bottom-0 z-10 h-1 w-full rounded-b-md bg-primary"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm">
                                        &nbsp;
                                    </p>

                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                        &nbsp;
                                    </div>

                                    <div className="flex items-center gap-3 text-lg">
                                        <h2 className="font-medium">Quantity :</h2>
                                        <div className="border-primary text-primary flex h-[40px] w-[130px] items-center justify-around rounded border-2">
                                            <button
                                                type="button"
                                                aria-label="decrease quantity"
                                                disabled={quantity <= 1}
                                                onClick={() => handleQuantityChange('decrease')}
                                                className="disabled:text-light-ash p-3 font-semibold"
                                            >
                                                <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z"></path>
                                                </svg>
                                            </button>
                                            <p className="text-lg font-semibold">{quantity}</p>
                                            <button
                                                type="button"
                                                aria-label="increase quantity"
                                                onClick={() => handleQuantityChange('increase')}
                                                className="disabled:text-light-ash p-3 font-semibold"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-light-ash grid grid-cols-2 gap-4 py-2 text-base font-bold sm:text-lg lg:border-b">
                                    <button
                                        type="button"
                                        className="bg-dark-ash hover:bg-gray disabled:bg-dark-ash/40 rounded-md p-2 text-white lg:p-2.5"
                                        aria-label="Add to Cart"
                                        onClick={handleAddToCart}
                                    >
                                        ADD TO CART
                                    </button>
                                    <button
                                        type="button"
                                        className="bg-primary hover:bg-dark-primary disabled:bg-primary/40 rounded-md p-1.5 text-white uppercase lg:p-2.5"
                                        aria-label="Buy Now"
                                        onClick={handleBuyNow}
                                    >
                                        BUY NOW
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickView;