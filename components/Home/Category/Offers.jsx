// components/Home/Category/Offers.jsx
'use client';

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
    const ceilings = section?.settings?.ceilings?.length ? section.settings.ceilings : DEFAULT_CEILINGS;

    // Check backend offer cards
    const backendOffers = [getBanner('offer_1'), getBanner('offer_2'), getBanner('offer_3')]
        .filter((b) => b && b.is_active && b.image);

    const useBackendOffers = backendOffers.length > 0;
    const catBanners = discountedCategories(data).slice(0, 3);

    return (
        <section aria-label={section?.title || 'Budget Deals & Offers'}>
            <SectionHeader
                eyebrow={section?.badge_text}
                title={section?.title || 'Budget Deals & Offers'}
                subtitle={section?.subtitle || 'Shop high quality cosmetics curated to fit your exact budget'}
                href="/catalog?sort=discount"
                linkLabel="See All Deals"
            />
            <div className="hp-offers">
                {useBackendOffers
                    ? backendOffers.map((offer, idx) => (
                          <Link
                              key={offer.id || idx}
                              href={normalizeBannerUrl(offer.link_url || '/catalog')}
                              className="hp-offer group"
                          >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                  alt={offer.title || 'Offer'}
                                  loading="lazy"
                                  src={offer.image ? getBannerImageUrl(offer.image) : PLACEHOLDER_IMAGE}
                                  onError={(event) => {
                                      event.currentTarget.onerror = null;
                                      event.currentTarget.src = PLACEHOLDER_IMAGE;
                                  }}
                              />
                              <div className="hp-promo__shade" />
                              <div className="hp-promo__content">
                                  {offer.subtitle && <span className="hp-promo__kicker">{offer.subtitle}</span>}
                                  <h4 className="hp-promo__title">{offer.title}</h4>
                              </div>
                          </Link>
                      ))
                    : catBanners.map((category) => (
                          <Link
                              key={category.id}
                              href={getCategoryRelativeUrl(category)}
                              className="hp-offer group"
                          >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                  alt={category.name}
                                  loading="lazy"
                                  src={category.image}
                                  onError={(event) => {
                                      event.currentTarget.onerror = null;
                                      event.currentTarget.src = PLACEHOLDER_IMAGE;
                                  }}
                              />
                              <div className="hp-promo__shade" />
                              <div className="hp-promo__content">
                                  <span className="hp-promo__kicker">Special Offer</span>
                                  <h4 className="hp-promo__title">{category.name}</h4>
                              </div>
                          </Link>
                      ))}

                {/* The budget filter panel */}
                <div className="hp-budget">
                    <div>
                        <h4 className="hp-budget__title">Shop By Budget</h4>
                        <p className="hp-budget__sub">Pocket-friendly picks</p>
                    </div>
                    <div className="hp-budget__grid">
                        {ceilings.map((amount) => (
                            <Link
                                key={amount}
                                href={`/catalog?max_price=${amount}&sort=price_asc`}
                                className="hp-budget__chip"
                            >
                                <small>Within</small>
                                <strong>৳{amount}</strong>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

function discountedCategories(payload) {
    const products = payload?.data?.products ?? payload?.products ?? [];
    const seen = new Set();

    return products
        .map(toProductView)
        .map((product) => product?.category)
        .filter((category) => {
            if (!category?.id || !category.image || seen.has(category.id)) return false;
            seen.add(category.id);
            return true;
        });
}

export default Offers;
