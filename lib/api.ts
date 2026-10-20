// lib/api.ts - SnapKart API Service Layer

import { CartLine } from '@/types/cart';

// The browser talks to the API through Next's `/api/*` rewrite, so requests are
// same-origin: no preflight, and — the reason it matters — the guest cart token
// comes back in an `X-Cart-Token` response header, which a cross-origin fetch
// could not read at all. Server-side rendering and route handlers have no such
// rewrite, so they use the absolute URL.
const isProd = process.env.NODE_ENV === 'production';
const SERVER_API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (isProd ? 'https://handle.kingqueenbd.com/api/v1' : 'http://127.0.0.1:8000/api/v1');
const BROWSER_API_BASE_URL = '/api/v1';
// Product and category images are written to `public/img/` by the Laravel
// ImageUploadService and served straight off the app's origin — there is no
// `storage/` symlink in this project, so the usual `/storage/...` path 404s.
const IMAGE_BASE_URL = (
    process.env.NEXT_PUBLIC_API_IMAGE_BASE_URL ||
    (isProd ? 'https://handle.kingqueenbd.com' : 'http://127.0.0.1:8000')
)
    .replace(/\/storage\/?$/, '')
    .replace(/\/$/, '');
const IMAGE_PATH = '/img';
export const PLACEHOLDER_IMAGE = '/resources/images/no-image-available.png';

// The endpoints that address *a* cart rather than the catalogue. A request to
// one of these carries the guest cart token, and is the only place a token is
// ever issued, so the token is attached and harvested here rather than by each
// caller.
//
// Checkout and shipping are included because they price and consume the very
// same cart: a guest whose checkout did not send the token would be quoted for
// a brand-new empty basket.
const CART_SCOPED = /^\/(cart|checkout|shipping)\b/;

export interface ApiFetchOptions extends RequestInit {
    optionalAuth?: boolean;
}

export interface ApiError extends Error {
    status?: number;
    errors?: Record<string, string[]> | null;
}

// Token management
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
    authToken = token;
    if (typeof window !== 'undefined') {
        if (token) {
            localStorage.setItem('snapkart_token', token);
            document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
        } else {
            localStorage.removeItem('snapkart_token');
            document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
        }
    }
}

export function getAuthToken(): string | null {
    if (authToken) return authToken;
    if (typeof window !== 'undefined') {
        return localStorage.getItem('snapkart_token');
    }
    return null;
}

export function clearAuthToken(): void {
    authToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('snapkart_token');
        document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    }
}

// Guest cart token management.
//
// A guest cart is identified by a UUID bearer secret the API issues in the
// `X-Cart-Token` response header and deliberately never in the body. It is
// mirrored into a module variable as well as localStorage so that the several
// calls one interaction makes all agree on the same token without each
// re-reading storage.
//
// It lives here, next to `apiFetch`, rather than in the cart context because it
// is a property of the *request*, not of the React tree: checkout and shipping
// address the same cart and would otherwise have to be handed the token by hand
// and would eventually forget.
const CART_TOKEN_STORAGE_KEY = 'snapkart_cart_token';
let guestCartToken: string | null = null;

export function getGuestCartToken(): string | null {
    if (guestCartToken) return guestCartToken;

    if (typeof window !== 'undefined') {
        guestCartToken = window.localStorage.getItem(CART_TOKEN_STORAGE_KEY);
    }

    return guestCartToken;
}

export function setGuestCartToken(token: string | null): void {
    guestCartToken = token;

    if (typeof window === 'undefined') return;

    if (token) {
        window.localStorage.setItem(CART_TOKEN_STORAGE_KEY, token);
    } else {
        window.localStorage.removeItem(CART_TOKEN_STORAGE_KEY);
    }
}

export function clearGuestCartToken(): void {
    setGuestCartToken(null);
}

