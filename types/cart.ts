// types/cart.ts
import { ProductVariant } from './product';

export interface RawCartLine {
    id: number | string;
    product_variant_id?: number | string | null;
    variant_id?: number | string | null;
    quantity: number;
    unit_price?: number | string;
    line_total?: number | string;
    currency?: string;
    product?: {
        id: number | string;
        name: string;
        slug?: string;
    } | null;
    variant?: ProductVariant | null;
    image?: string | null;
    available?: boolean;
    max_quantity?: number;
    stock_quantity?: number | null;
    [key: string]: any;
}

export interface CartLine {
    id: number | string;
    variantId?: number | string | null;
    productId?: number | string | null;
    product_id?: number | string | null;
    productSlug?: string | null;

    name: string;
    slug?: string | null;
    image: string;
    photo?: string | null;

    variantName?: string | null;
    sku?: string | null;
    attributes: Record<string, any>;
    attributeLabel: string;

    unitPrice: number;
    price?: number;
    lineTotal: number;
    subtotal?: number;
    currency: string;

    quantity: number;
    maxQuantity: number;
    available: boolean;
    stockQuantity: number | null;

    variant?: ProductVariant | null;
    variant_title?: string;
    product_code?: string;
    [key: string]: any;
}

export type CartItem = CartLine;

export interface CartSummary {
    item_count: number;
    line_count: number;
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    savings: number;
    coupon_code: string | null;
    free_shipping_applied: boolean;
    shipping_zone: string | null;
    currency: string;
    [key: string]: any;
}

export interface CartTotals {
    subtotal: number;
    discount_total: number;
    shipping_total: number;
    tax_total: number;
    total: number;
    item_count: number;
    currency: string;
}

export interface CartState {
    id?: number | string | null;
    token?: string | null;
    items: (RawCartLine | CartLine)[];
    summary?: CartSummary | null;
    issues?: any[];
    checkout_ready?: boolean;
    totals?: CartTotals;
    loading?: boolean;
}

export interface FloatingCartContextType {
    cart: CartState | null;
    cartItems: CartLine[];
    cartSummary: CartSummary | null;
    loading: boolean;
    issues: any[];
    checkoutReady: boolean;
    itemCount: number;
    lineCount: number;
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    savings: number;
    couponCode: string | null;
    freeShippingApplied: boolean;
    shippingZone: string | null;
    currency: string;

    formatCurrency: (amount: number | string | null | undefined) => string;
    addToCart: (productOrVariantId: any, quantity?: number, customName?: string | null) => Promise<void>;
    removeItemById: (itemId: number | string, productName?: string | null) => Promise<void>;
    setItemQuantity: (itemId: number | string, quantity: number | string) => Promise<void>;
    increaseQty: (itemId: number | string) => Promise<void> | void;
    decreaseQty: (itemId: number | string) => Promise<void> | void;
    clearCart: () => Promise<void>;
    pruneCart: () => Promise<void>;
    fetchCart: () => Promise<void>;
    refreshAfterAuthChange: () => Promise<void>;
    getImageUrl: (item: any) => string;
    getVariantAttributes: (item: any) => Record<string, any>;
}
