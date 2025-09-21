// app/api/og/route.js
import { ImageResponse } from 'next/og';
import { BASE_URL, IMAGE_BASE_URL, WEBSITE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Default fallback image
const createFallbackImage = (title = 'Yi Moon', subtitle = 'A Mini China Store in Bangladesh') => {
    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    height: '100%',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    backgroundImage: 'linear-gradient(180deg, #075985, #0369a1)',
                    fontSize: 60,
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'white',
                }}
            >
                <div style={{ marginBottom: 20 }}>
                    {title}
                </div>
                <div
                    style={{
                        fontSize: 24,
                        fontWeight: 400,
                        color: '#e0f2fe'
                    }}
                >
                    {subtitle}
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('id');

        if (!productId) {
            return createFallbackImage();
        }

        // Fetch product data
        const token = await getOrFetchToken();
        if (!token) {
            console.error('No token available');
            return createFallbackImage('Product Not Found', 'Unable to authenticate');
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const formData = new FormData();
        formData.append('timestamp', timestamp.toString());
        formData.append('token', token);
        formData.append('com', 'Appstore');
        formData.append('action', 'searchItem');
        formData.append('fields', 'i.featured,p.features,i.category as category_id,c.title as category_name,p.shortdesc,i.setup,i.image,i.moreimages');
        formData.append('storeid', '1');
        formData.append('condition', `i.id=${productId}`);

        const response = await fetch(`${BASE_URL}/exchange`, {
            method: 'POST',
            body: formData,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            console.error('API response not ok:', response.status);
            return createFallbackImage('Product Error', 'Unable to load product data');
        }

        const data = await response.json();
        const product = data?.data?.[0];

        if (!product) {
            console.error('No product found for ID:', productId);
            return createFallbackImage('Product Not Found', 'The requested product could not be found');
        }

        const setup = product.setup ? JSON.parse(product.setup) : {};
        const discount = setup.discount || 0;
        const originalPrice = parseFloat(product.unitsalesprice || 0);
        const discountedPrice = originalPrice - parseFloat(discount);
        
        // Try to load the product image
        let productImageData = null;
        if (product.image) {
            const imageUrl = `${IMAGE_BASE_URL}/${product.image}`;
            try {
                const imageResponse = await fetch(imageUrl, {
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                if (imageResponse.ok) {
                    productImageData = await imageResponse.arrayBuffer();
                }
            } catch (err) {
                console.error('Failed to fetch product image:', err);
            }
        }

        // Create the OG image
        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'white',
                        position: 'relative'
                    }}
                >
                    {/* Background gradient */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                            display: 'flex'
                        }}
                    />
                    
                    {/* Content container */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            height: '100%',
                            padding: '60px',
                            position: 'relative',
                            zIndex: 1
                        }}
                    >
                        {/* Left side - Product image */}
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '60px'
                            }}
                        >
                            {productImageData ? (
                                <div
                                    style={{
                                        width: '400px',
                                        height: '400px',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <img
                                        src={`${IMAGE_BASE_URL}/${product.image}`}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div
                                    style={{
                                        width: '400px',
                                        height: '400px',
                                        borderRadius: '16px',
                                        backgroundColor: '#f1f5f9',
                                        border: '2px dashed #cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '48px',
                                        color: '#64748b'
                                    }}
                                >
                                    📦
                                </div>
                            )}
                        </div>

                        {/* Right side - Product details */}
                        <div
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'flex-start'
                            }}
                        >
                            {/* Brand */}
                            <div
                                style={{
                                    fontSize: '20px',
                                    fontWeight: 600,
                                    color: '#0369a1',
                                    marginBottom: '16px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px'
                                }}
                            >
                                YI MOON
                            </div>

                            {/* Product name */}
                            <h1
                                style={{
                                    fontSize: product.name.length > 50 ? '36px' : '48px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    lineHeight: 1.1,
                                    marginBottom: '24px',
                                    maxWidth: '100%',
                                    overflow: 'hidden'
                                }}
                            >
                                {product.name.substring(0, 80)}{product.name.length > 80 ? '...' : ''}
                            </h1>

                            {/* Price */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    marginBottom: '24px'
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '42px',
                                        fontWeight: 700,
                                        color: '#059669'
                                    }}
                                >
                                    ৳{discountedPrice.toLocaleString()}
                                </span>
                                {discount > 0 && (
                                    <>
                                        <span
                                            style={{
                                                fontSize: '28px',
                                                color: '#9ca3af',
                                                textDecoration: 'line-through'
                                            }}
                                        >
                                            ৳{originalPrice.toLocaleString()}
                                        </span>
                                        <div
                                            style={{
                                                backgroundColor: '#dc2626',
                                                color: 'white',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                fontSize: '16px',
                                                fontWeight: 600
                                            }}
                                        >
                                            Save ৳{discount}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Description */}
                            {product.shortdesc && (
                                <p
                                    style={{
                                        fontSize: '18px',
                                        color: '#475569',
                                        lineHeight: 1.4,
                                        marginBottom: '24px',
                                        maxWidth: '100%'
                                    }}
                                >
                                    {product.shortdesc.substring(0, 120)}...
                                </p>
                            )}

                            {/* Footer */}
                            <div
                                style={{
                                    fontSize: '16px',
                                    color: '#64748b',
                                    fontStyle: 'italic'
                                }}
                            >
                                A Mini China Store in Bangladesh
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
                headers: {
                    'Cache-Control': 'public, max-age=3600, s-maxage=3600'
                }
            }
        );
        
    } catch (error) {
        console.error('Error generating OG image:', error);
        return createFallbackImage('Error Loading Product', 'Please try again later');
    }
}