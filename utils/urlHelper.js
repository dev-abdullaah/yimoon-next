// utils/urlHelper.js
import { WEBSITE_URL } from '@/lib/config';

// Helper function to generate URL-friendly slug from any name
export const generateSlug = (name) => {
    if (!name) return '';
    return name
        .trim()                   // Trim leading/trailing spaces first
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters (keep hyphens and spaces)
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');  // Remove any leading or trailing hyphens
};

// Helper function to generate catalog URL with category
export const getCatalogUrl = (categoryId, categoryName) => {
    if (!categoryId) return '/catalog';
    const slug = generateSlug(categoryName);
    return `/catalog/${categoryId}/${slug}/`;
};

// Helper function to generate product URL with slug
export const getProductUrl = (product) => {
    if (!product) return '#';
    const slug = generateSlug(product.name);
    return `${WEBSITE_URL}/product/${product.id}/${slug}/`;
};

// Add this new function for internal links
export const getProductRelativeUrl = (product) => {
  if (!product) return '#';
  const slug = generateSlug(product.name);
  return `/product/${product.id}/${slug}/`;
};