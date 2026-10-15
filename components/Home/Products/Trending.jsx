// components/Home/Products/Trending.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';
import { useStorefront } from '@/hooks/useStorefront';

const Trending = () => {
    const { getSection } = useStorefront();
    const section = getSection('trending');

    return (
        <ProductRow
            title={section?.title || 'Trending'}
            subtitle={section?.subtitle}
            eyebrow={section?.badge_text}
            tone="plain"
            limit={section?.item_limit || 10}
            seeMoreHref="/catalog"
            queryKey={['recommendations', 'trending']}
            fetchProducts={() => recommendationApi.trending()}
        />
    );
};

export default Trending;
