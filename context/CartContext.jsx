"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { cartApi, getProductImageUrl, formatCurrency, normalizeCartLine, getAuthToken, clearGuestCartToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const CartContext = createContext();

export const useFloatingCart = () => {
    return useContext(CartContext);
};

function CartProviderComponent({ children }) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [cart, setCart] = useState(null);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);

    /**
     * Load the cart and adopt any guest token the response issued.
     *
     * The token has to be harvested on every call, not once at mount: the API
     * mints one when a cart is first created, and a shopper who has just
     * signed in has theirs rotated.
     */
    const fetchCart = useCallback(async () => {
        setLoading(true);

        try {
            const response = await cartApi.getCart();
            const cartData = response?.data ?? response;

            setCart(cartData ?? null);
            setIssues(cartData?.issues ?? []);
        } catch (error) {
            // A cart that cannot be read must not leave a stale one on screen:
            // the shopper would see items the API no longer agrees exist.
            console.error('Failed to fetch cart:', error);
            setCart(null);
            setIssues([]);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Adopt the cart that is now this shopper's.
     *
     * The API merges a guest's cart into their account when a request carries
     * both a bearer token and the guest token, and deletes the guest cart as it
     * does so. That is why the token is kept *through* the fetch and dropped
     * after: clearing it first would skip the merge, and a shopper who signed in
     * would arrive at their account to find the basket they had just filled
     * empty.
     *
     * Dropping it afterwards is not optional either. The merged guest cart is
     * gone, so the token now names a row that no longer exists and the API would
     * mint a fresh empty cart for it. `apiFetch` stores a replacement first if the
     * response issued one, so anything still here is stale.
     */
    const refreshAfterAuthChange = useCallback(async () => {
        await fetchCart();

        if (getAuthToken()) {
            clearGuestCartToken();
        }
    }, [fetchCart]);

    // Wait for the stored token to be checked before the first read. Fetching
    // while the session is still being restored would create a throwaway guest
    // cart for a shopper who is in fact signed in.
    useEffect(() => {
        if (authLoading) return;

        refreshAfterAuthChange();
    }, [authLoading, isAuthenticated, refreshAfterAuthChange]);

    const items = useMemo(
        () => (cart?.items ?? []).map(normalizeCartLine),
        [cart]
    );
    const summary = cart?.summary ?? null;

    /**
     * Add a variant to the cart.
     *
     * Takes either a variant id or a product-shaped object. A product page has
     * already chosen which variant the shopper picked, so passing the id
     * directly is the common case and avoids re-deriving it here.
     */
    const addToCart = useCallback(async (productOrVariantId, quantity = 1, customName = null) => {
        const variantId = resolveVariantId(productOrVariantId);

        if (!variantId) {
            toast.error('This product has no option that can be ordered.');
            return;
        }

        let productName = customName || (typeof productOrVariantId === 'object' ? (productOrVariantId.name || productOrVariantId.title) : null);

        setLoading(true);

        try {
            const response = await cartApi.addItem(variantId, quantity);
            const cartData = response?.data ?? response;

            if (!productName && cartData?.items) {
                const addedLine = cartData.items.find(
                    (item) => (item.product_variant_id ?? item.variant_id ?? item.variant?.id) === variantId
                );
                if (addedLine) {
                    productName = addedLine.product?.name ?? addedLine.name ?? null;
                }
            }

            setCart(cartData ?? null);
            setIssues(cartData?.issues ?? []);

            const message = productName ? `"${productName}" added to cart` : 'Added to cart';
            toast.success(message);
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error(error.message || 'Failed to add to cart');
        } finally {
            setLoading(false);
        }
    }, []);

    const removeItemById = useCallback(async (itemId, productName = null) => {
        const targetItem = items.find((line) => line.id === itemId);
        const nameToRemove = productName || targetItem?.name || null;

        setLoading(true);

        try {
            await cartApi.removeItem(itemId);

            await fetchCart();
            const message = nameToRemove ? `"${nameToRemove}" removed from cart` : 'Removed from cart';
            toast.success(message);
        } catch (error) {
            console.error('Failed to remove item:', error);
            toast.error(error.message || 'Failed to remove item');
        } finally {
            setLoading(false);
        }
    }, [items, fetchCart]);

    /**
     * Set a line to an absolute quantity, clamped to what the API says is
     * sellable. Going to zero removes the line rather than posting a zero.
     */
    const setItemQuantity = useCallback(async (itemId, quantity) => {
        const item = items.find((line) => line.id === itemId);

        if (!item) return;

        const wanted = Math.max(1, Math.floor(Number(quantity) || 1));

        if (wanted === item.quantity) return;

        // `maxQuantity` is Infinity when the API reported no ceiling, so the
        // clamp is a no-op in that case and the value goes through untouched.
        const target = Math.min(wanted, item.maxQuantity);

        if (wanted > target) {
            toast.error(`Only ${target} left in stock.`);
        }

        setLoading(true);

        try {
            await cartApi.updateItem(itemId, target);

            await fetchCart();
        } catch (error) {
            console.error('Failed to update quantity:', error);
            toast.error(error.message || 'Failed to update quantity');
        } finally {
            setLoading(false);
        }
    }, [items, fetchCart]);

    const increaseQty = useCallback((itemId) => {
        const item = items.find((line) => line.id === itemId);

        if (!item) return;

        return setItemQuantity(itemId, item.quantity + 1);
    }, [items, setItemQuantity]);

    const decreaseQty = useCallback((itemId) => {
        const item = items.find((line) => line.id === itemId);

        if (!item) return;

        // The API treats a zero quantity as a removal, but posting it is
        // ambiguous; deleting the line is what the shopper meant.
        if (item.quantity <= 1) {
            return removeItemById(itemId, item.name);
        }

        return setItemQuantity(itemId, item.quantity - 1);
    }, [items, setItemQuantity, removeItemById]);

    const clearCart = useCallback(async () => {
        setLoading(true);

        try {
            // The token was rotated by this call, not reused, so it is left to
            // `apiFetch` to pick up the replacement from the response header.
            // Holding the previous value would address a cart that no longer
            // exists.
            await cartApi.clearCart();

            setCart(null);
            setIssues([]);
        } catch (error) {
            console.error('Failed to clear cart:', error);
            toast.error(error.message || 'Failed to clear cart');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Drop the lines the API can no longer sell.
     *
     * A cart is a snapshot, and by the time a shopper returns, a product may
     * have been deleted, a variant deactivated, or stock exhausted. The API
     * reports those as `issues` rather than refusing the cart, so this is how
     * the shopper clears them before checkout.
     */
    const pruneCart = useCallback(async () => {
        setLoading(true);

        try {
            const response = await cartApi.pruneCart();

            const removed = response?.meta?.removed_lines ?? 0;

            await fetchCart();

            if (removed > 0) {
                toast.success(`Removed ${removed} unavailable item${removed === 1 ? '' : 's'}`);
            } else {
                toast.success('Everything in your cart is still available.');
            }
        } catch (error) {
            console.error('Failed to prune cart:', error);
            toast.error(error.message || 'Failed to remove unavailable items');
        } finally {
            setLoading(false);
        }
    }, [fetchCart]);

    /**
     * The image for a cart line.
     *
     * `normalizeCartLine` already resolved it to a loadable URL, so this only
     * needs to cover a line a caller built by hand.
     */
    const getImageUrl = useCallback((item) => {
        return getProductImageUrl(item?.image);
    }, []);

    const getVariantAttributes = useCallback((item) => {
        return item?.attributes ?? {};
    }, []);

    const value = {
        cart,
        cartItems: items,
        cartSummary: summary,
        loading,
        issues,
        checkoutReady: Boolean(cart?.checkout_ready),

        // Totals come from the API's own quote, never recomputed in the browser.
        // The cart is priced on the server with live stock, coupon and shipping
        // rules, and a client-side total would drift from what is charged.
        itemCount: summary?.item_count ?? 0,
        lineCount: summary?.line_count ?? 0,
        subtotal: summary?.subtotal ?? 0,
        discount: summary?.discount ?? 0,
        shipping: summary?.shipping ?? 0,
        tax: summary?.tax ?? 0,
        total: summary?.total ?? 0,
        savings: summary?.savings ?? 0,
        couponCode: summary?.coupon_code ?? null,
        freeShippingApplied: Boolean(summary?.free_shipping_applied),
        shippingZone: summary?.shipping_zone ?? null,
        currency: summary?.currency ?? 'BDT',

        formatCurrency,
        addToCart,
        removeItemById,
        setItemQuantity,
        increaseQty,
        decreaseQty,
        clearCart,
        pruneCart,
        fetchCart,
        refreshAfterAuthChange,
        getImageUrl,
        getVariantAttributes,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * The variant to order for a given argument.
 *
 * Prefers the product's own `default_variant_id`, then a variant the shopper
 * can actually buy. Falling back to the first variant — even an unpurchasable
 * one — would post an id the API rejects with a message the shopper cannot act
 * on, so an unusable result is reported as "no variant" instead.
 */
function resolveVariantId(input) {
    if (input === null || input === undefined) return null;

    if (typeof input === 'number' || typeof input === 'string') {
        return Number(input) || null;
    }

    if (input.default_variant_id || input.defaultVariantId) {
        return input.default_variant_id || input.defaultVariantId;
    }

    if (input.id && input.purchasable !== undefined && (input.price !== undefined || input.sku !== undefined)) {
        return input.id;
    }

    const variants = Array.isArray(input.variants) ? input.variants : [];

    const buyable = variants.find((variant) =>
        variant.purchasable && (variant.is_active ?? variant.isActive ?? true)
    );

    return buyable?.id ?? variants[0]?.id ?? input.id ?? null;
}

CartProviderComponent.displayName = 'CartProvider';

export { CartProviderComponent as CartProvider };
