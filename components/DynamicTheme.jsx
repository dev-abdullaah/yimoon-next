// components/DynamicTheme.jsx
'use client';

import { useEffect } from 'react';
import { useStorefront } from '@/hooks/useStorefront';

/**
 * Applies the brand colours saved in the Storefront backend as CSS custom
 * properties on the document root.
 *
 * Only a colour the admin actually saved is applied. With no saved value the
 * stylesheet's own `--color-primary` (the brand red) is left alone — applying a
 * hard-coded fallback here would silently repaint the whole store.
 */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export default function DynamicTheme() {
    const { getSetting } = useStorefront();
    const primaryColor = getSetting('primary_color', '');
    const secondaryColor = getSetting('secondary_color', '');

    useEffect(() => {
        const root = document.documentElement;

        if (HEX.test(primaryColor)) {
            root.style.setProperty('--color-primary', primaryColor);
        } else {
            root.style.removeProperty('--color-primary');
        }

        if (HEX.test(secondaryColor)) {
            root.style.setProperty('--color-secondary', secondaryColor);
        } else {
            root.style.removeProperty('--color-secondary');
        }
    }, [primaryColor, secondaryColor]);

    return null;
}
