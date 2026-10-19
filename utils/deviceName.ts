// utils/deviceName.ts

/**
 * A short, human-readable name for the device a shopper is signing in from.
 *
 * Built from the user agent because the browser is the only thing that knows
 * what the device is.
 */
export function deviceName(): string {
    if (typeof navigator === 'undefined') return 'Web storefront';

    const agent: string = navigator.userAgent ?? '';

    if (!agent) return 'Web storefront';

    // Ordered most to least specific, because the first match wins.
    const platform: string | null = /iPhone|iPad|iPod/.test(agent)
        ? 'iOS'
        : /Android/.test(agent)
          ? 'Android'
          : /Windows/.test(agent)
            ? 'Windows'
            : /Mac OS X/.test(agent)
              ? 'macOS'
              : /CrOS/.test(agent)
                ? 'ChromeOS'
                : /Linux/.test(agent)
                  ? 'Linux'
                  : null;

    const browser: string | null = /Edg\//.test(agent)
        ? 'Edge'
        : /OPR\//.test(agent)
          ? 'Opera'
          : /Firefox\//.test(agent)
            ? 'Firefox'
            : /Chrome\//.test(agent)
              ? 'Chrome'
              : /Safari\//.test(agent)
                ? 'Safari'
                : null;

    const label = [browser, platform].filter(Boolean).join(' on ');

    return label || 'Web storefront';
}
