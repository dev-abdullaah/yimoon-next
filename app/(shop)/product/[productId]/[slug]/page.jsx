// app/(shop)/product/[productId]/[slug]/page.jsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname, useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useFloatingCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';
import { generateSlug, getProductUrl } from '@/utils/urlHelper';
import useQuickView from '@/hooks/useQuickView';
import QuickView from '@/components/QuickView';
import QuickViewIcon from '@/components/Icons/QuickViewIcon';
import RightArrowLgIcon from '@/components/Icons/RightArrowLgIcon';
import FacebookIcon from '@/components/Icons/FacebookIcon';
import XIcon from '@/components/Icons/XIcon';
import WhatsappIcon from '@/components/Icons/WhatsappIcon';
import TelegramIcon from '@/components/Icons/TelegramIcon';

const Product = () => {
    // Use auth context to get user state
    const { isAuthenticated } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToCart, decreaseQty, increaseQty, cartItems } = useFloatingCart();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedColor, setSelectedColor] = useState(0);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [copied, setCopied] = useState(false);
    const hasRedirected = useRef(false);
    const [showDebug, setShowDebug] = useState(false);

    const {
        selectedProduct,
        showQuickView,
        handleQuickViewOpen,
        handleQuickViewClose
    } = useQuickView();

    // Extract productId and slug from useParams
    const params = useParams();
    const { productId, slug } = params;

    const handleDebug = () => {
        setShowDebug(!showDebug);
        if (!showDebug) {
            window.open(`/api/debug?id=${productId}`, '_blank');
        }
    };

    // Memoized fetch function for better performance
    const fetchProductData = useCallback(async () => {
        // Use central token service to get or fetch token
        const token = await getOrFetchToken();
        if (!token) throw new Error("Authentication token not found");

        const timestamp = Math.floor(Date.now() / 1000);
        const formData = new FormData();
        formData.append('timestamp', timestamp.toString());
        formData.append('token', token);
        formData.append('com', 'Appstore');
        formData.append('action', 'searchItem');
        formData.append('fields', 'i.featured,p.features,i.category as category_id,c.title as category_name,p.shortdesc,i.setup,i.image,i.moreimages');
        formData.append('storeid', '1');
        formData.append('condition', `i.id=${productId}`);

        const response = await fetch(`${BASE_URL}/exchange`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }, [productId]);

    // Fetch product data with React Query
    const { data: apiProductData, isLoading: productLoading, error: productError } = useQuery({
        queryKey: ['product', productId],
        queryFn: fetchProductData,
        enabled: true,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 2,
        refetchOnWindowFocus: false
    });

    // Process and set product data
    useEffect(() => {
        window.scrollTo(0, 0);

        if (apiProductData?.data?.[0]) {
            const apiProduct = apiProductData.data[0];
            const setup = apiProduct.setup ? JSON.parse(apiProduct.setup) : {};
            const discount = setup.discount || 0;
            const evPoint = setup.evpoint || 0;
            const originalPrice = parseFloat(apiProduct.unitsalesprice);
            const discountedPrice = originalPrice - parseFloat(discount);

            setProduct({
                id: apiProduct.itemid,
                name: apiProduct.name,
                originalPrice,
                discountedPrice,
                discount,
                evPoint,
                colors: apiProduct.colors || [{ name: "Default", code: "rgb(200, 200, 200)" }],
                image: apiProduct.image ? `${IMAGE_BASE_URL}/${apiProduct.image}` : '/resources/images/product_placeholder.jpg',
                description: apiProduct.shortdesc,
                categoryId: apiProduct.category_id,
                categoryName: apiProduct.categoryName,
                stock: apiProduct.stock || 'Available',
            });
        }
    }, [apiProductData]);

    // Redirect to URL with product name slug if needed
    useEffect(() => {
        if (product && !hasRedirected.current) {
            const slug = generateSlug(product.name);
            const currentPath = pathname;
            const expectedPath = `/product/${product.id}/${slug}`;

            if (currentPath !== expectedPath) {
                router.replace(expectedPath);
                hasRedirected.current = true;
            }
        }
    }, [product, pathname, router]);

    // Fetch Related Products data - NOW BASED ON CATEGORY ID
    const { data: relatedProductsData, isLoading: relatedLoading, isError: relatedError } = useQuery({
        queryKey: ['relatedProducts', product?.categoryId, productId],
        queryFn: async () => {
            if (!product?.categoryId) return { data: [] };

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

            // Update the condition to use the correct field name
            const condition = `i.category=${product.categoryId} AND i.id != ${productId}`;
            formData.append('condition', condition);

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const responseData = await response.json();
            return responseData;
        },
        enabled: !!product?.categoryId,
        staleTime: 1000 * 60 * 5,
        cacheTime: 1000 * 60 * 5,
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    // Transform API data to match our component's expected format
    const transformProductData = (apiData) => {
        if (!apiData?.data) return [];

        const transformedData = apiData.data.map(item => {
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

        return transformedData;
    };

    const products = relatedProductsData ? transformProductData(relatedProductsData) : [];

    // Filter out the current product from related products as a safety measure
    const filteredProducts = product
        ? products.filter(p => p.id !== product.id)
        : products;

    // Get quantity for a specific product in cart
    const getProductQuantity = (productId) => {
        const cartItem = cartItems.find(item => item.id === productId);
        return cartItem ? cartItem.qty : 0;
    };

    // Handle quantity changes
    const handleQuantityChange = (action) => {
        setQuantity(prev => {
            if (action === 'increase') return prev + 1;
            if (action === 'decrease' && prev > 1) return prev - 1;
            return prev;
        });
    };

    // Optimized add to cart function
    const handleAddToCart = useCallback(async () => {
        if (!product) return;

        setIsAddingToCart(true);
        try {
            const cartProduct = {
                id: product.id,
                name: product.name,
                discountedPrice: product.discountedPrice,
                originalPrice: product.originalPrice,
                discount: product.discount,
                evPoint: product.evPoint,
                photo: product.image?.split('/').pop() || 'product_placeholder.jpg',
                category_name: product.categoryName || 'Uncategorized',
                color: product.colors[selectedColor]?.name || '',
                quantity
            };

            await addToCart(cartProduct, quantity);
        } catch (err) {
            console.error('Failed to add to cart:', err);
            toast.error('Failed to add to cart');
        } finally {
            setIsAddingToCart(false);
        }
    }, [product, quantity, selectedColor, addToCart]);

    // Optimized buy now function
    const handleBuyNow = useCallback(async () => {
        if (!product) return;

        setIsAddingToCart(true);
        try {
            const cartProduct = {
                id: product.id,
                name: product.name,
                discountedPrice: product.discountedPrice,
                originalPrice: product.originalPrice,
                discount: product.discount,
                evPoint: product.evPoint,
                photo: product.image?.split('/').pop() || 'product_placeholder.jpg',
                category_name: product.categoryName || 'Uncategorized',
                color: product.colors[selectedColor]?.name || '',
                quantity
            };

            await addToCart(cartProduct, quantity);
            router.push('/checkout');
        } catch (err) {
            console.error('Failed to proceed to checkout:', err);
            toast.error('Failed to proceed to checkout');
        } finally {
            setIsAddingToCart(false);
        }
    }, [product, quantity, selectedColor, addToCart, router]);

    // Handle add to cart for related products
    const handleRelatedAddToCart = (product) => {
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

    // Enhanced function to generate share URLs with more details
    const getShareUrl = (platform) => {
        if (!product) return '#';

        // Always use the production URL for sharing
        const productUrl = getProductUrl(product);
        const encodedUrl = encodeURIComponent(productUrl);

        switch (platform) {
            case 'facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            case 'twitter':
                const encodedName = encodeURIComponent(product.name);
                const encodedPrice = encodeURIComponent(`৳${product.discountedPrice}`);
                const encodedBrand = encodeURIComponent('Yi Moon');
                return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedName}%20-%20${encodedBrand}%20-%20${encodedPrice}&hashtags=YiMoon,Bangladesh,OnlineShopping`;
            case 'whatsapp':
                const waName = encodeURIComponent(product.name);
                const waPrice = encodeURIComponent(`৳${product.discountedPrice}`);
                const waDescription = encodeURIComponent(product.description ? product.description.substring(0, 100) + '...' : 'Check out this amazing product!');
                return `https://wa.me/?text=${waName}%20-%20${waPrice}%0A${waDescription}%0A${encodedUrl}`;
            case 'telegram':
                const tgName = encodeURIComponent(product.name);
                const tgPrice = encodeURIComponent(`৳${product.discountedPrice}`);
                const tgDescription = encodeURIComponent(product.description ? product.description.substring(0, 100) + '...' : 'Check out this amazing product!');
                return `https://t.me/share/url?url=${encodedUrl}&text=${tgName}%20-%20${tgPrice}%0A${tgDescription}`;
            default:
                return '#';
        }
    };

    // Function to copy product link to clipboard
    const handleCopyLink = async () => {
        if (!product) return;

        const productUrl = getProductUrl(product);

        try {
            await navigator.clipboard.writeText(productUrl);
            setCopied(true);
            toast.success('Product link copied to clipboard!');

            // Reset copied status after 2 seconds
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            toast.error('Failed to copy link');
        }
    };

    // Loading skeleton component for the main product section
    const ProductSkeleton = () => (
        <main className="container mx-auto px-5 md:px-7 lg:px-12">
            <section className="mb-4 grid grid-cols-4 gap-12 2xl:grid-cols-5">
                <div className="col-span-4 space-y-12">
                    <div className="text-dark border-light-ash relative grid grid-cols-12 gap-5 border-b pb-4 lg:gap-8 lg:border-none lg:pb-0 xl:gap-12">
                        <div className="col-span-full my-auto py-5 md:col-span-6 md:py-0 lg:col-span-5">
                            <div className="relative">
                                {/* Product image skeleton */}
                                <div className="bg-light-white animate-pulse rounded-md w-full aspect-square border border-light-white"></div>
                            </div>
                        </div>
                        <div className="relative col-span-full md:col-span-6 lg:col-span-7">
                            <div className="space-y-4">
                                <div className="bg-light-white animate-pulse h-8 w-3/4 rounded"></div>
                                <div className="bg-light-white animate-pulse h-6 w-1/2 rounded"></div>
                                <div className="bg-light-white animate-pulse h-4 w-1/3 rounded"></div>

                                <div className="pt-2.5 3xl:py-[13px] border-t border-light-ash mt-2.5 sm:flex items-center lg:items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-light-white animate-pulse h-10 w-24 rounded"></div>
                                        <div className="bg-light-white animate-pulse h-8 w-20 rounded"></div>
                                        <div className="bg-light-white animate-pulse h-6 w-16 rounded"></div>
                                    </div>
                                </div>

                                <div className="3xl:space-y-2.5 my-2.5 space-y-1.5">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                        <div className="bg-light-white animate-pulse h-4 w-1/4 rounded"></div>
                                        <div className="bg-light-white animate-pulse h-4 w-1/2 rounded"></div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="bg-light-white animate-pulse h-20 w-20 rounded-md"></div>
                                    </div>

                                    <div className="flex items-center gap-3 text-lg">
                                        <div className="bg-light-white animate-pulse h-6 w-24 rounded"></div>
                                        <div className="bg-light-white animate-pulse h-10 w-32 rounded-md"></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2">
                                    <div className="bg-light-white animate-pulse h-12 rounded-md"></div>
                                    <div className="bg-light-white animate-pulse h-12 rounded-md"></div>
                                </div>

                                <div className="mt-4">
                                    <div className="bg-light-white animate-pulse h-6 w-40 rounded mb-2"></div>
                                    <div className="flex gap-3.5">
                                        <div className="bg-light-white animate-pulse h-8 w-8 rounded-full"></div>
                                        <div className="bg-light-white animate-pulse h-8 w-8 rounded-full"></div>
                                        <div className="bg-light-white animate-pulse h-8 w-8 rounded-full"></div>
                                        <div className="bg-light-white animate-pulse h-8 w-8 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <section aria-labelledby="product-info-section">
                        <div className="scrollbar-hidden text-dark-ash border-light-white mb-5 inline-flex w-full space-x-2 overflow-x-auto border-b text-sm md:w-auto">
                            <div className="bg-light-white animate-pulse h-8 w-32 rounded"></div>
                        </div>
                        <div className="border-primary rounded-lg border-2 p-5 break-words">
                            <div className="space-y-3">
                                <div className="bg-light-white animate-pulse h-4 w-full rounded"></div>
                                <div className="bg-light-white animate-pulse h-4 w-full rounded"></div>
                                <div className="bg-light-white animate-pulse h-4 w-3/4 rounded"></div>
                            </div>
                        </div>
                    </section>
                </div>
                <div className="col-span-full grid grid-cols-2 gap-6 2xl:col-span-1">
                    <section className="text-gray bg-light-white 3xl:py-5 3xl:px-6 rounded-xl p-4 text-sm font-medium sm:block 2xl:col-span-2 2xl:min-h-[600px]">
                        <div className="space-y-6">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="bg-light-white animate-pulse h-8 w-8 rounded mr-3"></div>
                                    <div className="bg-light-white animate-pulse h-4 w-3/4 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );

    // Loading state for product
    if (productLoading) {
        return <ProductSkeleton />;
    }

    // Error state for product
    if (productError) {
        return (
            <div className="container mx-auto px-5 md:px-7 lg:px-12 py-10 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {productError.message}</span>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // No product found
    if (!product) {
        return (
            <div className="container mx-auto px-5 md:px-7 lg:px-12 py-10 text-center">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Notice!</strong>
                    <span className="block sm:inline"> Product not found.</span>
                    <Link
                        href="/"
                        className="mt-2 bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-4 rounded inline-block"
                    >
                        Continue Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12">
            <section className="mb-4 grid grid-cols-4 gap-12 2xl:grid-cols-5">
                <div className="col-span-4 space-y-12">
                    <div className="text-dark border-light-ash relative grid grid-cols-12 gap-5 border-b pb-4 lg:gap-8 lg:border-none lg:pb-0 xl:gap-12">
                        <div className="col-span-full my-auto py-5 md:col-span-6 md:py-0 lg:col-span-5">
                            <div className="relative">
                                <img
                                    alt={product.name}
                                    width="540"
                                    height="540"
                                    className="border-light-white mx-auto rounded-md border md:mx-0"
                                    src={product.image || '/resources/images/product_placeholder.jpg'}
                                    onError={(e) => {
                                        e.target.src = '/resources/images/product_placeholder.jpg';
                                    }}
                                />
                            </div>
                        </div>
                        <div className="relative col-span-full md:col-span-6 lg:col-span-7">
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
                                                    <span className="mr-0.5 text-xl xl:text-2xl">৳</span>
                                                    {product.originalPrice}
                                                    <span className="absolute inset-0 w-full h-[2px] bg-red-500 transform rotate-[-5deg] top-1/2 -translate-y-1/2 left-[0.25px]" />
                                                </p>
                                            </li>
                                            <li>
                                                <p className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold  flex items-center gap-1 rounded-lg py-0.5 sm:py-0.5">
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
                                    <p className="text-sm">
                                        &nbsp;
                                    </p>
                                    <hr className="hidden h-3 lg:block" />
                                    <div className="flex list-none items-center gap-2.5">
                                        <p className="text-sm">
                                            &nbsp;
                                        </p>
                                    </div>
                                </div>
                                <h2 className="sr-only">Color</h2>
                                <p className="text-sm">
                                    &nbsp;
                                </p>
                                <div className="flex gap-4">
                                    {product.colors?.map((color, index) => (
                                        <div key={index} className="cursor-pointer outline-0">
                                            <div className="border-dark-ash hover:border-primary group relative rounded-md border">
                                                <img
                                                    alt={`product_color_${color.name}`}
                                                    loading="lazy"
                                                    width="70"
                                                    height="70"
                                                    className="mx-auto rounded-md"
                                                    src={color.image || product.image || '/resources/images/product_placeholder.jpg'}
                                                />
                                                <div className="group-hover:bg-primary absolute bottom-0 z-10 h-1 w-full rounded-b-md bg-primary" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm">
                                    <span className="">In Stock : </span>
                                    <span className="font-semibold ">{product.stock || 'N/A'}</span>
                                </p>
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
                                            <svg width="11" height="4" viewBox="0 0 11 4" className="" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                                            </svg>
                                        </button>
                                        <p className="text-lg font-semibold">{quantity}</p>
                                        <button
                                            type="button"
                                            aria-label="increase quantity"
                                            onClick={() => handleQuantityChange('increase')}
                                            className="disabled:text-light-ash p-3 font-semibold"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 13 13" className="" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
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
                                    disabled={isAddingToCart}
                                >
                                    {isAddingToCart ? 'ADDING...' : 'ADD TO CART'}
                                </button>
                                <button
                                    type="button"
                                    className="bg-primary hover:bg-dark-primary disabled:bg-primary/40 rounded-md p-1.5 text-white uppercase lg:p-2.5"
                                    aria-label="Buy Now"
                                    onClick={handleBuyNow}
                                    disabled={isAddingToCart}
                                >
                                    {isAddingToCart ? 'PROCESSING...' : 'BUY NOW'}
                                </button>
                            </div>

                            <div className="sm:ms-auto mt-4">
                                <p className="text-primary font-semibold">Share On Social Media</p>
                                <ul className="mt-0.5 flex gap-3.5">
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Share on Facebook"
                                        href={getShareUrl('facebook')}
                                        onClick={(e) => {
                                            // Optional: Add tracking for share events
                                            if (typeof window !== 'undefined' && window.fbq) {
                                                window.fbq('track', 'Share', {
                                                    content_type: 'product',
                                                    content_ids: [product.id],
                                                });
                                            }
                                        }}
                                    >
                                        <FacebookIcon />
                                    </a>
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Share on X (Twitter)"
                                        href={getShareUrl('twitter')}
                                        onClick={(e) => {
                                            // Optional: Add tracking for share events
                                            if (typeof window !== 'undefined' && window.gtag) {
                                                window.gtag('event', 'share', {
                                                    method: 'Twitter',
                                                    content_type: 'product',
                                                    item_id: product.id,
                                                });
                                            }
                                        }}
                                    >
                                        <XIcon />
                                    </a>
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Share on WhatsApp"
                                        href={getShareUrl('whatsapp')}
                                        onClick={(e) => {
                                            // Optional: Add tracking for share events
                                            if (typeof window !== 'undefined' && window.gtag) {
                                                window.gtag('event', 'share', {
                                                    method: 'WhatsApp',
                                                    content_type: 'product',
                                                    item_id: product.id,
                                                });
                                            }
                                        }}
                                    >
                                        <WhatsappIcon />
                                    </a>
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Share on Telegram"
                                        href={getShareUrl('telegram')}
                                        onClick={(e) => {
                                            // Optional: Add tracking for share events
                                            if (typeof window !== 'undefined' && window.gtag) {
                                                window.gtag('event', 'share', {
                                                    method: 'Telegram',
                                                    content_type: 'product',
                                                    item_id: product.id,
                                                });
                                            }
                                        }}
                                    >
                                        <TelegramIcon />
                                    </a>

                                    {/* Copy link button */}
                                    <button
                                        onClick={handleCopyLink}
                                        aria-label={copied ? "Link copied!" : "Copy product link"}
                                        className="flex items-center justify-center"
                                    >
                                        {copied ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Debug button (only in development) */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <button
                                            onClick={handleDebug}
                                            aria-label="Debug OG tags"
                                            className="flex items-center justify-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                            </svg>
                                        </button>
                                    )}
                                </ul>
                            </div>

                        </div>
                    </div>

                    <section aria-labelledby="product-info-section">
                        <h2 id="product-info-section" className="sr-only">Product Information Tabs</h2>
                        <div
                            role="tablist"
                            aria-label="Product Information Tabs"
                            className="scrollbar-hidden text-dark-ash border-light-white mb-5 inline-flex w-full space-x-2 overflow-x-auto border-b text-sm md:w-auto"
                        >
                            <button
                                role="tab"
                                id="tab-description"
                                type="button"
                                aria-selected="true"
                                aria-controls="panel-description"
                                className="hover:text-dark-primary inline min-w-max cursor-pointer px-3 pb-2 font-bold border-b-2 transition-all duration-300 ease-in-out text-primary border-primary"
                            >
                                Description
                            </button>
                        </div>
                        <div
                            id="panel-description"
                            role="tabpanel"
                            aria-labelledby="tab-description"
                            className="border-primary rounded-lg border-2 p-5 break-words"
                        >
                            <div className="style_productDetails__V_YJA">
                                {product.description ? (
                                    <div dangerouslySetInnerHTML={{ __html: product.description }} />
                                ) : (
                                    <p>No description available for this product.</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
                <div className="col-span-full grid grid-cols-2 gap-6 2xl:col-span-1">
                    <section
                        aria-labelledby="service-features"
                        className="text-gray bg-light-white 3xl:py-5 3xl:px-6 hidden rounded-xl p-4 text-sm font-medium sm:block 2xl:col-span-2 2xl:min-h-[600px]"
                    >
                        <h2 id="service-features" className="sr-only">Why Shop with Us</h2>
                        <ul role="list" className="space-y-6">
                            <li className="flex items-center">
                                <img alt="shipping free" width="37" height="20" className="mr-3" src="/resources/media/shippingIcon.svg" />
                                <p>Less shipping cost inside <span className="font-bold"> Dhaka City</span></p>
                            </li>
                            <li className="flex items-center">
                                <img alt="delivery" width="24" height="34" className="mr-3" src="/resources/media/mapIcon.svg" />
                                <p>Home delivery all over Bangladesh</p>
                            </li>
                            <li className="flex items-center">
                                <img alt="payemnt method" width="25" height="20" className="mr-3" src="/resources/media/paymentIcon.svg" />
                                <p>Various payment methods</p>
                            </li>
                            <li className="flex items-center">
                                <img alt="return policy" width="29" height="27" className="mr-3" src="/resources/media/returnIcon.svg" />
                                <p><span className="font-bold">15 Days </span>replacement policy only for<span className="font-bold"> certain products</span></p>
                            </li>
                            <li className="flex items-center">
                                <img alt="warrenty policy" width="30" height="30" className="mr-3" src="/resources/media/warrantyIcon.svg" />
                                <p>1 Month Local Seller Warranty</p>
                            </li>
                            <li className="flex items-center">
                                <img alt="support center" width="26" height="30" className="mr-3" src="/resources/media/supportIcon.svg" />
                                <p>Dedicated Customer Support</p>
                            </li>
                            <li className="flex items-center">
                                <img alt="verified" width="32" height="32" className="mr-3" src="/resources/media/verifiedIcon.svg" />
                                <p>Verified and Trusted Sellers</p>
                            </li>
                        </ul>
                    </section>
                </div>

                {/* Related Products Section */}
                <div className="relative col-span-full">
                    {showQuickView && (
                        <QuickView
                            product={selectedProduct}
                            onClose={handleQuickViewClose}
                        />
                    )}

                    {relatedLoading ? (
                        <div className="sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-slate-100 text-dark">
                            <div className="flex items-center justify-between lg:px-14">
                                <div>
                                    <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                                        Related Products
                                    </h2>
                                </div>
                                <div className="text-primary hover:text-light-warning">
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
                    ) : relatedError || products.length === 0 ? (
                        <div className="sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-slate-100 text-dark">
                            <div className="flex items-center justify-between lg:px-14">
                                <div>
                                    <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                                        Related Products
                                    </h2>
                                </div>
                            </div>
                            <div className="py-2 lg:py-5 lg:px-14">
                                <p className="text-center py-8">No related products found.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="sm:rounded-default -mx-5 px-5 py-6 sm:mx-0 md:px-7 lg:py-8 2xl:px-11 bg-slate-100 text-dark">
                            <div className="flex items-center justify-between lg:px-14">
                                <div>
                                    <h2 className="font-semibold text-xl md:text-2xl xl:text-3xl 2xl:text-[32px] capitalize">
                                        Related Products
                                    </h2>
                                </div>
                                <Link
                                    className="text-dark hover:text-light-warning"
                                    href={`/catalog?categoryId=${product.categoryId}&categoryName=${encodeURIComponent(product.categoryName || '')}`}
                                >
                                    <h3 className="text-sm font-semibold md:text-base xl:text-xl flex items-center md:gap-1">
                                        See More<span className="sr-only">Related Products Collection</span>
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
                                                            onClick={() => handleRelatedAddToCart(product)}
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
                    )}
                </div>
            </section>
        </main>
    );
};

export default Product;