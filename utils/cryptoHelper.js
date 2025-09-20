// utils/cryptoHelper.js
import CryptoJS from "crypto-js";

// Helper function to check if we're in the browser
const isBrowser = () => typeof window !== 'undefined';

// Generate secure key based on browser fingerprint
const generateSecretKey = () => {
  if (!isBrowser()) {
    return 'server-secret-key';
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.userAgentData?.platform || 'unknown',
    window.location.origin
  ].join('|');

  const hash = CryptoJS.SHA256(fingerprint).toString();
  return hash.substring(0, 32); // 256-bit key
};

// Generate obfuscated cookie name
const generateCookieName = (purpose) => {
  const baseKey = `${purpose}_data_session`;
  const hash = CryptoJS.SHA256(baseKey).toString();
  return `session.usr_${hash.slice(0, 12)}`;
};

// Initialize variables with default values for server-side
let SECRET_KEY = 'server-secret-key';
let DISCOUNT_COOKIE_NAME = 'server-discount-cookie';
let SPIN_ATTEMPTS_COOKIE_NAME = 'server-spin-cookie';
let PENDING_DISCOUNT_COOKIE_NAME = 'server-pending-cookie';

// Initialize browser-specific values only in the browser
if (isBrowser()) {
  SECRET_KEY = generateSecretKey();
  DISCOUNT_COOKIE_NAME = generateCookieName('discount');
  SPIN_ATTEMPTS_COOKIE_NAME = generateCookieName('spin_attempts');
  PENDING_DISCOUNT_COOKIE_NAME = generateCookieName('pending_discount');
}

