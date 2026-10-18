// utils/validators.js

/**
 * Validates a person's full name.
 * Minimum 2 characters, maximum 60 characters.
 */
export const validateName = (name) => {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 60;
};

/**
 * Sanitizes full name input by stripping disallowed characters.
 * Allows letters, spaces, hyphens, and periods.
 */
export const sanitizeName = (name) => {
    return (name || '').replace(/[^a-zA-Z\s.-]/g, '');
};

/**
 * Validates a Bangladeshi mobile number:
 * 013-019 (11 digits) or optional +880 / 880 prefix.
 */
export const validatePhoneNumber = (phone) => {
    if (!phone) return false;
    const clean = phone.replace(/[\s-]/g, '');
    // Bangladeshi mobile numbers: 013-019 (11 digits) or with +880 / 880
    return /^(?:\+?880|0)?(1[3-9]\d{8})$/.test(clean);
};

/**
 * Sanitizes phone number by removing non-digits and limiting to 11 digits.
 */
export const sanitizePhoneNumber = (phone) => {
    return (phone || '').replace(/\D/g, '').slice(0, 11);
};

/**
 * Normalizes phone number to national 11-digit format (01XXXXXXXXX).
 * If format is unrecognized, returns trimmed original.
 */
export const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    const clean = phone.replace(/[\s-]/g, '');
    const match = clean.match(/^(?:\+?880|0)?(1[3-9]\d{8})$/);
    return match ? `0${match[1]}` : clean;
};

/**
 * Validates email address format.
 */
export const validateEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Validates delivery address (5-200 characters).
 */
export const validateAddress = (address) => {
    if (!address) return false;
    return address.trim().length >= 5 && address.trim().length <= 200;
};

/**
 * Validates Bangladeshi 4-digit postal code (1000-9499).
 */
export const validatePostCode = (postCode) => {
    if (!postCode) return true; // optional
    const numeric = parseInt(postCode, 10);
    return /^\d{4}$/.test(postCode) && numeric >= 1000 && numeric <= 9499;
};
