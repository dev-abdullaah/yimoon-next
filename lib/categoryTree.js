// lib/categoryTree.js

/**
 * Assemble the category tree from the API's flat, parent-before-child list.
 *
 * One pass, not a recursive search: the API already guarantees a parent appears
 * before its children, so by the time a child is reached its parent is in the
 * index and can be attached to directly. Looking each parent up afterwards would
 * make the whole thing quadratic in the number of categories.
 *
 * A category whose parent is missing from the list — deactivated, or simply not
 * returned — is promoted to a root rather than dropped. Dropping it would make
 * its whole subtree unreachable from the menu, so a shop with a hidden
 * intermediate category would appear to have lost its leaf categories too.
 *
 * @param {Array<{id: number|string, parent_id: number|string|null}>} categories
 * @returns {Array<object>} roots, each with a `children` array
 */
export function buildCategoryTree(categories) {
    if (!Array.isArray(categories)) return [];

    const byId = new Map();

    for (const category of categories) {
        if (category?.id) {
            byId.set(category.id, { ...category, children: [] });
        }
    }

    const roots = [];

    for (const category of categories) {
        const node = byId.get(category?.id);

        if (!node) continue;

        const parent = category.parent_id ? byId.get(category.parent_id) : null;

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
export function flattenCategoryTree(categories, depth = 0) {
    return categories.flatMap((category) => [
        { ...category, depth },
        ...flattenCategoryTree(category.children ?? [], depth + 1),
    ]);
}