// Cookie utility functions
const setCookie = (name, value, days = 7) => {
  if (!isBrowser()) return;

  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure=${window.location.protocol === 'https:'}`;
};

const getCookie = (name) => {
  if (!isBrowser()) return null;

  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') cookie = cookie.substring(1, cookie.length);
    if (cookie.indexOf(nameEQ) === 0) return cookie.substring(nameEQ.length, cookie.length);
  }
  return null;
};

const deleteCookie = (name) => {
  if (!isBrowser()) return;

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
};

// Encryption functions
export function encryptData(data) {
  try {
    const key = SECRET_KEY; // Use the initialized variable instead of calling a function
    return CryptoJS.AES.encrypt(JSON.stringify(data), key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decryptData(cipherText) {
  try {
    const key = SECRET_KEY; // Use the initialized variable instead of calling a function
    const decrypted = CryptoJS.AES.decrypt(cipherText, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plainText) {
      throw new Error('Decryption resulted in empty string');
    }

    return JSON.parse(plainText);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

const generateTokenKey = () => {
  if (!isBrowser()) {
    return 'server-token-key';
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    window.location.origin
  ].join('|');

  return CryptoJS.SHA256(fingerprint + '_auth_token').toString();
};

export const setAuthToken = (token) => {
  if (!isBrowser()) return false;

  try {
    const tokenKey = generateTokenKey();

    // For frequently regenerated tokens, we might not need expiration
    // But we'll still encrypt it for security
    const tokenData = {
      token: token,
      timestamp: Date.now() // Track when it was stored
    };

    // Encrypt the token data before storing
    const encryptedData = encryptData(tokenData);
    localStorage.setItem(tokenKey, encryptedData);
    return true;
  } catch (error) {
    console.error('Error setting auth token:', error);
    return false;
  }
};

export const getAuthToken = () => {
  if (!isBrowser()) return null;

  try {
    const tokenKey = generateTokenKey();
    const encryptedData = localStorage.getItem(tokenKey);
    if (!encryptedData) return null;

    // Decrypt the token data
    const tokenData = decryptData(encryptedData);
    if (!tokenData) return null;

    return tokenData.token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const clearAuthToken = () => {
  if (!isBrowser()) return;

  try {
    const tokenKey = generateTokenKey();
    localStorage.removeItem(tokenKey);
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};

// Add a function to check if we need to refresh the token
export const shouldRefreshToken = () => {
  if (!isBrowser()) return false;

  try {
    const tokenKey = generateTokenKey();
    const encryptedData = localStorage.getItem(tokenKey);
    if (!encryptedData) return true;

    const tokenData = decryptData(encryptedData);
    if (!tokenData) return true;

    // Refresh token if it's older than 5 minutes (adjust as needed)
    return (Date.now() - tokenData.timestamp) > (5 * 60 * 1000);
  } catch (error) {
    console.error('Error checking token refresh:', error);
    return true;
  }
};

// Generate dynamic key for modal dismissal
const generateModalDismissalKey = () => {
  if (!isBrowser()) {
    return 'server-modal-key';
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    window.location.origin
  ].join('|');

  return CryptoJS.SHA256(fingerprint + '_modal_dismissal').toString();
};

// Modal dismissal tracking - USING LOCALSTORAGE WITH ENCRYPTED VALUE AND 6-HOUR EXPIRY
export const setModalDismissed = () => {
  if (!isBrowser()) return false;

  try {
    const dismissalKey = generateModalDismissalKey();
    const dismissedData = {
      dismissed: true,
      expiry: Date.now() + (6 * 60 * 60 * 1000) // 6 hours from now
    };

    // Encrypt the dismissal data before storing
    const encryptedData = encryptData(dismissedData);
    localStorage.setItem(dismissalKey, encryptedData);
    return true;
  } catch (error) {
    console.error('Error setting modal dismissed state:', error);
    return false;
  }
};

export const isModalDismissed = () => {
  if (!isBrowser()) return false;

  try {
    const dismissalKey = generateModalDismissalKey();
    const encryptedData = localStorage.getItem(dismissalKey);
    if (!encryptedData) return false;

    // Decrypt the dismissal data
    const dismissedData = decryptData(encryptedData);
    if (!dismissedData) return false;

    // Check if the dismissal has expired
    if (Date.now() > dismissedData.expiry) {
      localStorage.removeItem(dismissalKey);
      return false;
    }

    return dismissedData.dismissed === true;
  } catch (error) {
    console.error('Error getting modal dismissed state:', error);
    return false;
  }
};

export const clearModalDismissed = () => {
  if (!isBrowser()) return;

  try {
    const dismissalKey = generateModalDismissalKey();
    localStorage.removeItem(dismissalKey);
  } catch (error) {
    console.error('Error clearing modal dismissed state:', error);
  }
};

// Spin attempts management
export function getSpinAttempts() {
  if (!isBrowser()) return { remaining: 3, total: 3 };

  try {
    const encrypted = getCookie(SPIN_ATTEMPTS_COOKIE_NAME);
    if (!encrypted) return { remaining: 3, total: 3 };

    return decryptData(encrypted);
  } catch (error) {
    console.error('Failed to get spin attempts:', error);
    return { remaining: 3, total: 3 };
  }
}

export function decrementSpinAttempts() {
  if (!isBrowser()) return { remaining: 0, total: 3 };

  try {
    const attempts = getSpinAttempts();
    const newAttempts = {
      remaining: Math.max(0, attempts.remaining - 1),
      total: attempts.total
    };

    const encrypted = encryptData(newAttempts);
    setCookie(SPIN_ATTEMPTS_COOKIE_NAME, encrypted, 7);

    return newAttempts;
  } catch (error) {
    console.error('Failed to decrement spin attempts:', error);
    return { remaining: 0, total: 3 };
  }
}

// Pending discount management (before claim)
export function savePendingDiscount(discountValue) {
  if (!isBrowser()) return false;

  try {
    const discountData = {
      value: discountValue,
      timestamp: Date.now(),
      claimed: false
    };

    const encrypted = encryptData(discountData);
    setCookie(PENDING_DISCOUNT_COOKIE_NAME, encrypted, 7);

    return true;
  } catch (error) {
    console.error('Failed to save pending discount:', error);
    return false;
  }
}

export function getPendingDiscount() {
  if (!isBrowser()) return null;

  try {
    const encrypted = getCookie(PENDING_DISCOUNT_COOKIE_NAME);
    if (!encrypted) return null;

    return decryptData(encrypted);
  } catch (error) {
    console.error('Failed to get pending discount:', error);
    return null;
  }
}

export function clearPendingDiscount() {
  if (!isBrowser()) return;

  deleteCookie(PENDING_DISCOUNT_COOKIE_NAME);
}

// Claimed discount management (after claim)
export function claimDiscount() {
  if (!isBrowser()) return false;

  try {
    const pendingDiscount = getPendingDiscount();
    if (!pendingDiscount) return false;

    // Save as claimed discount
    const claimedData = {
      value: pendingDiscount.value,
      timestamp: Date.now(),
      claimed: true
    };

    const encrypted = encryptData(claimedData);
    setCookie(DISCOUNT_COOKIE_NAME, encrypted, 7);

    // Clear pending discount
    clearPendingDiscount();

    return true;
  } catch (error) {
    console.error('Failed to claim discount:', error);
    return false;
  }
}

export function getClaimedDiscount() {
  if (!isBrowser()) return null;

  try {
    const encrypted = getCookie(DISCOUNT_COOKIE_NAME);
    if (!encrypted) return null;

    const discountData = decryptData(encrypted);
    return discountData ? discountData.value : null;
  } catch (error) {
    console.error('Failed to get claimed discount:', error);
    return null;
  }
}

export function hasClaimedDiscount() {
  return getClaimedDiscount() !== null;
}

// Clear all discount-related cookies (for checkout completion)
export function clearSpinDiscountData() {
  if (!isBrowser()) return;

  deleteCookie(DISCOUNT_COOKIE_NAME);
  deleteCookie(PENDING_DISCOUNT_COOKIE_NAME);
  deleteCookie(SPIN_ATTEMPTS_COOKIE_NAME);
  clearModalDismissed();
}

// Development reset function
export function resetSpinnerData() {
  clearSpinDiscountData();
}

// Main function for checkout
export function getSpinDiscount() {
  return getClaimedDiscount();
}

// Generate dynamic key for checkout form data
const generateCheckoutFormKey = () => {
  if (!isBrowser()) {
    return 'server-checkout-key';
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    window.location.origin
  ].join('|');

  return CryptoJS.SHA256(fingerprint + '_checkout_form').toString();
};

// Checkout form data management
export function saveCheckoutFormData(formData) {
  if (!isBrowser()) return false;

  try {
    const formKey = generateCheckoutFormKey();

    // Encrypt the form data before storing
    const encryptedData = encryptData(formData);

    // Set cookie with 7-day expiration
    setCookie(formKey, encryptedData, 7);
    return true;
  } catch (error) {
    console.error('Error saving checkout form data:', error);
    return false;
  }
}

export function getCheckoutFormData() {
  if (!isBrowser()) return null;

  try {
    const formKey = generateCheckoutFormKey();
    const encryptedData = getCookie(formKey);

    if (!encryptedData) return null;

    // Decrypt the form data
    return decryptData(encryptedData);
  } catch (error) {
    console.error('Error getting checkout form data:', error);
    return null;
  }
}

export function clearCheckoutFormData() {
  if (!isBrowser()) return;

  try {
    const formKey = generateCheckoutFormKey();
    deleteCookie(formKey);
  } catch (error) {
    console.error('Error clearing checkout form data:', error);
  }
}