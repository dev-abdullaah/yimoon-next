// components/Home/Products/Trending.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';

const Trending = () => (
    <ProductRow
        title="Trending"
        theme="light"
        // The catalogue has no "trending" sort — it falls back to name order for
        // anything it does not recognise, so linking here would show an
        // alphabetical list under a "Trending" heading. The full listing is the
        // honest destination; the ranking itself only exists in this row.
        seeMoreHref="/catalog"
        queryKey={['recommendations', 'trending']}
        fetchProducts={() => recommendationApi.trending()}
    />
);

export default Trending;
