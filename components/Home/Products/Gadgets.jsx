// components/Home/Products/Gadgets.jsx
'use client';

import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import QuickView from '@/components/QuickView';
import QuickViewIcon from '@/components/Icons/QuickViewIcon';
import RightArrowLgIcon from '@/components/Icons/RightArrowLgIcon';
import useQuickView from '@/hooks/useQuickView';
import { useFloatingCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';
import { generateSlug } from '@/utils/urlHelper';

const Gadgets = () => {
    const {
        selectedProduct,
        showQuickView,
        handleQuickViewOpen,
        handleQuickViewClose
    } = useQuickView();

    // Use auth context to get user state
    const { isAuthenticated } = useAuth();
    const { addToCart, decreaseQty, increaseQty, cartItems } = useFloatingCart();

    // Fetch Gadgets & Tech Product data
    const { data: gadgetsData, isLoading, isError } = useQuery({
        queryKey: ['gadgets'],
        queryFn: async () => {
            // Use central token service to get or fetch token
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            const timestamp = Math.floor(Date.now() / 1000);
            const formData = new FormData();
            formData.append('timestamp', timestamp.toString());
            formData.append('token', token);
            formData.append('com', 'Appstore');
            formData.append('action', 'searchItem');
            formData.append('limit', '0,6');
            formData.append('fields', 'i.featured,p.features,i.category as category_id,c.title as category_name,p.shortdesc,i.setup,i.image,i.moreimages');
            formData.append('storeid', '1');
            formData.append('condition', "featured LIKE '15%'");

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return await response.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 5, // 5 minutes
        retry: 2, // Retry twice on failure
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    // Transform API data to match our component's expected format
    const transformProductData = (apiData) => {
        if (!apiData?.data) return [];

        return apiData.data.map(item => {
            // Parse the setup JSON if it exists
            const setup = item.setup ? JSON.parse(item.setup) : {};
            const discount = setup.discount || 0;
            const evPoint = setup.evpoint || 0;
            const originalPrice = parseFloat(item.unitsalesprice);
            const discountedPrice = originalPrice - parseFloat(discount);

            return {
                id: item.itemid,
                name: item.name,
                originalPrice: originalPrice,
                discountedPrice: discountedPrice,
                discount: discount,
                evPoint: evPoint,
                colors: [{ name: "Default", code: "rgb(200, 200, 200)" }],
                image: item.image ? `${IMAGE_BASE_URL}/${item.image}` : '/resources/images/product_placeholder.jpg',
                featured: item.featured,
                categoryId: item.category_id,
                categoryName: item.category_name,
                description: item.shortdesc
            };
        });
    };

    const products = gadgetsData ? transformProductData(gadgetsData) : [];

    // Get quantity for a specific product in cart
    const getProductQuantity = (productId) => {
        const cartItem = cartItems.find(item => item.id === productId);
        return cartItem ? cartItem.qty : 0;
    };

    // Handle add to cart
    const handleAddToCart = (product) => {
        const cartProduct = {
            id: product.id,
            name: product.name,
            discountedPrice: product.discountedPrice,
            originalPrice: product.originalPrice,
            discount: product.discount,
            evPoint: product.evPoint,
            photo: product.image ? product.image.split('/').pop() : '/resources/images/product_placeholder.jpg',
            category_name: product.categoryName || 'Uncategorized'
        };

        addToCart(cartProduct, 1);
    };

    if (isLoading) {
        return (
            <div className="relative">
                <div className="sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-dark text-white">
                    <div className="flex items-center justify-between lg:px-14">
                        <div>
                            <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                                Gadget & Tech
                            </h2>
                        </div>
                        <div className="text-white hover:text-light-warning">
                            <h3 className="text-sm font-semibold md:text-base xl:text-xl flex items-center md:gap-1">
                                See More
                            </h3>
                        </div>
                    </div>
                    <div className="py-2 lg:py-5 lg:px-14">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="rounded-default animate-pulse border border-slate-300 bg-white p-3">
                                    <div className="mb-3 aspect-[1/1] min-h-[140px] w-full rounded-md bg-slate-200"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-full rounded bg-slate-200"></div>
                                        <div className="h-4 w-3/4 rounded bg-slate-200"></div>
                                        <div className="h-5 w-1/2 rounded bg-slate-300"></div>
                                        <div className="h-4 w-full rounded bg-slate-300"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || products.length === 0) {
        return (
            <div className="relative">
                <div className="sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-dark text-white">
                    <div className="flex items-center justify-between lg:px-14">
                        <div>
                            <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                                Gadget & Tech
                            </h2>
                        </div>
                    </div>
                    <div className="py-2 lg:py-5 lg:px-14">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="rounded-default animate-pulse border border-slate-300 bg-white p-3">
                                    <div className="mb-3 aspect-[1/1] min-h-[140px] w-full rounded-md bg-slate-200"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-full rounded bg-slate-200"></div>
                                        <div className="h-4 w-3/4 rounded bg-slate-200"></div>
                                        <div className="h-5 w-1/2 rounded bg-slate-300"></div>
                                        <div className="h-4 w-full rounded bg-slate-300"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {showQuickView && (
                <QuickView
                    product={selectedProduct}
                    onClose={handleQuickViewClose}
                />
            )}
            <div className="sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-dark text-white">
                <div className="flex items-center justify-between lg:px-14">
                    <div>
                        <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                            Gadget & Tech
                        </h2>
                    </div>
                    <Link
                        className="text-white hover:text-light-warning"
                        href="/featured?featuredId=15"
                    >
                        <h3 className="text-sm font-semibold md:text-base xl:text-xl flex items-center md:gap-1">
                            See More<span className="sr-only">Gadget & Tech Products</span>
                            <RightArrowLgIcon />
                        </h3>
                    </Link>
                </div>
                <div className="py-4 lg:py-4 lg:px-14">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {products.map((product) => {
                            const quantity = getProductQuantity(product.id);

                            return (
                                <div
                                    key={product.id}
                                    className="group h-full overflow-clip rounded-md bg-white shadow-inner transition-all duration-300 ease-in-out hover:shadow-lg border-0"
                                >
                                    <div className="relative">
                                        <Link
                                            href={`/product/${product.id}/${generateSlug(product.name)}`}
                                        >
                                            <div className="relative">
                                                <div className="w-full aspect-square mx-auto overflow-hidden flex items-center justify-center">
                                                    <img
                                                        alt={product.name}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover rounded-t-md"
                                                        src={product.image}
                                                        onError={(e) => {
                                                            e.target.src = '/resources/images/product_placeholder.jpg';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {product.discount > 0 && (
                                                <div className="absolute top-3 left-0 list-none text-start">
                                                    <p className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-e-md md:py-0.5">
                                                        <span className="font-medium text-[11px] sm:text-xs">Save</span>
                                                        <span className="text-xs font-medium">৳</span>
                                                        <span>{product.discount}</span>
                                                        <svg height="12" viewBox="0 0 12 12" className="h-2.5 w-2.5 sm:w-3 sm:h-3 stroke-[#fff] fill-white stroke-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M3 0V6.6H4.8V12L9 4.8H6.6L9 0H3Z" fill="white"></path>
                                                        </svg>
                                                    </p>
                                                </div>
                                            )}
                                            {isAuthenticated && product.evPoint > 0 && (
                                                <div className="absolute top-3 right-0 list-none text-start">
                                                    <p className="bg-success text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-l-md md:py-0.5">
                                                        <span className="font-medium text-[11px] sm:text-xs">EV Point</span>
                                                        <span className="text-xs font-medium">৳</span>
                                                        <span>{product.evPoint}</span>
                                                        <svg height="12" viewBox="0 0 12 12" className="h-2.5 w-2.5 sm:w-3 sm:h-3 stroke-[#fff] fill-white stroke-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M3 0V6.6H4.8V12L9 4.8H6.6L9 0H3Z" fill="white"></path>
                                                        </svg>
                                                    </p>
                                                </div>
                                            )}
                                        </Link>
                                        <div className="bg-dark/50 absolute bottom-0 hidden w-full text-center transition-all duration-500 ease-in lg:group-hover:block">
                                            <button
                                                type="button"
                                                className="py-1"
                                                onClick={() => handleQuickViewOpen(product)}
                                            >
                                                <p className="bg-primary flex items-center justify-center rounded-full p-1 text-white">
                                                    <QuickViewIcon />
                                                </p>
                                            </button>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/product/${product.id}/${generateSlug(product.name)}`}
                                    >
                                        <div className="my-auto space-y-1 px-2 py-2.5 text-center">
                                            <ul className="flex w-full items-center justify-center text-center">
                                                <li className="flex justify-center gap-2.5">
                                                    <p className="flex items-center font-semibold text-dark text-base xl:text-[20px]">
                                                        <span className="mr-1 text-base">৳</span>
                                                        {product.discountedPrice}
                                                    </p>
                                                    {product.discount > 0 && (
                                                        <p className="my-auto relative font-semibold flex items-center text-sm sm:text-base text-light-ash block">
                                                            <span className="mr-0.5 text-sm sm:text-base">৳</span>
                                                            {product.originalPrice}
                                                            <span className="absolute inset-0 w-full h-[2px] bg-red-500 transform rotate-[-5deg] top-1/2 -translate-y-1/2 left-[0.25px]"></span>
                                                        </p>
                                                    )}
                                                </li>
                                            </ul>
                                            <ul className="flex justify-center gap-2 md:gap-3">
                                                {product.colors.map((color, index) => (
                                                    <li
                                                        key={index}
                                                        className="h-3 w-3 rounded md:h-4 md:w-4"
                                                        title={color.name}
                                                        style={{ background: color.code }}
                                                    ></li>
                                                ))}
                                            </ul>
                                            <p className="group-hover:text-primary truncate-2 h-7 w-full overflow-clip text-xs leading-4 font-medium text-[#333333] capitalize md:h-[35px] md:text-sm">
                                                {product.name}
                                            </p>
                                        </div>
                                    </Link>

                                    {/* Cart quantity controls */}
                                    <div className="flex justify-center mb-3 px-2">
                                        {quantity > 0 ? (
                                            <div className="border-primary text-primary flex h-[40px] w-[130px] items-center justify-between rounded border-2 px-2">
                                                <button
                                                    type="button"
                                                    aria-label="decrease quantity"
                                                    onClick={() => {
                                                        decreaseQty(product.id);
                                                        toast.success(`"${product.name}" removed from cart`);
                                                    }}
                                                    className="p-3 flex items-center justify-center"
                                                >
                                                    <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z"></path>
                                                    </svg>
                                                </button>
                                                <p className="text-lg font-semibold mx-2">{quantity}</p>
                                                <button
                                                    type="button"
                                                    aria-label="increase quantity"
                                                    onClick={() => {
                                                        increaseQty(product.id);
                                                        toast.success(`"${product.name}" added to cart`);
                                                    }}
                                                    className="p-3 flex items-center justify-center"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="bg-primary hover:bg-dark-primary text-white px-4 py-2 rounded-md font-semibold w-full max-w-[130px]"
                                                onClick={() => handleAddToCart(product)}
                                            >
                                                Add to Cart
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Gadgets;