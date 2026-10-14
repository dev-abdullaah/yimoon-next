// lib/productView.js
import { getProductImageUrl, PLACEHOLDER_IMAGE } from '@/lib/api';

/**
 * A `ProductResource` flattened into the fields the storefront actually renders.
 *
 * The API nests money under `pricing` and stock under `availability`, which is
 * right for a wire format and wrong to read in a component — every card would
 * otherwise re-navigate `product.pricing.price_from` and invent its own
 * fallback for a product that is out of stock. Flattening once here also puts
 * the "is this buyable" decision in a single place.
 */
export function toProductView(product) {
    if (!product) return null;
    if (product.__isProductView) return product;
    if (product.image && (product.defaultVariantId !== undefined || product.productCode !== undefined)) {
        return product;
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const targetVariantId = product.default_variant_id ?? product.defaultVariantId;
    const defaultVariant = variants.find((variant) => variant.id === targetVariantId)
        ?? variants.find((variant) => variant.is_default || variant.isDefault)
        ?? variants[0]
        ?? null;

    // `pricing.price_from` is the cheapest variant, which is what a listing
    // should advertise. When a product has variants, the price actually payable
    // depends on the one picked, so the default variant's price is preferred
    // and the "from" price is only used when there is nothing better.
    const price = defaultVariant?.price ?? product.pricing?.price_from ?? product.price ?? 0;
    const compareAtPrice = defaultVariant?.compare_at_price
        ?? defaultVariant?.compareAtPrice
        ?? product.pricing?.compare_at_price
        ?? product.compareAtPrice
        ?? null;

    const onSale = Boolean(product.pricing?.on_sale ?? product.onSale)
        && compareAtPrice !== null
        && Number(compareAtPrice) > Number(price);

    const inStock = defaultVariant?.in_stock
        ?? defaultVariant?.inStock
        ?? product.availability?.in_stock
        ?? product.inStock
        ?? false;
    const purchasable = defaultVariant?.purchasable ?? inStock;

    const photo = product.photo || product.photo_url || product.image;
    const rawGallery = Array.isArray(product.gallery) && product.gallery.length
        ? product.gallery
        : (photo ? [photo] : []);
    const resolvedGallery = Array.from(new Set(rawGallery.filter(Boolean).map(getProductImageUrl)));

    return {
        __isProductView: true,
        id: product.id,
        name: product.name,
        slug: product.slug,
        productCode: product.product_code ?? product.productCode,
        description: product.description ?? '',

        photo: product.photo ?? photo,
        image: getProductImageUrl(photo),
        // The gallery is the photo followed by any extra images, de-duplicated
        // because a product whose only image is its photo would otherwise show
        // the same frame twice in the detail gallery.
        gallery: resolvedGallery.length > 0 ? resolvedGallery : [getProductImageUrl(photo)],

        price: Number(price),
        compareAtPrice: compareAtPrice === null ? null : Number(compareAtPrice),
        onSale,
        discountPercent: onSale && compareAtPrice > 0
            ? Math.round((1 - Number(price) / Number(compareAtPrice)) * 100)
            : 0,
        currency: product.pricing?.currency ?? product.currency ?? 'BDT',

        inStock,
        purchasable,
        stockQuantity: defaultVariant?.stock_quantity
            ?? defaultVariant?.stockQuantity
            ?? product.availability?.stock_quantity
            ?? product.stockQuantity
            ?? 0,

        rating: {
            average: Number(product.rating?.average ?? 0),
            count: Number(product.rating?.count ?? 0) || 0,
        },

        category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
                slug: product.category.slug,
                image: (product.category.image || product.category.image_url)
                    ? getProductImageUrl(product.category.image_url || product.category.image)
                    : null,
            }
            : null,

        variants: variants.map(toVariantView),
        defaultVariantId: defaultVariant?.id ?? null,
        defaultVariant: defaultVariant ? toVariantView(defaultVariant) : null,

        isFeatured: Boolean(product.is_featured ?? product.isFeatured),

        // Kept as the raw strings the API sent them: the sitemap writes these
        // into `<lastmod>`, which has to be an ISO timestamp, and reformatting
        // through a Date here would quietly turn a bad value into "now".
        createdAt: product.created_at ?? product.createdAt ?? null,
        updatedAt: product.updated_at ?? product.updatedAt ?? null,
    };
}

/**
 * A `ProductVariantResource` flattened for display and for picking.
 */
export function toVariantView(variant) {
    if (!variant) return null;
    if (variant.__isVariantView) return variant;

    return {
        __isVariantView: true,
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        attributes: variant.attributes ?? {},
        price: Number(variant.price ?? 0),
        compareAtPrice: variant.compare_at_price === null || variant.compare_at_price === undefined
            ? (variant.compareAtPrice !== undefined ? (variant.compareAtPrice === null ? null : Number(variant.compareAtPrice)) : null)
            : Number(variant.compare_at_price),
        onSale: variant.onSale !== undefined ? Boolean(variant.onSale) : Boolean(variant.on_sale),
        discountPercent: Number(variant.discount_percent ?? variant.discountPercent ?? 0),
        inStock: variant.inStock !== undefined ? Boolean(variant.inStock) : Boolean(variant.in_stock),
        stockQuantity: Number(variant.stock_quantity ?? variant.stockQuantity ?? 0),
        isDefault: variant.isDefault !== undefined ? Boolean(variant.isDefault) : Boolean(variant.is_default),
        isActive: variant.isActive !== undefined ? Boolean(variant.isActive) : (variant.is_active === undefined ? true : Boolean(variant.is_active)),
        purchasable: variant.purchasable !== undefined ? Boolean(variant.purchasable) : Boolean(variant.in_stock ?? variant.inStock),
    };
}

/**
 * The variants a shopper is offered as choices.
 *
 * Only *inactive* variants are withheld. An out-of-stock one is still offered,
 * greyed out, because a shopper looking at "Large" needs to see that Large
 * exists and is unavailable — dropping it silently would leave them wondering
 * whether they misread the page. Deactivated variants are different: they are
 * not being sold at all, so offering them would promise something checkout
 * refuses.
 */
export function selectableVariants(productView) {
    return (productView?.variants ?? []).filter((variant) => variant.isActive);
}

/**
 * The attribute names a set of variants varies over, in a stable order.
 *
 * A product with sizes but no colour has a "Size" selector only; showing an
 * empty "Color" row would be a control that does nothing.
 */
export function variantOptionAxes(productView) {
    const variants = selectableVariants(productView);
    const axes = [];

    for (const variant of variants) {
        for (const [name, value] of Object.entries(variant.attributes ?? {})) {
            if (!axes.some((axis) => axis.name === name)) {
                axes.push({ name, values: [] });
            }

            const axis = axes.find((candidate) => candidate.name === name);
            const label = value && typeof value === 'object' ? (value.name ?? value.value) : value;

            if (label !== null && label !== undefined && !axis.values.some((v) => v.label === label)) {
                axis.values.push({ label, hex: value?.hex ?? null });
            }
        }
    }

    return axes;
}

export { PLACEHOLDER_IMAGE };
