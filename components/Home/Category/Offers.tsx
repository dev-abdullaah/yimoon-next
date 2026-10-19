// components/Home/Category/Offers.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { recommendationApi, PLACEHOLDER_IMAGE, getBannerImageUrl } from '@/lib/api';
import { toProductView } from '@/lib/productView';
import { getCategoryRelativeUrl, normalizeBannerUrl } from '@/utils/urlHelper';
import { useStorefront } from '@/hooks/useStorefront';
import SectionHeader from '@/components/Home/SectionHeader';

const DEFAULT_CEILINGS = [599, 1000, 1500, 2000];

const Offers = () => {
    const { getBanner, getSection, isSectionActive } = useStorefront();

    const { data } = useQuery({
        queryKey: ['recommendations', 'on-sale'],
        queryFn: () => recommendationApi.onSale(),
        staleTime: 1000 * 60 * 10,
        retry: 1,
    });

    if (!isSectionActive('offers_budget')) {
        return null;
    }

    const section = getSection('offers_budget');
    const ceilings: number[] = section?.settings?.ceilings?.length ? section.settings.ceilings : DEFAULT_CEILINGS;

    // Check backend offer cards
    const backendOffers = [getBanner('offer_1'), getBanner('offer_2'), getBanner('offer_3')]
        .filter((b) => b && b.is_active && b.image);

    const useBackendOffers = backendOffers.length > 0;
    const catBanners = discountedCategories(data).slice(0, 3);

    return (
        <section aria-label={section?.title || 'Budget Deals & Offers'}>
            <SectionHeader
                eyebrow={section?.badge_text || 'Budget'}
                title={section?.title || 'Budget Deals & Offers'}
                subtitle={section?.subtitle || 'Filter products within your ideal budget range'}
                href="/catalog?sort=discount"
                linkLabel="See All Deals"
            />

            {/* Quick Budget Pill Filter Bar */}
            <div className="hp-budget-bar">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Quick Budget:
                </span>
                {ceilings.map((amount) => (
                    <Link
                        key={amount}
                        href={`/catalog?max_price=${amount}&sort=price_asc`}
                        className="hp-budget-pill group"
                    >
                        <span>Under</span>
                        <strong>৳{amount}</strong>
                        <span className="hp-budget-pill__arrow" aria-hidden="true">→</span>
                    </Link>
                ))}
            </div>

            {/* 3 Offer Cards in Balanced Grid */}
            <div className="hp-offers-3col">
                {useBackendOffers
                    ? backendOffers.map((offer, idx) => (
                          <Link
                              key={offer?.id || idx}
                              href={normalizeBannerUrl(offer?.link_url || '/catalog')}
                              className="hp-offer-card group"
                          >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                  alt={offer?.title || 'Offer'}
                                  loading="lazy"
                                  src={offer?.image ? getBannerImageUrl(offer.image) : PLACEHOLDER_IMAGE}
                                  onError={(event) => {
                                      event.currentTarget.onerror = null;
                                      event.currentTarget.src = PLACEHOLDER_IMAGE;
                                  }}
                              />
                              <div className="hp-offer-card__shade" />
                              <div className="hp-offer-card__content">
                                  {offer?.subtitle && <span className="hp-offer-card__kicker">{offer.subtitle}</span>}
                                  <h4 className="hp-offer-card__title">{offer?.title}</h4>
                                  <span className="hp-offer-card__cta">
                                      Shop Deals <span>→</span>
                                  </span>
                              </div>
                          </Link>
                      ))
                    : catBanners.map((category) => (
                          <Link
                              key={category.id}
                              href={getCategoryRelativeUrl(category)}
                              className="hp-offer-card group"
                          >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                  alt={category.name}
                                  loading="lazy"
                                  src={category.image || PLACEHOLDER_IMAGE}
                                  onError={(event) => {
                                      event.currentTarget.onerror = null;
                                      event.currentTarget.src = PLACEHOLDER_IMAGE;
                                  }}
                              />
                              <div className="hp-offer-card__shade" />
                              <div className="hp-offer-card__content">
                                  <span className="hp-offer-card__kicker">Special Offer</span>
                                  <h4 className="hp-offer-card__title">{category.name}</h4>
                                  <span className="hp-offer-card__cta">
                                      Shop Deals <span>→</span>
                                  </span>
                              </div>
                          </Link>
                      ))}
            </div>
        </section>
    );
};

function discountedCategories(payload: any) {
    const products = payload?.data?.products ?? payload?.products ?? [];
    const seen = new Set();

    return products
        .map(toProductView)
        .map((product: any) => product?.category)
        .filter((category: any) => {
            if (!category?.id || !category.image || seen.has(category.id)) return false;
            seen.add(category.id);
            return true;
        });
}

export default Offers;
