// utils/urlHelper.ts
import { WEBSITE_URL } from '@/lib/config';
import { Product, ProductView } from '@/types/product';
import { CartLine } from '@/types/cart';

// Helper function to generate URL-friendly slug from any name
export const generateSlug = (name?: string | null): string => {
    if (!name) return '';
    return name
        .trim()                   // Trim leading/trailing spaces first
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters (keep hyphens and spaces)
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');  // Remove any leading or trailing hyphens
};

export interface ProductUrlInput {
    id?: number | string | null;
    slug?: string | null;
    name?: string | null;
    [key: string]: any;
}

/**
 * The slug to put in a product URL.
 */
export const productSlug = (product?: ProductUrlInput | null): string =>
    product?.slug || generateSlug(product?.name);

/**
 * The path for a product, for an in-app `<Link href>`.
 */
export const getProductRelativeUrl = (product?: ProductUrlInput | null): string => {
    if (!product?.id) return '#';
    return `/product/${product.id}/${productSlug(product)}`;
};

/**
 * The absolute URL for a product, for social shares and canonical tags.
 */
export const getProductUrl = (product?: ProductUrlInput | null): string => {
    if (!product?.id) return WEBSITE_URL;
    return `${WEBSITE_URL}${getProductRelativeUrl(product)}`;
};

/**
 * The path for a category listing, for an in-app `<Link href>`.
 */
export const getCategoryRelativeUrl = (category?: { slug?: string | null; name?: string | null } | null): string => {
    if (!category?.slug) return '/catalog';
    return `/catalog?category=${encodeURIComponent(category.slug)}`;
};

/**
 * Normalise any banner destination URL.
 * Automatically translates `/category/:slug` paths into `/catalog?category=:slug`.
 */
export const normalizeBannerUrl = (url?: string | null): string => {
    if (!url || url === '#' || url === '/') return url || '/catalog';
    const categoryMatch = url.match(/^\/?category\/([a-zA-Z0-9_-]+)/);
    if (categoryMatch) {
        const slug = categoryMatch[1] === 'fragrances' ? 'fragrance' : categoryMatch[1];
        return `/catalog?category=${encodeURIComponent(slug)}`;
    }
    return url;
};

/**
 * The path for the product a cart line refers to.
 */
export const cartLinePath = (line?: (Partial<CartLine> & { productId?: number | string; productSlug?: string }) | null): string => {
    const prodId = line?.productId ?? line?.product_id;
    if (!prodId) return '/cart';
    const slug = line?.productSlug ?? line?.slug ?? '';
    return `/product/${prodId}/${slug}`;
};

/**
 * A catalogue link for a category identified only by id and name.
 */
export const getCatalogUrl = (categoryId?: number | string | null, categoryName?: string | null): string => {
    if (!categoryId) return '/catalog';
    return getCategoryRelativeUrl({ slug: generateSlug(categoryName) });
};

/**
 * A post-sign-in destination that is safe to navigate to.
 */
export const safeRedirect = (target?: string | null, fallback: string = '/'): string => {
    if (typeof target !== 'string' || !target.startsWith('/')) return fallback;
    if (target.startsWith('//') || target.startsWith('/\\')) return fallback;

    return target;
};
