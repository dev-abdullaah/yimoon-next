// components/Home/Products/PickedForYou.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';
import { useStorefront } from '@/hooks/useStorefront';

/**
 * Recommendations curated for the shopper. For authenticated users, it uses
 * their preferences/history; for guests, it falls back cleanly to the backend's
 * high-rated diverse category picks.
 */
const PickedForYou = () => {
    const { getSection } = useStorefront();
    const section = getSection('picked_for_you');

    return (
        <ProductRow
            title={section?.title || 'Picked For You'}
            subtitle={section?.subtitle}
            eyebrow={section?.badge_text}
            tone="tinted"
            limit={section?.item_limit || 10}
            seeMoreHref="/catalog?sort=rating"
            queryKey={['recommendations', 'for-you']}
            fetchProducts={() => recommendationApi.forYou()}
        />
    );
};

export default PickedForYou;
