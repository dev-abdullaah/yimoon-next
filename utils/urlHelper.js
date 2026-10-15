// utils/urlHelper.js
import { WEBSITE_URL } from '@/lib/config';

// Helper function to generate URL-friendly slug from any name
export const generateSlug = (name) => {
    if (!name) return '';
    return name
        .trim()                   // Trim leading/trailing spaces first
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters (keep hyphens and spaces)
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');  // Remove any leading or trailing hyphens
};

/**
 * The slug to put in a product URL.
 *
 * The catalogue assigns each product its own slug and links to that, so the
 * slug is always taken from the API when it has one. Deriving it from the name
 * instead would produce a URL that looks right and 404s whenever the two ever
 * disagree — which they do as soon as a name is edited, a name collides with an
 * existing slug, or a product is imported with a slug of its own.
 */
export const productSlug = (product) => product?.slug || generateSlug(product?.name);

/**
 * The path for a product, for an in-app `<Link href>`.
 *
 * No trailing slash: the route is defined without one, so a trailing slash
 * costs a redirect on every click.
 */
export const getProductRelativeUrl = (product) => {
    if (!product?.id) return '#';
    return `/product/${product.id}/${productSlug(product)}`;
};

/**
 * The absolute URL for a product, for social shares and canonical tags where a
 * relative path is meaningless.
 */
export const getProductUrl = (product) => {
    if (!product?.id) return WEBSITE_URL;
    return `${WEBSITE_URL}${getProductRelativeUrl(product)}`;
};

/**
 * The path for a category listing, for an in-app `<Link href>`.
 *
 * The category goes in the query string rather than the path: the listing is one
 * page whose filters, sort and page are all URL state, so a category is just
 * another filter on it. `?category=` is also what the page itself reads, which is
 * what keeps a link, a back button and a shared URL all meaning the same thing.
 *
 * The API's own slug is used, for the same reason products use theirs — a slug
 * derived from the display name drifts the moment the name is edited.
 */
export const getCategoryRelativeUrl = (category) => {
    if (!category?.slug) return '/catalog';
    return `/catalog?category=${encodeURIComponent(category.slug)}`;
};

/**
 * Normalise any banner destination URL.
 * Automatically translates `/category/:slug` paths into `/catalog?category=:slug`.
 */
export const normalizeBannerUrl = (url) => {
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
 *
 * A cart line's `id` is the *cart item* id, not the product's, so it must not
 * be passed to `getProductRelativeUrl` — that would build a URL to a product
 * that happens to share a number with a cart row. This reads the product
 * fields the normalised line carries.
 */
export const cartLinePath = (line) => {
    if (!line?.productId) return '/cart';
    return `/product/${line.productId}/${line.productSlug ?? ''}`;
};

/**
 * A catalogue link for a category identified only by id and name.
 *
 * For callers holding a category the API did not shape — a search result, an
 * order line, a saved address — where the slug is not on hand. When the caller
 * *does* have a slug, `getCategoryRelativeUrl` should be used instead: this
 * derives one, which is only as good as the name it came from.
 */
export const getCatalogUrl = (categoryId, categoryName) => {
    if (!categoryId) return '/catalog';
    return getCategoryRelativeUrl({ slug: generateSlug(categoryName) });
};

/**
 * A post-sign-in destination that is safe to navigate to.
 *
 * The value comes from a query string, so it is attacker-controlled: anything
 * absolute or protocol-relative (`//evil.example`, `https://evil.example`) is
 * discarded in favour of the home page. Without that check, a link of the form
 * `/login?redirect=https://evil.example` would carry a shopper who had just
 * typed their password straight off the site while wearing a genuine-looking
 * signed-in session.
 *
 * A single leading slash is what makes a value a path on this origin.
 */
export const safeRedirect = (target, fallback = '/') => {
    if (typeof target !== 'string' || !target.startsWith('/')) return fallback;
    if (target.startsWith('//') || target.startsWith('/\\')) return fallback;

    return target;
};
