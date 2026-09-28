// utils/deviceName.js

/**
 * A short, human-readable name for the device a shopper is signing in from.
 *
 * The API stores this as the Sanctum token's name and shows it in the account's
 * device list, and the whole point of that list is telling two of a shopper's
 * devices apart. A constant — which is what was being sent — makes every row read
 * the same, so the list is a row per device and tells the shopper nothing.
 *
 * Built from the user agent because the browser is the only thing that knows
 * what the device is. Deliberately coarse: the goal is "this is my phone" against
 * "this is the laptop I used at the office", not browser identification, and
 * parsing a user agent for an exact build is a way to be confidently wrong as
 * soon as a browser ships.
 *
 * Returns a fallback rather than an empty string on the server, where there is no
 * user agent and no `navigator` to read.
 */
export function deviceName() {
    if (typeof navigator === 'undefined') return 'Web storefront';

    const agent = navigator.userAgent ?? '';

    if (!agent) return 'Web storefront';

    // Ordered most to least specific, because the first match wins. A tablet
    // matches the mobile test below, so it is asked about first.
    const platform = /iPhone|iPad|iPod/.test(agent)
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

    const browser = /Edg\//.test(agent)
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

    // An unrecognised agent produces an empty label, which is worse than a
    // generic one: a device with no name in a list of devices is a device the
    // shopper cannot act on.
    return label || 'Web storefront';
}
