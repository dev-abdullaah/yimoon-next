// app/sitemap.ts
import { MetadataRoute } from 'next';
import { WEBSITE_URL } from '@/lib/config';

/**
 * The static pages.
 *
 * Product URLs live in the sibling `/sitemap-products.xml`, which walks the
 * catalogue; see the note there for why the two are split.
 *
 * Only real, indexable pages are listed. `/featured` used to be here, but it is
 * now a redirect to the catalogue, and a redirect in a sitemap spends a crawler's
 * budget on a hop that leads nowhere it did not already know.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const pages = [
        { path: '/', priority: 1 },
        { path: '/catalog', priority: 0.9 },
    ];

    return pages.map(({ path, priority }) => ({
        url: `${WEBSITE_URL}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority,
    }));
}
