// utils/gtm.ts
// GTM Utility Functions
// Since GTM is already initialized in HTML, we just need to push events

declare global {
    interface Window {
        dataLayer?: any[];
    }
}

interface ProductLike {
    id?: number | string;
    name?: string;
    discountedPrice?: number | string;
    originalPrice?: number | string;
    price?: number | string;
    category_name?: string;
    category?: string;
    qty?: number;
    [key: string]: any;
}

interface CartItemLike {
    id?: number | string;
    name?: string;
    price: number | string;
    qty: number;
    category?: string;
    [key: string]: any;
}

interface OrderPurchaseData {
    transactionId?: string;
    grandTotal: number | string;
    shippingCost?: number | string;
    cartItems: CartItemLike[];
    [key: string]: any;
}

const getEffectivePrice = (product: ProductLike): number => {
    const discountedPrice = Number(product.discountedPrice || 0);
    const originalPrice = Number(product.originalPrice || product.price || 0);
    return discountedPrice > 0 && discountedPrice < originalPrice ? discountedPrice : originalPrice;
};

export const gtmPushToDataLayer = (data: Record<string, any>): void => {
    if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push(data);
    }
};

export const gtmTrackPageView = (pagePath: string, pageTitle?: string): void => {
    gtmPushToDataLayer({
        event: 'page_view',
        page_path: pagePath,
        page_title: pageTitle,
    });
};

export const gtmTrackViewItem = (product: ProductLike, listName = 'Product List'): void => {
    const effectivePrice = getEffectivePrice(product);

    gtmPushToDataLayer({
        event: 'view_item',
        ecommerce: {
            currency: 'BDT',
            value: effectivePrice,
            items: [{
                item_id: product.id?.toString(),
                item_name: product.name,
                item_category: product.category_name || 'Uncategorized',
                item_list_name: listName,
                price: effectivePrice,
                quantity: 1,
            }],
        },
    });
};

export const gtmTrackSelectItem = (product: ProductLike, listName = 'Product List'): void => {
    const effectivePrice = getEffectivePrice(product);

    gtmPushToDataLayer({
        event: 'select_item',
        item_list_name: listName,
        ecommerce: {
            currency: 'BDT',
            items: [{
                item_id: product.id?.toString(),
                item_name: product.name,
                item_category: product.category_name || 'Uncategorized',
                price: effectivePrice,
                quantity: 1,
            }],
        },
    });
};

export const gtmTrackAddToCart = (product: ProductLike, quantity = 1): void => {
    const effectivePrice = getEffectivePrice(product);

    gtmPushToDataLayer({
        event: 'add_to_cart',
        ecommerce: {
            currency: 'BDT',
            value: effectivePrice * quantity,
            items: [{
                item_id: product.id?.toString(),
                item_name: product.name,
                item_category: product.category_name || 'Uncategorized',
                price: effectivePrice,
                quantity: quantity,
            }],
        },
    });
};

export const gtmTrackRemoveFromCart = (cartItem: CartItemLike): void => {
    const price = typeof cartItem.price === 'string' ? parseFloat(cartItem.price) : cartItem.price;

    gtmPushToDataLayer({
        event: 'remove_from_cart',
        ecommerce: {
            currency: 'BDT',
            value: (price || 0) * cartItem.qty,
            items: [{
                item_id: cartItem.id?.toString(),
                item_name: cartItem.name,
                item_category: cartItem.category || 'Uncategorized',
                price: price || 0,
                quantity: cartItem.qty,
            }],
        },
    });
};

export const gtmTrackViewCart = (cartItems: CartItemLike[]): void => {
    const totalValue = cartItems.reduce((sum, item) => {
        const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        return sum + ((price || 0) * item.qty);
    }, 0);

    gtmPushToDataLayer({
        event: 'view_cart',
        ecommerce: {
            currency: 'BDT',
            value: totalValue,
            items: cartItems.map((item) => ({
                item_id: item.id?.toString(),
                item_name: item.name,
                item_category: item.category || 'Uncategorized',
                price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                quantity: item.qty,
            })),
        },
    });
};

export const gtmTrackBeginCheckout = (cartItems: CartItemLike[]): void => {
    const totalValue = cartItems.reduce((sum, item) => {
        const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        return sum + ((price || 0) * item.qty);
    }, 0);

    gtmPushToDataLayer({
        event: 'begin_checkout',
        ecommerce: {
            currency: 'BDT',
            value: totalValue,
            items: cartItems.map((item) => ({
                item_id: item.id?.toString(),
                item_name: item.name,
                item_category: item.category || 'Uncategorized',
                price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                quantity: item.qty,
            })),
        },
    });
};

export const gtmTrackPurchase = (orderData: OrderPurchaseData): void => {
    gtmPushToDataLayer({
        event: 'purchase',
        ecommerce: {
            transaction_id: orderData.transactionId || `order_${Date.now()}`,
            value: typeof orderData.grandTotal === 'string' ? parseFloat(orderData.grandTotal) : orderData.grandTotal,
            currency: 'BDT',
            shipping: typeof orderData.shippingCost === 'string' ? parseFloat(orderData.shippingCost || '0') : (orderData.shippingCost || 0),
            items: orderData.cartItems.map((item) => ({
                item_id: item.id?.toString(),
                item_name: item.name,
                item_category: item.category || 'Uncategorized',
                price: typeof item.price === 'string' ? parseFloat(item.price as string) : item.price,
                quantity: item.qty,
            })),
        },
    });
};

export const gtmTrackSearch = (searchTerm: string, numberOfResults = 0): void => {
    gtmPushToDataLayer({
        event: 'search',
        search_term: searchTerm,
        number_of_results: numberOfResults,
    });
};

export const gtmTrackViewItemList = (categoryName: string, products: ProductLike[], currentPage = 1): void => {
    gtmPushToDataLayer({
        event: 'view_item_list',
        item_list_name: `Category: ${categoryName}`,
        item_list_id: categoryName?.toLowerCase().replace(/\s+/g, '_'),
        ecommerce: {
            currency: 'BDT',
            items: products.map((product, index) => ({
                item_id: product.id?.toString(),
                item_name: product.name,
                item_category: product.category_name || categoryName,
                price: getEffectivePrice(product),
                quantity: 1,
                index: (currentPage - 1) * 20 + index + 1,
            })),
        },
    });
};

export const gtmTrackShippingSelection = (shippingMethod: string, shippingCost: number | string): void => {
    gtmPushToDataLayer({
        event: 'shipping_selection',
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        currency: 'BDT',
    });
};

export const gtmTrackFormError = (formName: string, errorFields: any): void => {
    gtmPushToDataLayer({
        event: 'form_error',
        form_name: formName,
        error_fields: errorFields,
    });
};

export const gtmTrackPagination = (currentPage: number, totalPages: number, itemsPerPage: number): void => {
    gtmPushToDataLayer({
        event: 'pagination_click',
        page_number: currentPage,
        total_pages: totalPages,
        items_per_page: itemsPerPage,
    });
};

export const gtmTrackCustomEvent = (eventName: string, parameters: Record<string, any> = {}): void => {
    gtmPushToDataLayer({
        event: eventName,
        ...parameters,
    });
};
