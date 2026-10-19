// context/CartContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { cartApi, getProductImageUrl, formatCurrency, normalizeCartLine, getAuthToken, clearGuestCartToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CartState, CartLine, CartSummary, FloatingCartContextType } from '@/types/cart';

const CartContext = createContext<FloatingCartContextType | null>(null);

export const useFloatingCart = (): FloatingCartContextType => {
    const ctx = useContext(CartContext);
    if (!ctx) {
        throw new Error('useFloatingCart must be used within a CartProvider');
    }
    return ctx;
};

export function CartProviderComponent({ children }: { children: ReactNode }) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [cart, setCart] = useState<CartState | null>(null);
    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    /**
     * Load the cart and adopt any guest token the response issued.
     */
    const fetchCart = useCallback(async (): Promise<void> => {
        setLoading(true);

        try {
            const response = await cartApi.getCart();
            const cartData = response?.data ?? response;

            setCart(cartData ?? null);
            setIssues(cartData?.issues ?? []);
        } catch (error) {
            console.error('Failed to fetch cart:', error);
            setCart(null);
            setIssues([]);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Adopt the cart that is now this shopper's.
     */
    const refreshAfterAuthChange = useCallback(async (): Promise<void> => {
        await fetchCart();

        if (getAuthToken()) {
            clearGuestCartToken();
        }
    }, [fetchCart]);

    useEffect(() => {
        if (authLoading) return;

        refreshAfterAuthChange();
    }, [authLoading, isAuthenticated, refreshAfterAuthChange]);

    const items: CartLine[] = useMemo(
        () => (cart?.items ?? []).map(normalizeCartLine),
        [cart]
    );
    const summary: CartSummary | null = (cart?.summary as CartSummary) ?? null;

    /**
     * Add a variant to the cart.
     */
    const addToCart = useCallback(async (productOrVariantId: any, quantity: number = 1, customName: string | null = null): Promise<void> => {
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
                    (item: any) => (item.product_variant_id ?? item.variant_id ?? item.variant?.id) === variantId
                );
                if (addedLine) {
                    productName = addedLine.product?.name ?? addedLine.name ?? null;
                }
            }

            setCart(cartData ?? null);
            setIssues(cartData?.issues ?? []);

            const message = productName ? `"${productName}" added to cart` : 'Added to cart';
            toast.success(message);
        } catch (error: any) {
            console.error('Failed to add to cart:', error);
            toast.error(error.message || 'Failed to add to cart');
        } finally {
            setLoading(false);
        }
    }, []);

    const removeItemById = useCallback(async (itemId: number | string, productName: string | null = null): Promise<void> => {
        const targetItem = items.find((line) => line.id === itemId);
        const nameToRemove = productName || targetItem?.name || null;

        setLoading(true);

        try {
            await cartApi.removeItem(itemId);

            await fetchCart();
            const message = nameToRemove ? `"${nameToRemove}" removed from cart` : 'Removed from cart';
            toast.success(message);
        } catch (error: any) {
            console.error('Failed to remove item:', error);
            toast.error(error.message || 'Failed to remove item');
        } finally {
            setLoading(false);
        }
    }, [items, fetchCart]);

    /**
     * Set a line to an absolute quantity, clamped to what the API says is sellable.
     */
    const setItemQuantity = useCallback(async (itemId: number | string, quantity: number | string): Promise<void> => {
        const item = items.find((line) => line.id === itemId);

        if (!item) return;

        const wanted = Math.max(1, Math.floor(Number(quantity) || 1));

        if (wanted === item.quantity) return;

        const maxQty = item.maxQuantity ?? Infinity;
        const target = Math.min(wanted, maxQty);

        if (wanted > target) {
            toast.error(`Only ${target} left in stock.`);
        }

        setLoading(true);

        try {
            await cartApi.updateItem(itemId, target);
            await fetchCart();
        } catch (error: any) {
            console.error('Failed to update quantity:', error);
            toast.error(error.message || 'Failed to update quantity');
        } finally {
            setLoading(false);
        }
    }, [items, fetchCart]);

    const increaseQty = useCallback((itemId: number | string) => {
        const item = items.find((line) => line.id === itemId);
        if (!item) return;
        return setItemQuantity(itemId, item.quantity + 1);
    }, [items, setItemQuantity]);

    const decreaseQty = useCallback((itemId: number | string) => {
        const item = items.find((line) => line.id === itemId);
        if (!item) return;

        if (item.quantity <= 1) {
            return removeItemById(itemId, item.name);
        }

        return setItemQuantity(itemId, item.quantity - 1);
    }, [items, setItemQuantity, removeItemById]);

    const clearCart = useCallback(async (): Promise<void> => {
        setLoading(true);

        try {
            await cartApi.clearCart();
            setCart(null);
            setIssues([]);
        } catch (error: any) {
            console.error('Failed to clear cart:', error);
            toast.error(error.message || 'Failed to clear cart');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Drop the lines the API can no longer sell.
     */
    const pruneCart = useCallback(async (): Promise<void> => {
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
        } catch (error: any) {
            console.error('Failed to prune cart:', error);
            toast.error(error.message || 'Failed to remove unavailable items');
        } finally {
            setLoading(false);
        }
    }, [fetchCart]);

    const getImageUrl = useCallback((item: any): string => {
        return getProductImageUrl(item?.image);
    }, []);

    const getVariantAttributes = useCallback((item: any): Record<string, any> => {
        return item?.attributes ?? {};
    }, []);

    const value: FloatingCartContextType = {
        cart,
        cartItems: items,
        cartSummary: summary,
        loading,
        issues,
        checkoutReady: Boolean(cart?.checkout_ready),

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

function resolveVariantId(input: any): number | string | null {
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

    const buyable = variants.find((variant: any) =>
        variant.purchasable && (variant.is_active ?? variant.isActive ?? true)
    );

    return buyable?.id ?? variants[0]?.id ?? input.id ?? null;
}

CartProviderComponent.displayName = 'CartProvider';

export { CartProviderComponent as CartProvider };
