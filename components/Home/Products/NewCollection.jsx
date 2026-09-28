// components/Home/Products/NewCollection.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';

const NewCollection = () => (
    <ProductRow
        title="New Collection"
        theme="light"
        seeMoreHref="/catalog?sort=newest"
        queryKey={['recommendations', 'new-arrivals']}
        fetchProducts={() => recommendationApi.newArrivals()}
    />
);

export default NewCollection;
