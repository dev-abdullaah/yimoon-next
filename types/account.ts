// types/account.ts

export type DashboardSectionKey =
    | 'dashboard'
    | 'orders'
    | 'tracking'
    | 'profile'
    | 'addresses'
    | 'wishlist'
    | 'loyalty'
    | 'devices';

export interface District {
    id: number | string;
    name: string;
    bn_name?: string | null;
    code?: string | null;
    zone?: string | null;
    [key: string]: any;
}

export interface Address {
    id: number | string;
    label?: string;
    recipient_name: string;
    phone_number: string;
    line1: string;
    line2?: string | null;
    area?: string | null;
    city?: string | null;
    district_id?: number | string | null;
    postal_code?: string | null;
    is_default?: boolean;
    district?: District | null;
    zone?: string | null;
    [key: string]: any;
}

export interface AddressFormState {
    label: string;
    recipient_name: string;
    phone_number: string;
    line1: string;
    line2: string;
    area: string;
    city: string;
    postal_code: string;
    is_default: boolean;
}

export interface OrderItem {
    id: number | string;
    order_id?: number | string;
    product_id?: number | string;
    variant_id?: number | string;
    name: string;
    variant_name?: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    image?: string | null;
    product_slug?: string | null;
    product_exists?: boolean;
    [key: string]: any;
}

export interface OrderTimelineEvent {
    id: number | string;
    order_id?: number | string;
    from_status?: string | null;
    to_status?: string | null;
    description?: string | null;
    occurred_at?: string | null;
    [key: string]: any;
}

export interface OrderShipping {
    recipient_name?: string | null;
    phone_number?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    zone?: string | null;
    [key: string]: any;
}

export interface OrderPayment {
    method?: string | null;
    is_paid?: boolean;
    status?: string | null;
    transaction_id?: string | null;
    [key: string]: any;
}

export interface OrderTotals {
    subtotal?: number;
    discount?: number;
    shipping?: number;
    tax?: number;
    total: number;
    [key: string]: any;
}

export interface Order {
    id: number | string;
    order_number: string;
    order_number_short?: string;
    status: string;
    status_label?: string;
    placed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    totals?: OrderTotals;
    shipping?: OrderShipping;
    payment?: OrderPayment;
    items?: OrderItem[];
    item_count?: number;
    timeline?: OrderTimelineEvent[];
    allowed_transitions?: string[];
    [key: string]: any;
}

export interface SessionDevice {
    id: number | string;
    name: string;
    is_current?: boolean;
    last_active_at?: string | null;
    created_at?: string | null;
    [key: string]: any;
}

export interface LoyaltyBalance {
    loyalty_points?: number;
    points?: number;
    bdt_value?: number;
    monetary_value?: number;
    min_redemption_points?: number;
    can_redeem?: boolean;
    referral_link?: string;
    referral_code?: string;
    [key: string]: any;
}

export interface LoyaltyTransaction {
    id: number | string;
    points: number;
    type?: string;
    type_label?: string;
    description?: string | null;
    order_number?: string | null;
    balance_after?: number;
    created_at?: string | null;
    [key: string]: any;
}

export interface LoyaltyReferral {
    id: number | string;
    referred_name?: string;
    referred_email?: string | null;
    referred_user_name?: string;
    status?: string;
    reward_points?: number;
    completed_order?: string | null;
    created_at?: string | null;
    [key: string]: any;
}

export interface WishlistItem {
    id: number | string;
    product_id: number | string;
    variant_id: number | string;
    name: string;
    product_name?: string;
    slug?: string;
    sku?: string;
    price: number;
    compare_at_price?: number | null;
    image?: string | null;
    photo?: string | null;
    in_stock?: boolean;
    on_sale?: boolean;
    stock_quantity?: number;
    variant_name?: string;
    variant?: any;
    product?: any;
    [key: string]: any;
}
