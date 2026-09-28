// components/Home/Products/Gadgets.jsx
'use client';

import { useQuery } from '@tanstack/react-query';
import ProductRow from '@/components/Home/Products/ProductRow';
import { recommendationApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * Picks are drawn from the shopper's own order history, which the API scopes to
 * a signed-in account. A guest has no history to draw on, so rather than
 * showing a band that can never load, it falls back to the public best-seller
 * list — the closest thing to "chosen for you" that needs no account.
 */
const Gadgets = () => {
    const { isAuthenticated } = useAuth();

    return (
        <ProductRow
            title="Picked For You"
            theme="dark"
            seeMoreHref="/catalog"
            queryKey={['recommendations', isAuthenticated ? 'for-you' : 'best-sellers-fallback']}
            fetchProducts={() => (
                isAuthenticated
                    ? recommendationApi.forYou()
                    : recommendationApi.bestSellers()
            )}
        />
    );
};

export default Gadgets;
