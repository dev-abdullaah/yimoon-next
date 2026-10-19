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
    const primaryColor = getSetting('primary_color', '#C20000');
    const secondaryColor = getSetting('secondary_color', '');

    useEffect(() => {
        const root = document.documentElement;
        const effectivePrimary = HEX.test(primaryColor) ? primaryColor : '#C20000';

        root.style.setProperty('--color-primary', effectivePrimary);
        root.style.setProperty('--hp-brand', effectivePrimary);
        root.style.setProperty('--color-dark-primary', `color-mix(in srgb, ${effectivePrimary} 85%, #222222)`);

        if (HEX.test(secondaryColor)) {
            root.style.setProperty('--color-secondary', secondaryColor);
        } else {
            root.style.removeProperty('--color-secondary');
        }
    }, [primaryColor, secondaryColor]);

    return null;
}
