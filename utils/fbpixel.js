// utils/fbpixel.js
import { FACEBOOK_PIXEL_ID } from '@/lib/config';

export const initFacebookPixel = () => {
    if (typeof window.fbq !== 'function') {
        !(function (f, b, e, v, n, t, s) {
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

        fbq('init', FACEBOOK_PIXEL_ID);
        fbq('track', 'PageView');
    }
};

// Track custom events
export const fbTrack = (event, data = {}) => {
    if (typeof fbq === 'function') {
        fbq('track', event, data);
    }
};
