// app/(shop)/product/[productId]/[slug]/metadata.jsx
import { BASE_URL, IMAGE_BASE_URL } from '@/lib/config';

async function getProductMetadata(productId) {
    try {
        const token = await getOrFetchToken();
        if (!token) throw new Error("Authentication token not found");

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
            cache: 'no-store', // Don't cache for metadata
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data?.data?.[0] || null;
    } catch (error) {
        console.error('Error fetching product metadata:', error);
        return null;
    }
}

export async function generateMetadata({ params }) {
    const { productId, slug } = params;
    const product = await getProductMetadata(productId);

    if (!product) {
        return {
            title: 'Product Not Found | Yi Moon',
            description: 'The product you are looking for is not available.',
        };
    }

    const setup = product.setup ? JSON.parse(product.setup) : {};
    const discount = setup.discount || 0;
    const originalPrice = parseFloat(product.unitsalesprice);
    const discountedPrice = originalPrice - parseFloat(discount);

    const title = `${product.name} | Yi Moon`;
    const description = product.shortdesc || `Shop ${product.name} at Yi Moon - A Mini China Store in Bangladesh.`;
    const imageUrl = product.image ? `${IMAGE_BASE_URL}/${product.image}` : '/resources/images/og-image-1200x630.png';
    const url = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/product/${productId}/${slug}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: product.name,
                },
            ],
            url,
            type: 'website',
            siteName: 'Yi Moon',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
        alternates: {
            canonical: url,
        },
    };
}