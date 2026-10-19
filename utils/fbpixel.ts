// utils/fbpixel.ts
import { FACEBOOK_PIXEL_ID } from '@/lib/config';

declare global {
    interface Window {
        fbq?: any;
        _fbq?: any;
    }
}

export const initFacebookPixel = (): void => {
    if (typeof window === 'undefined') return;

    if (typeof window.fbq !== 'function') {
        (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
            if (f.fbq) return;
            n = f.fbq = function () {
                n.callMethod
                    ? n.callMethod.apply(n, arguments)
                    : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

        if (typeof window.fbq === 'function') {
            window.fbq('init', FACEBOOK_PIXEL_ID);
            window.fbq('track', 'PageView');
        }
    }
};

// Track custom events
export const fbTrack = (event: string, data: Record<string, any> = {}): void => {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('track', event, data);
    }
};
