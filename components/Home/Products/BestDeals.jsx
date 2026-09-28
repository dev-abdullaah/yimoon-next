// components/Home/Products/BestDeals.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';

const BestDeals = () => (
    <ProductRow
        title="Best Deals"
        theme="dark"
        seeMoreHref="/catalog?on_sale=1"
        queryKey={['recommendations', 'best-sellers']}
        fetchProducts={() => recommendationApi.bestSellers()}
    />
);

export default BestDeals;
