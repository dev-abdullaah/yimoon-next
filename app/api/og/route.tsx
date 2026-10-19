// app/api/og/route.tsx
import React from 'react';
import { ImageResponse } from 'next/og';
import { catalogApi, formatCurrency } from '@/lib/api';
import { toProductView } from '@/lib/productView';

/**
 * The social card for a product.
 *
 * Satori, which draws these, only accepts a subset of CSS and rejects anything
 * it cannot lay out — so the styles here are all inline flexbox, and there is no
 * `className` anywhere. `display: flex` is not optional in Satori: an element
 * with several children is laid out as a row by default in a browser, and
 * silently stacked on top of each other here.
 *
 * The product photo is passed by URL and fetched by Satori during the render.
 * The previous version fetched it into an `ArrayBuffer` up front, checked the
 * buffer was non-null, and then used the URL anyway — the fetch cost was paid
 * and thrown away, and the branch that decided whether to use it had no effect.
 */

// Drawn server-side on every request, but they are deterministic for a given
// product, so an hour of shared caching is safe and saves the render.
export const revalidate = 3600;

const WIDTH = 1200;
const HEIGHT = 630;

const PALETTE = {
    ink: '#0f172a',
    muted: '#475569',
    brand: '#0369a1',
    deal: '#059669',
    strike: '#9ca3af',
    badge: '#dc2626',
};

interface CardProps {
    heading: string;
    subheading?: string;
    image?: string | null;
    price?: number | null;
    compareAtPrice?: number | null;
    discountPercent?: number;
}

export async function GET(request: Request): Promise<ImageResponse> {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
        return card({ heading: 'King Queen', subheading: 'Online Fashion & Lifestyle Store' });
    }

    try {
        // The product endpoint is addressed by slug, so this is too. The
        // metadata that points at this card has the slug in hand — it is part of
        // the product route — which is why an id is not looked up here.
        const response = await catalogApi.getProduct(slug);
        const product = toProductView(response?.data ?? response);

        if (!product) {
            return card({ heading: 'Product not found', subheading: 'King Queen' });
        }

        return card({
            heading: product.name,
            subheading: product.category?.name ?? 'King Queen',
            image: product.image,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            discountPercent: product.discountPercent,
        });
    } catch (error) {
        console.error('Error generating OG image:', error);

        return card({ heading: 'King Queen', subheading: 'Online Fashion & Lifestyle Store' });
    }
}

/**
 * The card itself.
 *
 * Every field is optional so the same component draws the default card, a
 * product with a photo, and a product without one — a missing image gets a
 * placeholder block rather than a broken frame, which is what an `<img>` that
 * 404s leaves behind.
 */
function card({ heading, subheading, image, price, compareAtPrice = null, discountPercent = 0 }: CardProps) {
    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#f8fafc',
                    backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        padding: '60px',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', marginRight: '60px' }}>
                        {image ? (
                            // Satori draws these itself and understands nothing
                            // but a plain `<img>` — `next/image` is not available
                            // here and would not be understood if it were.
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={image}
                                alt=""
                                width={400}
                                height={400}
                                style={{
                                    width: '400px',
                                    height: '400px',
                                    objectFit: 'cover',
                                    borderRadius: '16px',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    width: '400px',
                                    height: '400px',
                                    borderRadius: '16px',
                                    backgroundColor: '#f1f5f9',
                                    border: '2px dashed #cbd5e1',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '96px',
                                }}
                            >
                                🛍️
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: PALETTE.brand, letterSpacing: '2px', marginBottom: '16px' }}>
                            KING QUEEN
                        </div>

                        {/* Long product names are trimmed rather than shrunk
                            indefinitely: Satori has no text-overflow, so a name
                            that is allowed to wrap forever overflows the card and
                            is cut off at the edge instead. */}
                        <div
                            style={{
                                display: 'flex',
                                fontSize: heading.length > 50 ? '36px' : '48px',
                                fontWeight: 700,
                                color: PALETTE.ink,
                                lineHeight: 1.1,
                                marginBottom: '24px',
                            }}
                        >
                            {heading.length > 80 ? `${heading.slice(0, 80)}…` : heading}
                        </div>

                        {price != null && (
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                                <span style={{ fontSize: '42px', fontWeight: 700, color: PALETTE.deal }}>
                                    {formatCurrency(price)}
                                </span>

                                {compareAtPrice !== null && (
                                    <>
                                        <span
                                            style={{
                                                display: 'flex',
                                                fontSize: '28px',
                                                color: PALETTE.strike,
                                                textDecoration: 'line-through',
                                                marginLeft: '16px',
                                            }}
                                        >
                                            {formatCurrency(compareAtPrice)}
                                        </span>

                                        {discountPercent > 0 && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    backgroundColor: PALETTE.badge,
                                                    color: 'white',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '16px',
                                                    fontWeight: 600,
                                                    marginLeft: '16px',
                                                }}
                                            >
                                                {`Save ${discountPercent}%`}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', fontSize: '18px', color: PALETTE.muted }}>
                            {subheading}
                        </div>
                    </div>
                </div>
            </div>
        ),
        {
            width: WIDTH,
            height: HEIGHT,
            headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
        }
    );
}
