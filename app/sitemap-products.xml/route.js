// app/sitemap-products.xml/route.js
import { catalogApi } from '@/lib/api';
import { toProductView } from '@/lib/productView';
import { getProductRelativeUrl } from '@/utils/urlHelper';
import { WEBSITE_URL } from '@/lib/config';

/**
 * Every product, as its own sitemap.
 *
 * Kept separate from `app/sitemap.js` because a product catalogue is unbounded
 * and the static pages are not. Next's own sitemap is limited to 50,000 URLs
 * before it wants a `generateSitemaps` index, and mixing the two would spend
 * that budget on the handful of pages that were never the problem.
 *
 * The route is named with a `.xml` suffix in the folder name because that is
 * what puts the route at `/sitemap-products.xml` — which is the URL
 * `robots.txt` and `sitemap.js` already advertise. As `app/sitemap-products` it
 * answered at `/sitemap-products`, so both of those were pointing at a 404.
 *
 * Pagination is walked rather than fetched once: the products endpoint caps a
 * page at 60, so a single request would list a fortieth of the catalogue and
 * report success.
 */

/** The API's own maximum, so this asks for as much as it is willing to give. */
const PER_PAGE = 60;

/** Stop before this many, to stay under the 50,000-URL protocol limit. */
const MAX_URLS = 50_000;

/** A day, as the protocol spells it. */
const CHANGE_FREQUENCY = 'daily';

const xmlEscape = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

export async function GET() {
    try {
        const urls = [];
        let page = 1;

        // Bounded by MAX_URLS rather than by an unknown total: the loop stops when
        // a page comes back short, and a catalogue that grows past the protocol
        // limit is truncated rather than served as invalid XML.
        while (urls.length < MAX_URLS) {
            const response = await catalogApi.getProducts({ page, per_page: PER_PAGE });
            const products = (response?.data ?? [])
                .map(toProductView)
                .filter(Boolean);

            if (products.length === 0) break;

            for (const product of products) {
                urls.push({
                    loc: `${WEBSITE_URL}${getProductRelativeUrl(product)}`,
                    // The API's own timestamp, not the moment the sitemap was
                    // built. Rewriting every entry to "now" on every request
                    // tells crawlers the whole catalogue changed whenever the
                    // sitemap was regenerated, and they act on it.
                    lastmod: product.updatedAt ?? new Date().toISOString(),
                });
            }

            if (products.length < PER_PAGE) break;

            page += 1;
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
        ({ loc, lastmod }) => `    <url>
        <loc>${xmlEscape(loc)}</loc>
        <lastmod>${xmlEscape(lastmod)}</lastmod>
        <changefreq>${CHANGE_FREQUENCY}</changefreq>
        <priority>0.8</priority>
    </url>`
    )
    .join('\n')}
</urlset>`;

        return new Response(body, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                // Regenerated on demand but not on every hit: a crawler asking
                // twice in an hour should not cause two catalogue walks.
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
        });
    } catch (error) {
        // A sitemap that cannot be built is a 500, not an empty one. An empty
        // `<urlset>` reads to a crawler as "this site has no pages", which is a
        // far worse outcome than a temporary failure it will retry.
        console.error('Error generating product sitemap:', error);

        return new Response('Error generating sitemap', { status: 500 });
    }
}
