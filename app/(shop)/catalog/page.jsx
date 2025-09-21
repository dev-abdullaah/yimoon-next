// app/(shop)/catalog/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import QuickView from '@/components/QuickView';
import useQuickView from '@/hooks/useQuickView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';
import { useFloatingCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import QuickViewIcon from '@/components/Icons/QuickViewIcon';
import { generateSlug } from '@/utils/urlHelper';

const Catalog = () => {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const {
        selectedProduct,
        showQuickView,
        handleQuickViewOpen,
        handleQuickViewClose
    } = useQuickView();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Use auth context to get user state
    const { isAuthenticated } = useAuth();

    // Get category ID and name from URL parameters
    const categoryId = searchParams.get('categoryId');
    const categoryName = searchParams.get('categoryName') || 'All Products';

    const [sortBy, setSortBy] = useState('default');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const { addToCart, decreaseQty, increaseQty, cartItems } = useFloatingCart();

    // Invalidate queries when category changes
    useEffect(() => {
        if (categoryId) {
            queryClient.invalidateQueries(['catalog']);
        }
    }, [categoryId, queryClient]);

    // Fetch product data
    const { data: catalogData, isLoading, isError } = useQuery({
        queryKey: ['catalog', { categoryId, page: currentPage, sortBy }],
        queryFn: async () => {
            // Use central token service to get or fetch token
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            const formData = new FormData();
            formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
            formData.append('token', token);
            formData.append('com', 'Appstore');
            formData.append('action', 'searchItem');
            formData.append('limit', itemsPerPage.toString());
            formData.append('page', currentPage.toString());
            formData.append('fields', 'i.featured,p.features,i.category as category_id,c.title as category_name,p.shortdesc,i.setup,i.image,i.moreimages');
            formData.append('storeid', '1');
            formData.append('condition', `i.category=${categoryId}`);

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        keepPreviousData: true // Smooth pagination transitions
    });

    // Transform API data to product format
    const transformProductData = (apiData) => {
        if (!apiData?.data) return [];

        return apiData.data.map(item => {
            const setup = item.setup ? JSON.parse(item.setup) : {};
            const discount = setup.discount || 0;
            const evPoint = setup.evpoint || 0;
            const originalPrice = parseFloat(item.unitsalesprice);
            const discountedPrice = originalPrice - parseFloat(discount);

            return {
                id: item.itemid,
                name: item.name,
                originalPrice,
                discountedPrice,
                discount,
                evPoint,
                colors: [{ name: "Default", code: "rgb(200, 200, 200)" }],
                image: item.image ? `${IMAGE_BASE_URL}/${item.image}` : '/resources/images/product_placeholder.jpg',
                featured: item.featured,
                categoryId: item.category_id,
                categoryName: item.category_name,
                description: item.shortdesc,
                code: item.code || `#${item.itemid}`
            };
        });
    };

    // Sort products
    const sortProducts = (products, sortOption) => {
        switch (sortOption) {
            case 'latest': return [...products].sort((a, b) => b.id - a.id);
            case 'h-l': return [...products].sort((a, b) => b.discountedPrice - a.discountedPrice);
            case 'l-h': return [...products].sort((a, b) => a.discountedPrice - b.discountedPrice);
            case 'a-z': return [...products].sort((a, b) => a.name.localeCompare(b.name));
            case 'z-a': return [...products].sort((a, b) => b.name.localeCompare(a.name));
            default: return products;
        }
    };

    // Get and sort products
    const products = catalogData ? transformProductData(catalogData) : [];
    const sortedProducts = sortProducts(products, sortBy);

    // Pagination variables
    const totalItems = products.length; // If API doesn't provide total count
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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

    // Loading placeholder component
    const ProductPlaceholder = () => (
        <div className="group h-full overflow-clip rounded-md bg-white shadow-inner border-light-white border">
            {/* Image */}
            <div className="relative">
                <div className="w-full aspect-square mx-auto overflow-hidden flex items-center justify-center">
                    <div className="w-full h-full bg-gray-200 animate-pulse rounded-t-md"></div>
                </div>
            </div>

            {/* Product Info */}
            <div className="my-auto space-y-2 px-2 py-2.5 text-center">
                {/* Price row */}
                <ul className="flex w-full items-center justify-center text-center">
                    <li className="flex justify-center gap-2.5">
                        <div className="w-16 h-5 bg-gray-200 animate-pulse rounded"></div>
                        <div className="w-16 h-5 bg-gray-200 animate-pulse rounded"></div>
                    </li>
                </ul>

                {/* Color dots */}
                <ul className="flex justify-center gap-2 md:gap-3">
                    <li className="h-3 w-3 md:h-4 md:w-4 bg-gray-200 animate-pulse rounded"></li>
                </ul>

                {/* Product name */}
                <div className="h-5 w-3/4 mx-auto bg-gray-200 animate-pulse rounded"></div>
            </div>

            {/* Cart button / controls */}
            <div className="flex justify-center mb-3 px-2">
                <div className="w-[130px] h-[40px] bg-gray-200 animate-pulse rounded-md"></div>
            </div>
        </div>
    );

    // Loading state with proper placeholders
    if (isLoading || isError || sortedProducts.length === 0) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12">
                <section className="border-light-white min-h-[80vh] border-b pb-10">
                    <div className="mt-5 flex gap-8">
                        <div className="w-full flex-shrink">
                            <div className="border-light-white flex items-center justify-between border-y py-3">
                                <div>
                                    <h1 className="text-dark text-sm font-semibold capitalize sm:text-base lg:text-xl">
                                        {categoryName || 'Loading...'}
                                    </h1>
                                    <div className="h-4 w-20 bg-gray-200 animate-pulse mt-1"></div>
                                </div>
                                <div className="hidden lg:block h-10 w-48 bg-gray-200 animate-pulse rounded-md"></div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                                {[...Array(6)].map((_, i) => (
                                    <ProductPlaceholder key={`placeholder-${i}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12">
            {showQuickView && (
                <QuickView
                    product={selectedProduct}
                    onClose={handleQuickViewClose}
                />
            )}

            <section className="border-light-white min-h-[80vh] border-b pb-10">
                <div className="mt-5 flex gap-8">
                    <div className="w-full flex-shrink">
                        {/* Mobile Sort */}
                        <div className="mb-2 grid gap-4 lg:hidden">
                            <form className="flex items-center">
                                <label htmlFor="sortBy-mob" className="sr-only">Sort By</label>
                                <select
                                    id="sortBy-mob"
                                    name="sortBy"
                                    aria-label="Sort products by"
                                    className="w-full rounded-md border border-gray-400 px-2 py-2 text-sm outline-0"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="default">Sort By: Default</option>
                                    <option value="latest">Latest: Most Recent</option>
                                    <option value="h-l">Price: High to Low</option>
                                    <option value="l-h">Price: Low to High</option>
                                    <option value="a-z">Product: A-Z</option>
                                    <option value="z-a">Product: Z-A</option>
                                </select>
                            </form>
                        </div>

                        {/* Category Info */}
                        <div className="border-light-white flex items-center justify-between border-y py-3">
                            <div>
                                <h1 className="text-dark text-sm font-semibold capitalize sm:text-base lg:text-xl">
                                    {categoryName || 'All Products'}
                                </h1>
                                <p className="text-xs font-medium text-gray-600 sm:text-base">
                                    {totalItems} Items Found
                                </p>
                            </div>

                            {/* Desktop Sort */}
                            <form className="hidden items-center space-x-3 lg:flex">
                                <label htmlFor="sortBy-desk" className="text-dark-ash font-medium">Sort By:</label>
                                <select
                                    id="sortBy-desk"
                                    name="sortBy"
                                    aria-label="Sort products by"
                                    className="rounded-md border border-gray-400 px-2 py-2 text-sm outline-0 lg:w-48"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="default">Default</option>
                                    <option value="latest">Latest: Most Recent</option>
                                    <option value="h-l">Price: High to Low</option>
                                    <option value="l-h">Price: Low to High</option>
                                    <option value="a-z">Product: A-Z</option>
                                    <option value="z-a">Product: Z-A</option>
                                </select>
                            </form>
                        </div>

                        {/* Product Grid */}
                        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                            {sortedProducts.map((product) => {
                                const quantity = getProductQuantity(product.id);
                                return (
                                    <div key={product.id} className="group h-full overflow-clip rounded-md bg-white shadow-inner transition-all duration-300 ease-in-out hover:shadow-lg border-light-white hover:border-primary border">
                                        <div className="relative">
                                            <Link
                                                href={`/product/${product.id}/${generateSlug(product.name)}`}
                                            >
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
                                                {product.discount > 0 && (
                                                    <div className="absolute top-3 left-0 list-none text-start">
                                                        <p className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-e-md md:py-0.5">
                                                            <span className="font-medium text-[11px] sm:text-xs">Save</span>
                                                            <span className="text-xs font-medium">৳</span>
                                                            <span>{product.discount}</span>
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-10 block">
                                <div className="flex items-center justify-center gap-1">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className="pagination-button"
                                        aria-label="First page"
                                    >
                                        «
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="pagination-button"
                                        aria-label="Previous page"
                                    >
                                        ‹
                                    </button>

                                    {/* Show first page */}
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        className={`pagination-button ${currentPage === 1 ? 'bg-primary text-white' : ''}`}
                                    >
                                        1
                                    </button>

                                    {/* Show ellipsis if needed */}
                                    {currentPage > 3 && <span className="px-1">...</span>}

                                    {/* Show current page and neighbors */}
                                    {Array.from({ length: Math.min(3, totalPages - 2) }, (_, i) => {
                                        const page = Math.max(2, Math.min(currentPage - 1, totalPages - 3)) + i;
                                        if (page >= 2 && page <= totalPages - 1) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    className={`pagination-button ${currentPage === page ? 'bg-primary text-white' : ''}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        }
                                        return null;
                                    })}

                                    {/* Show ellipsis if needed */}
                                    {currentPage < totalPages - 2 && <span className="px-1">...</span>}

                                    {/* Show last page if different from first */}
                                    {totalPages > 1 && (
                                        <button
                                            onClick={() => handlePageChange(totalPages)}
                                            className={`pagination-button ${currentPage === totalPages ? 'bg-primary text-white' : ''}`}
                                        >
                                            {totalPages}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="pagination-button"
                                        aria-label="Next page"
                                    >
                                        ›
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="pagination-button"
                                        aria-label="Last page"
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Catalog;