// app/robots.ts
import { MetadataRoute } from 'next';
import { WEBSITE_URL } from '@/lib/config';

/**
 * Crawler rules.
 *
 * `/api/` is disallowed alongside `/private/`. The OG image generator lives under
 * it and is expensive to produce — it renders an image and fetches a product —
 * so having a crawler discover it costs real work on every page of the site. It
 * stays reachable: a link in `og:image` is fetched by the platform, not by the
 * crawler reading this file, and blocking `/api/` outright would break nothing
 * here only because the fetch is server-side.
 *
 * The account, cart and checkout pages are disallowed too. They render
 * per-visitor and are behind a sign-in, so there is nothing in them for an index
 * to hold, and indexing a shopper's cart would be a small disclosure.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/private/', '/dashboard', '/cart', '/checkout', '/login', '/register'],
            },
        ],
        sitemap: [`${WEBSITE_URL}/sitemap.xml`, `${WEBSITE_URL}/sitemap-products.xml`],
    };
}
