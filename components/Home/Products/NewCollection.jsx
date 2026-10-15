// components/Home/Products/NewCollection.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';
import { useStorefront } from '@/hooks/useStorefront';

const NewCollection = () => {
    const { getSection } = useStorefront();
    const section = getSection('new_collection');

    return (
        <ProductRow
            title={section?.title || 'New Collection'}
            subtitle={section?.subtitle}
            eyebrow={section?.badge_text}
            tone="plain"
            limit={section?.item_limit || 10}
            seeMoreHref="/catalog?sort=newest"
            queryKey={['recommendations', 'new-arrivals']}
            fetchProducts={() => recommendationApi.newArrivals()}
        />
    );
};

export default NewCollection;
