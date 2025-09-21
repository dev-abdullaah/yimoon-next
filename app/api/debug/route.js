// app/api/debug/route.js
import { BASE_URL, IMAGE_BASE_URL, WEBSITE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
        return Response.json({ error: 'Product ID is required' }, { status: 400 });
    }

    try {
        // Fetch product data
        const token = await getOrFetchToken();
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
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const product = data?.data?.[0];

        if (!product) {
            return Response.json({ error: 'Product not found' }, { status: 404 });
        }

        const setup = product.setup ? JSON.parse(product.setup) : {};
        const discount = setup.discount || 0;
        const originalPrice = parseFloat(product.unitsalesprice);
        const discountedPrice = originalPrice - parseFloat(discount);
        const imageUrl = product.image ? `${IMAGE_BASE_URL}/${product.image}` : `${WEBSITE_URL}/resources/images/product_placeholder.jpg`;
        const productUrl = `${WEBSITE_URL}/product/${productId}/test-product`;

        const ogTags = {
            'og:title': `${product.name} | Yi Moon`,
            'og:description': product.shortdesc || `Buy ${product.name} at ৳${discountedPrice} from Yi Moon - A Mini China Store in Bangladesh.`,
            'og:url': productUrl,
            'og:site_name': 'Yi Moon',
            'og:image': `${WEBSITE_URL}/api/og?id=${productId}`,
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': product.name,
            'og:locale': 'en_US',
            'og:type': 'product',
            'product:price:amount': discountedPrice,
            'product:price:currency': 'BDT',
            'product:availability': 'in stock',
            'twitter:card': 'summary_large_image',
            'twitter:title': `${product.name} | Yi Moon`,
            'twitter:description': product.shortdesc || `Buy ${product.name} at ৳${discountedPrice} from Yi Moon - A Mini China Store in Bangladesh.`,
            'twitter:image': `${WEBSITE_URL}/api/og?id=${productId}`,
        };

        return Response.json({
            product: {
                id: product.itemid,
                name: product.name,
                price: discountedPrice,
                image: imageUrl,
            },
            ogTags,
            ogImageUrl: `${WEBSITE_URL}/api/og?id=${productId}`,
            productUrl,
        });
    } catch (error) {
        console.error('Error generating debug info:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}