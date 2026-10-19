// lib/categoryTree.ts
import { Category } from '@/types/product';

export interface CategoryNode extends Category {
    children: CategoryNode[];
    depth?: number;
}

/**
 * Assemble the category tree from the API's flat, parent-before-child list.
 *
 * One pass, not a recursive search: the API already guarantees a parent appears
 * before its children, so by the time a child is reached its parent is in the
 * index and can be attached to directly. Looking each parent up afterwards would
 * make the whole thing quadratic in the number of categories.
 *
 * A category whose parent is missing from the list — deactivated, or simply not
 * returned — is promoted to a root rather than dropped.
 */
export function buildCategoryTree(categories?: Category[] | null): CategoryNode[] {
    if (!Array.isArray(categories)) return [];

    const byId = new Map<number | string, CategoryNode>();

    for (const category of categories) {
        if (category?.id != null) {
            byId.set(category.id, { ...category, children: [] });
        }
    }

    const roots: CategoryNode[] = [];

    for (const category of categories) {
        if (category?.id == null) continue;
        const node = byId.get(category.id);

        if (!node) continue;

        const parentId = category.parent_id ?? category.parentId;
        const parent = parentId != null ? byId.get(parentId) : null;

        if (parent && parent !== node) {
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

/**
 * Every category in the tree, flattened depth-first.
 *
 * For a select that lists all of them, where nesting is conveyed by the label
 * rather than by the markup.
 */
export function flattenCategoryTree(categories: CategoryNode[], depth: number = 0): CategoryNode[] {
    if (!Array.isArray(categories)) return [];
    return categories.flatMap((category) => [
        { ...category, depth },
        ...flattenCategoryTree(category.children ?? [], depth + 1),
    ]);
}
