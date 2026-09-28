// lib/outlets.js
/**
 * Where the shop's physical outlets are.
 *
 * This is the one part of the storefront that is not catalogue data, and it is
 * deliberately not pretending to be. The old build read it from an
 * "invprodstore" information set, which no longer exists, and the API has no
 * equivalent — a store directory is not a product, a category, or an order, and
 * modelling it as any of those would put branch addresses into tables that get
 * joined, indexed and exported for unrelated reasons.
 *
 * So it lives here, as content, in one place. When the shop outgrows editing a
 * file, this is the seam to replace: swap the export for a call to whatever
 * holds stores then, and nothing above it changes.
 *
 * `mapQuery` goes to a maps *search* rather than a place id. A place id breaks
 * the moment the map provider re-keys a business, and a search by name and
 * street still resolves — it is one extra tap, not a wrong pin.
 */
export const OUTLETS = [
    {
        id: 'dhanmondi',
        name: 'Yi Moon — Dhanmondi',
        address: 'Road 7, Dhanmondi, Dhaka 1209',
        opening: '10:00',
        closing: '22:00',
        days: 'Open every day',
        phones: ['+8801711000000'],
        mapQuery: 'Dhanmondi, Dhaka 1209',
        image: '/resources/images/yi-moon-shop.jpg',
    },
    {
        id: 'gulshan',
        name: 'Yi Moon — Gulshan',
        address: 'Gulshan Avenue, Gulshan 1, Dhaka 1212',
        opening: '10:00',
        closing: '22:00',
        days: 'Open every day',
        phones: ['+8801711000001'],
        mapQuery: 'Gulshan 1, Dhaka 1212',
        image: '/resources/images/yi-moon-shop.jpg',
    },
];

/**
 * A directions link for an outlet.
 *
 * Built rather than stored, so the encoding and the provider's parameter names
 * live with the rest of the mapping instead of being hand-copied into each entry.
 */
export const directionsUrl = (outlet) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(outlet.mapQuery ?? outlet.address)}`;
