// components/Home/Products/BestDeals.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import CountdownTimer from '@/components/CountdownTimer';
import { recommendationApi } from '@/lib/api';
import { useStorefront } from '@/hooks/useStorefront';

const BestDeals = () => {
    const { getSection, getSetting } = useStorefront();
    const section = getSection('best_deals');

    // The flash-sale clock sits in this band's header when the admin turns it on.
    const countdownOn = getSetting('countdown_enabled', '0') === '1';
    const countdownTarget = getSetting('countdown_target', '');
    const headerExtra = countdownOn && countdownTarget ? (
        <CountdownTimer targetDate={countdownTarget} title={getSetting('countdown_title', 'Ends in')} />
    ) : null;

    return (
        <ProductRow
            title={section?.title || 'Best Deals'}
            subtitle={section?.subtitle}
            eyebrow={section?.badge_text}
            tone="accent"
            limit={section?.item_limit || 10}
            seeMoreHref="/catalog?on_sale=1&sort=rating"
            queryKey={['recommendations', 'best-deals']}
            fetchProducts={() => recommendationApi.bestDeals()}
            headerExtra={headerExtra}
        />
    );
};

export default BestDeals;
