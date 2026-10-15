// components/Home/Products/ExtraDiscount.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';
import { useStorefront } from '@/hooks/useStorefront';

const ExtraDiscount = () => {
    const { getSection } = useStorefront();
    const section = getSection('extra_discount');

    return (
        <ProductRow
            title={section?.title || 'Extra Discount'}
            subtitle={section?.subtitle}
            eyebrow={section?.badge_text}
            tone="tinted"
            limit={section?.item_limit || 10}
            seeMoreHref="/catalog?on_sale=1&sort=price_asc"
            queryKey={['recommendations', 'on-sale']}
            fetchProducts={() => recommendationApi.onSale()}
        />
    );
};

export default ExtraDiscount;
