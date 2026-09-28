// components/Home/Products/ExtraDiscount.jsx
'use client';

import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';

const ExtraDiscount = () => (
    <ProductRow
        title="Extra Discount"
        theme="dark"
        // `sort=discount` is not a catalogue sort either. Cheapest-first is the
        // order a shopper looking for a discount expects, and `on_sale=1` is
        // what actually narrows the listing to discounted products.
        seeMoreHref="/catalog?on_sale=1&sort=price_asc"
        queryKey={['recommendations', 'on-sale']}
        fetchProducts={() => recommendationApi.onSale()}
    />
);

export default ExtraDiscount;
