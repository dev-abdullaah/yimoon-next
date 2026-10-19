// app/(shop)/featured/page.tsx
import { redirect } from 'next/navigation';

/**
 * The old "featured" listing, kept only as a doorway.
 *
 * It was a second copy of the product listing that differed in which products it
 * asked for, and it paginated and sorted a single page in the browser — so its
 * page 3 was three pages' worth of products sorted locally, and its "24 items
 * found" counted only what had been fetched. The catalogue page does all of
 * that on the server, so this redirects there rather than keeping a second
 * implementation to drift.
 *
 * The `featuredId` values are the old hand-maintained mapping from a link to a
 * named group. They are translated to the filter that now expresses the same
 * intent, so a link that predates this change still lands somewhere sensible
 * instead of on a page that ignores its own parameter.
 */

interface LegacyGroup {
    title: string;
    query: Record<string, string>;
}

const LEGACY_GROUPS: Record<string, LegacyGroup> = {
    // Discounted things: the listing can filter on this.
    '11': { title: 'Extra Discount', query: { on_sale: '1' } },
    '12': { title: 'Best Deals', query: { on_sale: '1' } },

    // Newest first is a listing sort, not a group.
    '13': { title: 'New Collection', query: { sort: 'newest' } },

    // There is no trending sort in the catalogue, so trending is now something
    // the recommendation endpoints answer. There is no listing equivalent, and
    // pointing at `?sort=trending` would quietly fall back to alphabetical —
    // presenting a ranked list as a name-sorted one.
    '14': { title: 'Trending Now', query: { sort: 'newest' } },

    // Likewise, "gadgets" was a category in the old feed with no counterpart
    // here; the closest honest destination is the whole listing.
    '15': { title: 'Gadgets & Tech', query: {} },
};

interface FeaturedRedirectProps {
    searchParams: Promise<{ featuredId?: string }>;
}

export default async function FeaturedRedirect({ searchParams }: FeaturedRedirectProps) {
    const params = await searchParams;
    const group = params?.featuredId ? LEGACY_GROUPS[params.featuredId] : undefined;

    const query = new URLSearchParams(group?.query ?? {}).toString();

    redirect(query ? `/catalog?${query}` : '/catalog');
}
