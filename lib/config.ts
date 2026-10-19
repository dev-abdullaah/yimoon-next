// lib/config.ts

/**
 * The handful of values that are needed outside the API layer.
 *
 * Everything else the storefront used to keep here — the API base URL, the image
 * host, the endpoint map, the storage keys, the pagination defaults — has moved
 * to where it is actually used. `lib/api.js` owns the transport and the guest
 * cart token, `utils/urlHelper.js` owns URL building.
 *
 * The two URLs that remain are the ones genuinely needed by more than one module,
 * and they are different things: `WEBSITE_URL` is this site's own address, used
 * for canonical tags, sitemaps and share links.
 */

/** This storefront's public address. Falls back to production domain. */
export const WEBSITE_URL: string = (
    process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://kingqueenbd.com'
).replace(/\/$/, '');

/** Google Sign-In client id. Unset means the button is not offered at all. */
export const GOOGLE_CLIENT_ID: string | undefined = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Facebook Pixel id.
 *
 * Server-side on purpose: it is not `NEXT_PUBLIC_`, so it is not inlined into the
 * page bundle for anyone to read.
 */
export const FACEBOOK_PIXEL_ID: string | undefined = process.env.FACEBOOK_PIXEL_ID;
