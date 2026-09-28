// app/(shop)/product/[productId]/[slug]/metadata.jsx
import { catalogApi } from '@/lib/api';
import { toProductView } from '@/lib/productView';
import { WEBSITE_URL } from '@/lib/config';
import { getProductRelativeUrl } from '@/utils/urlHelper';

const SITE_NAME = 'Yi Moon';
const DEFAULT_DESCRIPTION = 'Discover amazing products at Yi Moon - A Mini China Store in Bangladesh.';

/**
 * Per-product metadata: the title a shopper sees in search results, the
 * product price and stock for the shopping rich snippets, and a canonical URL.
 *
 * The price and availability are read from the same `toProductView` the page
 * uses, so a rich snippet can never advertise a price the page does not show.
 * `availability` is derived from the variant rather than hard-coded to "in
 * stock", which is what the previous version did — it told Google that even a
 * sold-out product was in stock.
 */
export async function generateMetadata({ params }) {
    const { productId, slug } = await params;

    try {
        const response = await catalogApi.getProduct(slug);
        const product = toProductView(response?.data ?? response);

        if (!product) return defaultMetadata(productId, slug);

        // The route carries an id and a slug; the canonical tag always points
        // at the product's own URL, which is what the page redirects a stale or
        // mismatched pair to. A crawler is then told to index one address and
        // not the several ways of reaching the same product.
        const canonical = `${WEBSITE_URL}${getProductRelativeUrl(product)}`;

        const title = `${product.name} | ${SITE_NAME}`;
        const description = (product.description || product.category?.name
            ? (product.description || `Buy ${product.name} from ${SITE_NAME}, a mini China store in Bangladesh with fast delivery nationwide.`)
            : DEFAULT_DESCRIPTION
        ).slice(0, 200);

        // The product's own image, so the card a shopper shares shows the
        // product. Falls back to the generated OG card when it has no photo —
        // which takes the slug, because that is how the product endpoint is
        // addressed, not by the id that happens to be in the route.
        const image = product.image && !product.image.endsWith('product_placeholder.jpg')
            ? product.image
            : `${WEBSITE_URL}/api/og?slug=${encodeURIComponent(product.slug)}`;

        const price = product.price;
        const availability = product.inStock ? 'in stock' : 'out of stock';

        return {
            title,
            description,
            keywords: [product.name, product.category?.name, 'Yi Moon', 'Bangladesh', 'online shopping']
                .filter(Boolean)
                .join(', '),

            alternates: {
                canonical,
            },

            openGraph: {
                title,
                description,
                url: canonical,
                siteName: SITE_NAME,
                locale: 'en_US',
                type: 'website',
                images: [{ url: image, alt: product.name }],
            },

            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [image],
            },

            other: {
                'product:price:amount': String(price),
                'product:price:currency': product.currency,
                'product:availability': availability,
                'product:condition': 'new',
                'product:retailer_item_id': String(product.id),
            },

            robots: {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    'max-video-preview': -1,
                    'max-image-preview': 'large',
                    'max-snippet': -1,
                },
            },
        };
    } catch (error) {
        // A product that cannot be read still needs a page title rather than a
        // rendering error, so the metadata falls back instead of throwing.
        console.error('Error generating product metadata:', error);
        return defaultMetadata(productId, slug);
    }
}

function defaultMetadata(productId, slug) {
    // The product could not be read, so the name is unknown. The card falls back
    // to the generic one, which needs no slug to render.
    const ogImageUrl = `${WEBSITE_URL}/api/og`;

    return {
        title: `Product | ${SITE_NAME}`,
        description: DEFAULT_DESCRIPTION,
        alternates: {
            canonical: `${WEBSITE_URL}/product/${productId}/${slug ?? ''}`,
        },
        openGraph: {
            title: `Product | ${SITE_NAME}`,
            description: DEFAULT_DESCRIPTION,
            siteName: SITE_NAME,
            locale: 'en_US',
            type: 'website',
            images: [{ url: ogImageUrl, alt: `${SITE_NAME} Product` }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `Product | ${SITE_NAME}`,
            description: DEFAULT_DESCRIPTION,
            images: [ogImageUrl],
        },
    };
}
