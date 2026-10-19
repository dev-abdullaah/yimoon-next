// types/product.ts

export interface ProductVariant {
    id: number | string;
    product_id?: number | string;
    productId?: number | string;
    title?: string;
    sku?: string;
    price: number | string;
    compare_at_price?: number | string | null;
    compareAtPrice?: number | string | null;
    stock_quantity?: number | string | null;
    stockQuantity?: number | string | null;
    in_stock?: boolean;
    inStock?: boolean;
    purchasable?: boolean;
    is_default?: boolean;
    isDefault?: boolean;
    attributes?: Record<string, string | number>;
    photo?: string | null;
    photo_url?: string | null;
    image?: string | null;
}

export interface Brand {
    id: number | string;
    name: string;
    slug?: string;
    logo?: string | null;
}

export interface Category {
    id: number | string;
    name: string;
    slug?: string;
    parent_id?: number | string | null;
    parentId?: number | string | null;
    icon?: string | null;
    photo?: string | null;
    image?: string | null;
    image_url?: string | null;
    is_featured?: boolean;
    isFeatured?: boolean;
    position?: number;
    children?: Category[];
    depth?: number;
    [key: string]: any;
}

export interface Product {
    id: number | string;
    name: string;
    slug: string;
    product_code?: string;
    productCode?: string;
    description?: string;
    details?: string;
    brand?: Brand | null;
    category?: Category | null;
    categories?: Category[];
    variants?: ProductVariant[];
    default_variant_id?: number | string | null;
    defaultVariantId?: number | string | null;
    photo?: string | null;
    photo_url?: string | null;
    image?: string | null;
    gallery?: (string | null | undefined)[];
    price?: number | string;
    compare_at_price?: number | string | null;
    compareAtPrice?: number | string | null;
    in_stock?: boolean;
    inStock?: boolean;
    pricing?: {
        price_from?: number | string;
        compare_at_price?: number | string | null;
        on_sale?: boolean;
        currency?: string;
    };
    availability?: {
        in_stock?: boolean;
        is_backorder?: boolean;
    };
    badges?: string[];
    is_hot?: boolean;
    is_new?: boolean;
    __isProductView?: boolean;
}

export interface ProductView {
    __isProductView: true;
    id: number | string;
    name: string;
    slug: string;
    productCode?: string;
    description: string;
    photo?: string | null;
    image: string;
    gallery: string[];
    price: number;
    compareAtPrice: number | null;
    onSale: boolean;
    discountPercent: number;
    currency: string;
    inStock: boolean;
    purchasable: boolean;
    stockQuantity: number | null;
    defaultVariantId: number | string | null;
    variants: ProductVariant[];
    brand: Brand | null;
    category: Category | null;
    categories: Category[];
    badges: string[];
    raw: Product;
}
