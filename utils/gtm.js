// GTM Utility Functions
// Since GTM is already initialized in HTML, we just need to push events

const getEffectivePrice = (product) => {
    const discountedPrice = Number(product.discountedPrice || 0);
    const originalPrice = Number(product.originalPrice || product.price || 0);
    return discountedPrice > 0 && discountedPrice < originalPrice ? discountedPrice : originalPrice;
};

export const gtmPushToDataLayer = (data) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push(data);
        // console.log('GTM Event pushed:', data);
    }
};

export const gtmTrackPageView = (pagePath, pageTitle) => {
    gtmPushToDataLayer({
        event: 'page_view',
        page_path: pagePath,
        page_title: pageTitle
    });
};

export const gtmTrackViewItem = (product, listName = 'Product List') => {
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
                quantity: 1
            }]
        }
    });
};

export const gtmTrackSelectItem = (product, listName = 'Product List') => {
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
                quantity: 1
            }]
        }
    });
};

export const gtmTrackAddToCart = (product, quantity = 1) => {
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
                quantity: quantity
            }]
        }
    });
};

export const gtmTrackRemoveFromCart = (cartItem) => {
    gtmPushToDataLayer({
        event: 'remove_from_cart',
        ecommerce: {
            currency: 'BDT',
            value: parseFloat(cartItem.price) * cartItem.qty,
            items: [{
                item_id: cartItem.id?.toString(),
                item_name: cartItem.name,
                item_category: cartItem.category || 'Uncategorized',
                price: parseFloat(cartItem.price),
                quantity: cartItem.qty
            }]
        }
    });
};

export const gtmTrackViewCart = (cartItems) => {
    const totalValue = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);

    gtmPushToDataLayer({
        event: 'view_cart',
        ecommerce: {
            currency: 'BDT',
            value: totalValue,
            items: cartItems.map(item => ({
                item_id: item.id?.toString(),
                item_name: item.name,
                item_category: item.category || 'Uncategorized',
                price: parseFloat(item.price),
                quantity: item.qty
            }))
        }
    });
};

export const gtmTrackBeginCheckout = (cartItems) => {
    const totalValue = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);

    gtmPushToDataLayer({
        event: 'begin_checkout',
        ecommerce: {
            currency: 'BDT',
            value: totalValue,
            items: cartItems.map(item => ({
                item_id: item.id?.toString(),
                item_name: item.name,
                item_category: item.category || 'Uncategorized',
                price: parseFloat(item.price),
                quantity: item.qty
            }))
        }
    });
};

export const gtmTrackPurchase = (orderData) => {
    gtmPushToDataLayer({
        event: 'purchase',
        ecommerce: {
            transaction_id: orderData.transactionId || `order_${Date.now()}`,
            value: parseFloat(orderData.grandTotal),
            currency: 'BDT',
            shipping: parseFloat(orderData.shippingCost || 0),
            items: orderData.cartItems.map(item => ({
                item_id: item.id?.toString(),
                item_name: item.name,
                item_category: item.category || 'Uncategorized',
                price: parseFloat(item.price),
                quantity: item.qty
            }))
        }
    });
};

export const gtmTrackSearch = (searchTerm, numberOfResults = 0) => {
    gtmPushToDataLayer({
        event: 'search',
        search_term: searchTerm,
        number_of_results: numberOfResults
    });
};

export const gtmTrackViewItemList = (categoryName, products, currentPage = 1) => {
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
                index: (currentPage - 1) * 20 + index + 1
            }))
        }
    });
};

export const gtmTrackShippingSelection = (shippingMethod, shippingCost) => {
    gtmPushToDataLayer({
        event: 'shipping_selection',
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        currency: 'BDT'
    });
};

export const gtmTrackFormError = (formName, errorFields) => {
    gtmPushToDataLayer({
        event: 'form_error',
        form_name: formName,
        error_fields: errorFields
    });
};

export const gtmTrackPagination = (currentPage, totalPages, itemsPerPage) => {
    gtmPushToDataLayer({
        event: 'pagination_click',
        page_number: currentPage,
        total_pages: totalPages,
        items_per_page: itemsPerPage
    });
};

export const gtmTrackCustomEvent = (eventName, parameters = {}) => {
    gtmPushToDataLayer({
        event: eventName,
        ...parameters
    });
};