// Generic fetch wrapper with auth
async function apiFetch(endpoint: string, options: ApiFetchOptions = {}): Promise<any> {
    const { optionalAuth = false, ...fetchOptions } = options;
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Sent whenever one exists, authenticated or not. The API resolves the
    // account cart from the bearer token and then *merges* the guest cart named
    // by this header into it, so withholding the token while signed in is what
    // would lose a guest's basket at the moment of login.
    const customHeaders = fetchOptions.headers as Record<string, string> | undefined;
    if (CART_SCOPED.test(endpoint) && !customHeaders?.['X-Cart-Token']) {
        const cartToken = getGuestCartToken();

        if (cartToken) {
            headers['X-Cart-Token'] = cartToken;
        }
    }

    // Handle FormData (don't set Content-Type)
    if (fetchOptions.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    const base = typeof window === 'undefined' ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL;

    const response = await fetch(`${base}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    // A 401 normally means the stored token has expired, so the session is
    // dropped and the shopper sent to sign in again.
    //
    // `optionalAuth` is the exception, for endpoints that merely get *better*
    // with a session — personalised recommendations. A 401 there means "you
    // are not signed in", which is the expected case for a guest, so tearing
    // down the token and redirecting would log out a shopper who never had a
    // session and bounce them away from a page they can already read.
    if (response.status === 401 && !optionalAuth) {
        clearAuthToken();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            const currentPath = window.location.pathname + window.location.search;
            const redirectUrl = currentPath && currentPath !== '/'
                ? `/login?redirect=${encodeURIComponent(currentPath)}`
                : '/login';
            window.location.href = redirectUrl;
        }
        throw new Error('Authentication expired. Please log in again.');
    }

    // A response with no body (204, or a 200 that only carries headers) is not
    // a failure, and `response.json()` on it throws. Success is decided by the
    // status alone; callers that need a body read `data`.
    const data = response.status === 204 ? null : await response.json().catch(() => null);

    // Adopt a freshly issued guest token, whichever call happened to trigger it.
    // The API mints one when a cart is first created and rotates it on clear, so
    // a token has to be picked up from every response rather than once at start
    // up. Stored before the error branch below, because a request that *fails*
    // may still have created a cart on the way.
    const issuedCartToken = response.headers?.get?.('X-Cart-Token');

    if (issuedCartToken) {
        setGuestCartToken(issuedCartToken);
    }

    if (!response.ok) {
        const firstError = data?.errors && Object.values(data.errors)[0] as string[] | undefined;
        const message = firstError?.[0] || data?.message || `Request failed (${response.status})`;

        // Errors carry a status so a caller can tell a 404 "not found" from a
        // 422 "fix the form" without string-matching the message.
        const error = new Error(message) as ApiError;
        error.status = response.status;
        error.errors = data?.errors || null;

        throw error;
    }

    // Attaching the raw response lets a caller reach headers or status for the
    // rare case the parsed body does not carry them — the invoice PDF, which is
    // bytes rather than JSON.
    if (data && typeof data === 'object') {
        Object.defineProperty(data, 'response', { value: response, enumerable: false });
    }

    return data;
}

// ==================== AUTHENTICATION ====================
export const authApi = {
    register: (data: any) => apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    login: (credentials: any) => apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),

    logout: () => apiFetch('/auth/logout', { method: 'POST' }),

    logoutAll: () => apiFetch('/auth/logout-all', { method: 'POST' }),

    me: () => apiFetch('/auth/me', { optionalAuth: true }),

    sendVerificationEmail: () => apiFetch('/email/verification-notification', { method: 'POST' }),

    resendVerification: (login: string) => apiFetch('/email/resend', {
        method: 'POST',
        body: JSON.stringify({ login }),
        optionalAuth: true,
    }),

    /**
     * Complete a verification from the link in the inbox.
     *
     * `optionalAuth` because this is the one call made by somebody with no
     * session: they arrived from an email client on a machine that never signed
     * in. A 401 here is the API refusing the link, not an expired session, so
     * treating it as one would clear a token the shopper does not have and send
     * them to a login form instead of telling them the link had expired.
     */
    verifyEmail: (id: string | number, hash: string, signature: Record<string, string> = {}) => {
        const params = new URLSearchParams(signature).toString();

        return apiFetch(
            `/email/verify/${id}/${hash}${params ? `?${params}` : ''}`,
            { optionalAuth: true }
        );
    },

    forgotPassword: (data: any) => apiFetch('/password/forgot', {
        method: 'POST',
        body: JSON.stringify(typeof data === 'string' ? { email: data } : data),
    }),

    resetPassword: (data: any) => apiFetch('/password/reset', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    updateProfile: (data: any) => apiFetch('/account', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),

    updatePassword: (data: any) => apiFetch('/account/password', {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
};

// ==================== CATALOGUE ====================
export const catalogApi = {
    getProducts: (params: Record<string, any> = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        return apiFetch(`/products?${searchParams.toString()}`);
    },

    getProduct: (slug: string) => apiFetch(`/products/${slug}`),

    getCategories: () => apiFetch('/categories'),

    getCategoryProducts: (slug: string, params: Record<string, any> = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        return apiFetch(`/categories/${slug}/products?${searchParams.toString()}`);
    },

    getProductReviews: (productId: number | string, params: Record<string, any> = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        return apiFetch(`/products/${productId}/reviews?${searchParams.toString()}`);
    },
};

// ==================== HERO BANNERS ====================
export const heroApi = {
    get: () => apiFetch('/hero'),
};

// ==================== SEARCH ====================
export const searchApi = {
    search: (params: Record<string, any> = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        return apiFetch(`/search?${searchParams.toString()}`);
    },

    autocomplete: (query: string) => apiFetch(`/search/autocomplete?q=${encodeURIComponent(query)}`),

    facets: (params: Record<string, any> = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        return apiFetch(`/search/facets?${searchParams.toString()}`);
    },

    popular: () => apiFetch('/search/popular'),
};

// ==================== RECOMMENDATIONS ====================
export const recommendationApi = {
    related: (productId: number | string) => apiFetch(`/products/${productId}/related`),
    upsell: (productId: number | string) => apiFetch(`/products/${productId}/upsell`),
    crossSell: (productId: number | string) => apiFetch(`/products/${productId}/cross-sell`),
    forProduct: (productId: number | string) => apiFetch(`/products/${productId}/recommendations`),
    trending: () => apiFetch('/recommendations/trending'),
    newArrivals: () => apiFetch('/recommendations/new-arrivals'),
    bestSellers: () => apiFetch('/recommendations/best-sellers'),
    bestDeals: () => apiFetch('/recommendations/best-deals'),
    onSale: () => apiFetch('/recommendations/on-sale'),
    // Personalised from order history, so the API scopes it to a signed-in
    // shopper. `optionalAuth` because a guest hitting it is expected, not a
    // broken session — the caller falls back to a public list.
    forYou: () => apiFetch('/recommendations/for-you', { optionalAuth: true }),
};

// ==================== CART ====================

/**
 * The guest cart token a response issued, if it issued one.
 *
 * A guest cart is identified by a UUID bearer secret that the API returns
 * *only* in the `X-Cart-Token` response header — it is deliberately absent
 * from the body so a logged-in cart's identity is never exposed. The token is
 * minted on the first request that creates a cart and re-issued whenever a new
 * one is created.
 *
 * `apiFetch` already stores any token it sees, so this is for the rare caller
 * that needs to *react* to a rotation rather than merely keep it.
 */
export function readCartToken(payload: any): string | null {
    return payload?.response?.headers?.get('X-Cart-Token') || null;
}

/**
 * Turn an API cart line into the flat shape the UI renders from.
 *
 * The API nests product, variant and money separately so the client never has
 * to re-fetch a product to label a line. That is the right shape on the wire
 * and the wrong shape to read in a component, so it is flattened once here
 * rather than at each of the eight places a cart line is displayed.
 *
 * `id` stays the *cart item* id because that is what the quantity and removal
 * endpoints take — the product id would silently update the wrong line.
 */
export function normalizeCartLine(item: any): CartLine {
    const attributes = item.variant?.attributes ?? {};

    // Attribute values are what a shopper recognises ("Red / Large"). A
    // variant with no attributes is a default option and needs no label.
    const attributeLabel = Object.values(attributes)
        .map((value: any) => (value && typeof value === 'object' ? value.name ?? value.value : value))
        .filter((value: any) => value !== null && value !== undefined && value !== '')
        .join(' / ');

    return {
        id: item.id,
        variantId: item.product_variant_id,
        productId: item.product?.id ?? null,
        productSlug: item.product?.slug ?? null,

        name: item.product?.name ?? 'Unavailable product',
        slug: item.product?.slug ?? null,
        image: resolveImage(item.image),

        variantName: item.variant?.name ?? null,
        sku: item.variant?.sku ?? null,
        attributes,
        attributeLabel,

        unitPrice: Number(item.unit_price ?? 0),
        lineTotal: Number(item.line_total ?? 0),
        currency: item.currency ?? 'BDT',

        quantity: Number(item.quantity ?? 0),
        // A zero ceiling would read as "out of stock" and block the stepper,
        // so it is treated as "the API did not say", leaving the stepper on.
        maxQuantity: Number(item.max_quantity ?? 0) || Infinity,

        available: item.available !== false,
        stockQuantity: item.stock_quantity ?? null,
    };
}

// The cart, checkout and shipping endpoints. None of them take a token argument:
// `apiFetch` attaches the guest cart token to every cart-scoped call and adopts
// any replacement the response issues, so passing one by hand would only create
// a second place for it to be got wrong.
export const cartApi = {
    getCart: () => apiFetch('/cart'),

    addItem: (variantId: number | string, quantity: number) => apiFetch('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
            product_variant_id: variantId,
            variant_id: variantId,
            quantity,
        }),
    }),

    updateItem: (itemId: number | string, quantity: number) => apiFetch(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
    }),

    removeItem: (itemId: number | string) => apiFetch(`/cart/items/${itemId}`, {
        method: 'DELETE',
    }),

    clearCart: () => apiFetch('/cart', {
        method: 'DELETE',
    }),

    /**
     * Drops the lines the API can no longer sell — a deleted product, a
     * deactivated variant, stock that ran out — so a shopper is not told at
     * checkout about a cart they could not have avoided.
     */
    pruneCart: () => apiFetch('/cart/prune', {
        method: 'POST',
    }),
};

// ==================== CHECKOUT ====================
export const checkoutApi = {
    getPaymentMethods: () => apiFetch('/checkout/payment-methods'),

    preview: (data: any) => apiFetch('/checkout/preview', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    placeOrder: (data: any) => apiFetch('/checkout/place-order', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

// ==================== SHIPPING ====================
export const shippingApi = {
    getCouriers: () => apiFetch('/shipping/couriers'),

    getRates: (data: any) => apiFetch('/shipping/rates', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    preview: (data: any) => apiFetch('/shipping/preview', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    track: (data: any) => apiFetch('/shipping/track', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

// ==================== ADDRESSES ====================
export const addressApi = {
    getDivisions: () => apiFetch('/addresses/divisions'),
    getDistricts: (params: Record<string, any> = {}) => {
        const searchParams = new URLSearchParams(params);
        return apiFetch(`/addresses/districts?${searchParams.toString()}`);
    },
    getUpazilas: (districtId: number | string) => apiFetch(`/addresses/districts/${districtId}/upazilas`),
    getUnions: (upazilaId: number | string) => apiFetch(`/addresses/upazilas/${upazilaId}/unions`),
    search: (query: string) => apiFetch(`/addresses/search?q=${encodeURIComponent(query)}`),
};

// ==================== USER ACCOUNT ====================
export const accountApi = {
    getProfile: () => apiFetch('/account'),
    updateProfile: (data: any) => apiFetch('/account', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    updatePassword: (data: any) => apiFetch('/account/password', {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    getAddresses: () => apiFetch('/account/addresses'),
    addAddress: (data: any) => apiFetch('/account/addresses', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateAddress: (addressId: number | string, data: any) => apiFetch(`/account/addresses/${addressId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    deleteAddress: (addressId: number | string) => apiFetch(`/account/addresses/${addressId}`, {
        method: 'DELETE',
    }),
    getOrders: (params: Record<string, any> = {}) => {
        const searchParams = new URLSearchParams(params);
        return apiFetch(`/orders?${searchParams.toString()}`);
    },
    getOrder: (orderId: number | string) => apiFetch(`/orders/${orderId}`),
    cancelOrder: (orderId: number | string, reason: string) => apiFetch(`/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    }),
    getSessions: () => apiFetch('/account/sessions'),
    revokeSession: (sessionId: number | string) => apiFetch(`/account/sessions/${sessionId}`, { method: 'DELETE' }),
};

// ==================== WISHLIST ====================
export const wishlistApi = {
    getWishlist: () => apiFetch('/wishlist'),
    addToWishlist: (variantId: number | string) => apiFetch('/wishlist', {
        method: 'POST',
        body: JSON.stringify({ variant_id: variantId }),
    }),
    removeFromWishlist: (variantId: number | string) => apiFetch(`/wishlist/${variantId}`, { method: 'DELETE' }),
    clearWishlist: () => apiFetch('/wishlist', { method: 'DELETE' }),
    moveToCart: (variantId: number | string) => apiFetch('/wishlist/move-to-cart', {
        method: 'POST',
        body: JSON.stringify({ variant_id: variantId }),
    }),
    checkWishlist: (variantId: number | string) => apiFetch(`/wishlist/check/${variantId}`),
    getWishlistCount: () => apiFetch('/wishlist/count'),
};

// ==================== REVIEWS ====================
export const reviewApi = {
    getMyReviews: (productId: number | string) => apiFetch(`/products/${productId}/reviews/mine`),
    createReview: (productId: number | string, data: any) => apiFetch(`/products/${productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateReview: (reviewId: number | string, data: any) => apiFetch(`/reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    deleteReview: (reviewId: number | string) => apiFetch(`/reviews/${reviewId}`, { method: 'DELETE' }),
};

// ==================== RETURNS ====================
export const returnApi = {
    getReturns: () => apiFetch('/returns'),
    createReturn: (data: any) => apiFetch('/returns', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    trackReturn: (data: any) => apiFetch('/returns/track', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getReturn: (returnId: number | string) => apiFetch(`/returns/${returnId}`),
    cancelReturn: (returnId: number | string) => apiFetch(`/returns/${returnId}/cancel`, { method: 'POST' }),
};

// ==================== LOYALTY ====================
export const loyaltyApi = {
    getBalance: () => apiFetch('/loyalty/balance'),
    getHistory: () => apiFetch('/loyalty/history'),
    getReferrals: () => apiFetch('/loyalty/referrals'),
    getReferralStats: () => apiFetch('/loyalty/referral-stats'),
    redeem: (points: number) => apiFetch('/loyalty/redeem', {
        method: 'POST',
        body: JSON.stringify({ points }),
    }),
};

// ==================== INVOICES ====================
export const invoiceApi = {
    download: (orderId: number | string) => apiFetch(`/orders/${orderId}/invoice`),
    view: (orderId: number | string) => apiFetch(`/orders/${orderId}/invoice/view`),
    getData: (orderId: number | string) => apiFetch(`/orders/${orderId}/invoice/data`),

    /**
     * Fetch an invoice PDF and hand back an object URL for it.
     *
     * The invoice is behind authentication, so it cannot be a plain link: a
     * new tab would carry no `Authorization` header and be refused. It is also
     * a PDF, not JSON, so it cannot go through `apiFetch` — that would try to
     * parse the bytes and fail. It is fetched here as a blob instead.
     *
     * The caller owns the returned URL and must revoke it, since a blob URL
     * pins the whole PDF in memory for the life of the document.
     */
    async pdfUrl(orderId: number | string, { download = false }: { download?: boolean } = {}): Promise<string> {
        const base = typeof window === 'undefined' ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL;
        const token = getAuthToken();
        const path = download
            ? `/orders/${orderId}/invoice`
            : `/orders/${orderId}/invoice/view`;

        const response = await fetch(`${base}${path}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.status === 401) {
            clearAuthToken();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            throw new Error('Authentication expired. Please log in again.');
        }

        if (!response.ok) {
            throw new Error('That invoice could not be loaded.');
        }

        const blob = await response.blob();

        return URL.createObjectURL(blob);
    },
};

// ==================== GUEST ORDER TRACKING ====================
export const orderTrackingApi = {
    track: (data: any) => apiFetch('/orders/track', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

// ==================== HEALTH ====================
export const healthApi = {
    live: () => apiFetch('/health/live'),
    ready: () => apiFetch('/health/ready'),
    details: () => apiFetch('/health/details'),
    metrics: () => apiFetch('/health/metrics'),
};

// ==================== STOREFRONT CMS & CONFIG ====================
export const storefrontApi = {
    getConfig: () => apiFetch('/storefront'),
    getPages: () => apiFetch('/storefront/pages'),
    getPage: (slug: string) => apiFetch(`/storefront/pages/${slug}`),
};

// ==================== IMAGE HELPERS ====================

// Resolves a stored filename to a browser-loadable URL.
//
// Accepts the several shapes the API can hand back: a bare filename from
// `ProductResource.photo`, a full path from `ProductResource.gallery`, or an
// already-absolute URL. Anything unrecognised falls back to the placeholder
// rather than to `undefined`, so an `<img>` never renders a broken source.
function resolveImage(photo?: string | null): string {
    if (!photo) return PLACEHOLDER_IMAGE;
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    if (photo.startsWith('/storage/img/')) {
        return `${IMAGE_BASE_URL}/img/${photo.replace(/^\/storage\/img\//, '')}`;
    }
    if (photo.startsWith('/img/')) return `${IMAGE_BASE_URL}${photo}`;
    if (photo.startsWith('/')) return `${IMAGE_BASE_URL}${photo}`;

    return `${IMAGE_BASE_URL}${IMAGE_PATH}/${photo}`;
}

export function getProductImageUrl(photo?: string | null): string {
    return resolveImage(photo);
}

export function getCategoryImageUrl(image?: string | null): string {
    return resolveImage(image);
}

export function getBannerImageUrl(image?: string | null): string {
    if (!image) return PLACEHOLDER_IMAGE;
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    const clean = image.replace(/^\/+/, '');
    if (clean.startsWith('img/')) return `/${clean}`;
    return `/img/${clean}`;
}

export const formatCurrency = (value: number | string | null | undefined): string => {
    const number = Number(value);
    if (isNaN(number)) return "৳ 0";
    return "৳ " + number.toLocaleString("en-BD");
};
