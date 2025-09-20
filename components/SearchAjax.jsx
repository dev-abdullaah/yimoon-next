// components/SearchAjax.jsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';

const SearchAjax = ({ query, isMobile = false, onProductSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const MIN_SEARCH_LENGTH = 2;
  const router = useRouter();

  const handleImageError = (e) => {
    e.target.src = '/resources/images/product_placeholder.jpg';
    e.target.onerror = null;
  };

  useEffect(() => {
    if (!query || query.trim().length < MIN_SEARCH_LENGTH) {
      setProducts([]);
      setError(null);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const searchProducts = async () => {
      setLoading(true);
      setError(null);
      setHasSearched(false);

      try {
        // Use central token service to get or fetch token
        const token = await getOrFetchToken();
        if (!token) throw new Error("Authentication token not found");

        const timestamp = Math.floor(Date.now() / 1000);
        const formData = new FormData();
        formData.append('timestamp', timestamp.toString());
        formData.append('token', token);
        formData.append('com', 'Appstore');
        formData.append('action', 'searchItem');
        formData.append('limit', '0,20');
        formData.append('strstr', query);
        formData.append('fields', 'i.image,i.featured,p.features,i.createdby operator,h.supplierid,p.shortdesc');
        formData.append('storeid', '1');

        const response = await fetch(`${BASE_URL}/exchange`, {
          method: 'POST',
          body: formData,
          signal
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data.status === "1") {
          setProducts(data.data.map(product => ({
            ...product,
            photo: `${IMAGE_BASE_URL}/${product.image}`,
            price: product.unitsalesprice,
            id: product.itemid
          })));
        } else {
          setError(data.message || "No products found");
          setProducts([]);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Failed to fetch search results');
          console.error('Search error:', err);
          setProducts([]);
        }
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    };

    const timer = setTimeout(searchProducts, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleProductClick = (productId, e) => {
    if (isMobile && e) {
      e.preventDefault();
    }

    setIsNavigating(true);

    if (isMobile) {
      // Navigate first
      router.push(`/product/${productId}`);

      // Then close the modal after a short delay
      if (onProductSelect) {
        setTimeout(() => {
          onProductSelect();
        }, 300); // adjust timing to match your page transition
      }
    } else {
      router.push(`/product/${productId}`);
    }
  };

  if (!query || query.trim().length < MIN_SEARCH_LENGTH || isNavigating) {
    return null;
  }

  // Different styling for mobile vs desktop
  if (isMobile) {
    return (
      <div className="w-full bg-white mt-2 rounded-md shadow-lg border border-gray-200">
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
              <span className="px-4 text-gray-600">Searching products...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {products.length > 0 ? (
            <ul role="listbox" className="w-full divide-y divide-gray-200">
              {products.map(product => (
                <li key={product.itemid} className="py-3 hover:bg-gray-50 transition-colors px-4">
                  <button
                    onClick={(e) => handleProductClick(product.itemid, e)}
                    className="flex items-start space-x-4 w-full text-left transition-opacity duration-200 hover:opacity-90"
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        className="w-full h-full object-cover"
                        src={product.photo}
                        alt={product.name}
                        loading="lazy"
                        onError={handleImageError}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left flex flex-col items-start">
                      <h4 className="text-gray-800 font-medium text-sm line-clamp-2">{product.name}</h4>
                      <div className="mt-1">
                        <span className="text-blue-600 font-semibold">৳{product.price}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !loading && hasSearched && (
              <div className="p-4 text-center text-gray-500">
                No products found matching '{query}'
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="absolute top-full left-0 right-0 mx-auto w-full max-w-2xl bg-white shadow-lg rounded-b-md z-50 mt-1 border border-gray-200">
      <div
        className="overflow-y-auto"
        style={{ maxHeight: '60vh', overscrollBehavior: 'contain' }}
      >
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
            <span className="px-4 text-gray-600">Searching products...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {products.length > 0 ? (
          <ul role="listbox" className="w-full divide-y divide-gray-200">
            {products.map(product => (
              <li key={product.itemid} className="py-3 hover:bg-gray-50 transition-colors px-4">
                <Link
                  href={`/product/${product.itemid}`}
                  className="flex items-start space-x-4 transition-opacity duration-200 hover:opacity-90"
                  onClick={() => setIsNavigating(true)}
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      className="w-full h-full object-cover"
                      src={product.photo}
                      alt={product.name}
                      loading="lazy"
                      onError={handleImageError}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-800 font-medium text-sm line-clamp-2">{product.name}</h4>
                    <div className="mt-1">
                      <span className="text-blue-600 font-semibold">৳{product.price}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !loading && hasSearched && (
            <div className="p-4 text-center text-gray-500">
              No products found matching '{query}'
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SearchAjax;