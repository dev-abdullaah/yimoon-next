// utils/validators.ts

/**
 * Shared validation and input-sanitization rules used across
 * Checkout, Registration, Login, and User Dashboard forms.
 */

const banglaToEnglishDigits = (value: string): string =>
    (value || '').replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

/**
 * Validate a person's full name / recipient name.
 * Must be 2–80 characters (trimmed) and contain at least 2 letters (English or Bangla).
 */
export const validateName = (name: string): boolean => {
    const trimmed = (name || '').trim();
    if (trimmed.length < 2 || trimmed.length > 80) return false;
    const letters = trimmed.match(/[a-zA-Z\u0980-\u09FF]/g);
    return Boolean(letters && letters.length >= 2);
};

/**
 * Strip disallowed characters from a name input on-the-fly.
 * Allows English letters, Bangla Unicode characters, spaces, dots, and hyphens.
 */
export const sanitizeName = (name: string): string => {
    return (name || '').replace(/[^a-zA-Z\u0980-\u09FF\s.-]/g, '');
};

/**
 * Normalize a Bangladeshi phone number to the 11-digit local format (`01XXXXXXXXX`).
 * Accepts `01XXXXXXXXX`, `8801XXXXXXXXX`, or `+8801XXXXXXXXX` (and Bangla digits).
 */
export const normalizePhoneNumber = (phone: string): string => {
    const cleaned = banglaToEnglishDigits(phone || '').replace(/[\s()-]/g, '');
    const match = cleaned.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
    return match ? match[1] : sanitizePhoneNumber(phone || '');
};

/**
 * Validate a Bangladeshi mobile number.
 * Valid prefixes: 013, 014, 015, 016, 017, 018, 019 followed by 8 digits (total 11 digits).
 * Also accepts `+8801...` or `8801...` and Bangla digits.
 */
export const validatePhoneNumber = (phone: string): boolean => {
    const normalized = normalizePhoneNumber(phone);
    return /^01[3-9]\d{8}$/.test(normalized);
};

/**
 * Sanitize phone input to digits only (max 11 digits), converting Bangla digits
 * and stripping any leading 88 country code when pasted.
 */
export const sanitizePhoneNumber = (phone: string): string => {
    let digits = banglaToEnglishDigits(phone || '').replace(/\D/g, '');
    if (digits.startsWith('8801') && digits.length >= 13) {
        digits = digits.slice(2);
    }
    return digits.slice(0, 11);
};

/**
 * Validate an email address (standard RFC-compatible format with domain & TLD).
 */
export const validateEmail = (email: string): boolean => {
    const trimmed = (email || '').trim();
    if (!trimmed) return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
};

/**
 * Validate a street/delivery address.
 * Supports both Bangla and English characters, numbers, and standard punctuation.
 * Must be 5–250 characters and contain at least 3 letters.
 */
export const validateAddress = (address: string): boolean => {
    const trimmed = (address || '').trim();
    if (trimmed.length < 5 || trimmed.length > 250) return false;
    const validCharsRegex = /^[a-zA-Z0-9\u0980-\u09FF\s,./#():;'&-]+$/;
    const letters = trimmed.match(/[a-zA-Z\u0980-\u09FF]/g);
    return validCharsRegex.test(trimmed) && Boolean(letters && letters.length >= 3);
};

/**
 * Strip disallowed characters from an address input on-the-fly.
 */
export const sanitizeAddress = (address: string): string => {
    return (address || '').replace(/[^a-zA-Z0-9\u0980-\u09FF\s,./#():;'&-]/g, '');
};

/**
 * Validate a Bangladesh 4-digit postal code (1000–9499). Optional if empty.
 */
export const validatePostCode = (postCode: string): boolean => {
    if (!postCode) return true;
    if (!/^\d{4}$/.test(postCode)) return false;
    const code = parseInt(postCode, 10);
    return code >= 1000 && code <= 9499;
};
