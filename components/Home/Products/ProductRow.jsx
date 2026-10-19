// components/Home/Products/ProductRow.jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import QuickView from '@/components/QuickView';
import QuickViewIconMD from '@/components/Icons/QuickViewIconMD';
import SectionHeader from '@/components/Home/SectionHeader';
import useQuickView from '@/hooks/useQuickView';
import { useFloatingCart } from '@/context/CartContext';
import { getProductRelativeUrl } from '@/utils/urlHelper';
import { toProductView } from '@/lib/productView';
import { PLACEHOLDER_IMAGE } from '@/lib/api';

/**
 * One merchandising section on the home page: a heading, a rail of product
 * cards, and a "view all" link.
 *
 * The five sections (trending, new arrivals, best sellers, on sale, and the
 * personalised list) were five copies of this file that differed only in their
 * query, their heading and their background. Keeping the markup in one place
 * means the card is fixed once rather than five times, and a section is now
 * declared as data.
 */

/**
 * Unified product card across the entire store: homepage rails, catalog
 * listings, and related product sections.
 */
function ProductCard({ product, quantity, onAdd, onIncrease, onDecrease, onQuickView }) {
    const href = getProductRelativeUrl(product);
    const saving = product.onSale && product.compareAtPrice ? Math.round(product.compareAtPrice - product.price) : 0;

    return (
        <article className="hp-card">
            <div className="hp-card__media-wrap">
                <Link href={href} className="hp-card__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        alt={product.name}
                        loading="lazy"
                        width="300"
                        height="300"
                        src={product.image}
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                    />
                    {product.onSale && product.discountPercent > 0 && (
                        <span className="hp-card__flag text-white font-extrabold">-{product.discountPercent}%</span>
                    )}
                    {!product.inStock && <span className="hp-card__flag hp-card__flag--stock">Sold out</span>}
                </Link>
                <button
                    type="button"
                    className="hp-card__quick"
                    aria-label={`Quick view ${product.name}`}
                    onClick={() => onQuickView?.(product)}
                    title="Quick view"
                >
                    <QuickViewIconMD />
                </button>
            </div>
            <div className="hp-card__body">
                <Link href={href} className="hp-card__name" title={product.name}>{product.name}</Link>
                <div className="hp-card__price-box">
                    <div className="hp-card__price">
                        <span className="hp-card__now">৳{product.price?.toLocaleString()}</span>
                        {product.onSale && product.compareAtPrice !== null && (
                            <span className="hp-card__was">৳{product.compareAtPrice?.toLocaleString()}</span>
                        )}
                    </div>
                    <div className="hp-card__save-row">
                        {saving > 0 ? (
                            <span className="hp-card__save">Save ৳{saving.toLocaleString()}</span>
                        ) : (
                            <span className="hp-card__save hp-card__save--empty">Save</span>
                        )}
                    </div>
                </div>
                <div className="hp-card__cta">
                    {quantity > 0 ? (
                        <div className="hp-stepper">
                            <button type="button" aria-label="Decrease quantity" onClick={onDecrease}>−</button>
                            <span>{quantity} in cart</span>
                            <button type="button" aria-label="Increase quantity" onClick={onIncrease}>+</button>
                        </div>
                    ) : (
                        <button type="button" className="hp-btn" disabled={!product.purchasable} onClick={onAdd}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <span>{product.purchasable ? 'Add to Cart' : 'Unavailable'}</span>
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

const RailCard = ProductCard;

/**
 * A homepage merchandising band: shared header plus a horizontally scrolling,
 * snap-aligned rail. A rail rather than a fixed grid means every product the
 * section's "item limit" allows is reachable (a 6-column grid showed six and
 * dropped the rest), and on a phone it swipes instead of stacking into a very
 * long page.
 *
 * `tone` picks the band: `plain` (no background), `tinted` (soft neutral),
 * or `accent` (brand gradient, for the one section that should shout).
 */
export default function ProductRow({
    title,
    subtitle,
    eyebrow,
    srLabel,
    seeMoreHref,
    tone = 'plain',
    queryKey,
    fetchProducts,
    limit = 10,
    headerExtra,
}) {
    const { selectedProduct, showQuickView, handleQuickViewOpen, handleQuickViewClose } = useQuickView();
    const { addToCart, decreaseQty, increaseQty, cartItems } = useFloatingCart();
    const railRef = useRef(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    const { data, isLoading, isError } = useQuery({
        queryKey,
        queryFn: fetchProducts,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });

    // `fetchProducts` returns a list, but a wrapper that only ever returns
    // `{ products: [...] }` or `{ data: { products: [...] } }` is the shape most of these endpoints use, so all
    // are accepted rather than forcing every caller to unwrap.
    const raw = Array.isArray(data)
        ? data
        : (data?.data?.products ?? data?.products ?? data?.data ?? []);
    const products = raw.slice(0, limit).map(toProductView).filter(Boolean);

    const updateEdges = useCallback(() => {
        const rail = railRef.current;
        if (!rail) return;
        setEdges({
            start: rail.scrollLeft <= 4,
            end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4,
        });
    }, []);

    useEffect(() => {
        updateEdges();
        window.addEventListener('resize', updateEdges);
        return () => window.removeEventListener('resize', updateEdges);
    }, [updateEdges, products.length]);

    const scrollBy = (direction) => {
        const rail = railRef.current;
        if (rail) rail.scrollBy({ left: direction * rail.clientWidth * 0.9, behavior: 'smooth' });
    };

    /**
     * How many of a product are already in the cart.
     *
     * Matched on the *variant*, not the product: two lines of the same product
     * in different sizes are different cart rows, so matching on the product
     * would make the stepper on the second card drive the first card's line.
     */
    const lineFor = (product) => cartItems.find((item) => item.variantId === product.defaultVariantId);

    const bandClass = tone === 'plain' ? 'hp-band' : `hp-band hp-band--${tone}`;
    const ready = !isLoading && !isError && products.length > 0;

    // An empty or loading section keeps its footprint as a skeleton: a home
    // page that silently omits a band reflows as each query settles, which
    // reads as a broken page.
    return (
        <section className={bandClass} aria-label={srLabel ?? title}>
            {showQuickView && <QuickView product={selectedProduct} onClose={handleQuickViewClose} />}
            <SectionHeader
                eyebrow={eyebrow}
                title={title}
                subtitle={!isLoading && !isError && products.length === 0 ? 'Nothing to show yet — check back soon.' : subtitle}
                href={ready ? seeMoreHref : undefined}
                extra={headerExtra}
                onPrev={ready ? () => scrollBy(-1) : undefined}
                onNext={ready ? () => scrollBy(1) : undefined}
                canPrev={!edges.start}
                canNext={!edges.end}
            />
            <div className="hp-rail" ref={railRef} onScroll={updateEdges}>
                {ready
                    ? products.map((product) => {
                          const line = lineFor(product);
                          return (
                              <RailCard
                                  key={product.id}
                                  product={product}
                                  quantity={line ? line.quantity : 0}
                                  onAdd={async () => {
                                      await addToCart(product.defaultVariantId, 1, product.name);
                                  }}
                                  onIncrease={() => line && increaseQty(line.id)}
                                  onDecrease={() => line && decreaseQty(line.id)}
                                  onQuickView={handleQuickViewOpen}
                              />
                          );
                      })
                    : Array.from({ length: 6 }, (_, i) => (
                          <div key={i} className="hp-skel" style={{ aspectRatio: '3 / 4.4' }} />
                      ))}
            </div>
        </section>
    );
}

export { ProductCard };

