// utils/cryptoHelper.ts
import CryptoJS from "crypto-js";

// Helper function to check if we're in the browser
const isBrowser = (): boolean => typeof window !== 'undefined';

export interface SpinAttempts {
    remaining: number;
    total: number;
}

export interface PendingDiscount {
    value: number;
    timestamp: number;
    claimed: boolean;
}

// Generate secure key based on browser fingerprint
const generateSecretKey = (): string => {
  if (!isBrowser()) {
    return 'server-secret-key';
  }

  const nav = navigator as any;
  const fingerprint = [
    nav.userAgent || '',
    nav.language || '',
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
    new Date().getTimezoneOffset(),
    nav.userAgentData?.platform || 'unknown',
    typeof window !== 'undefined' ? window.location.origin : ''
  ].join('|');

  const hash = CryptoJS.SHA256(fingerprint).toString();
  return hash.substring(0, 32);
};

// Generate obfuscated cookie name
const generateCookieName = (purpose: string): string => {
  const baseKey = `${purpose}_data_session`;
  const hash = CryptoJS.SHA256(baseKey).toString();
  return `session.usr_${hash.slice(0, 12)}`;
};

// Initialize variables with default values for server-side
let SECRET_KEY = 'server-secret-key';
let DISCOUNT_COOKIE_NAME = 'server-discount-cookie';
let SPIN_ATTEMPTS_COOKIE_NAME = 'server-spin-cookie';
let PENDING_DISCOUNT_COOKIE_NAME = 'server-pending-cookie';

if (isBrowser()) {
  SECRET_KEY = generateSecretKey();
  DISCOUNT_COOKIE_NAME = generateCookieName('discount');
  SPIN_ATTEMPTS_COOKIE_NAME = generateCookieName('spin_attempts');
  PENDING_DISCOUNT_COOKIE_NAME = generateCookieName('pending_discount');
}

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 7): void => {
  if (!isBrowser()) return;

  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure=${isSecure}`;
};

const getCookie = (name: string): string | null => {
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

const deleteCookie = (name: string): void => {
  if (!isBrowser()) return;

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
};

// Encryption functions
export function encryptData(data: any): string {
  try {
    const key = SECRET_KEY;
    return CryptoJS.AES.encrypt(JSON.stringify(data), key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decryptData(cipherText: string): any {
  try {
    const key = SECRET_KEY;
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

const generateTokenKey = (): string => {
  if (!isBrowser()) {
    return 'server-token-key';
  }

  const nav = navigator as any;
  const fingerprint = [
    nav.userAgent || '',
    nav.language || '',
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
    new Date().getTimezoneOffset(),
    typeof window !== 'undefined' ? window.location.origin : ''
  ].join('|');

  return CryptoJS.SHA256(fingerprint + '_auth_token').toString();
};

export const setAuthToken = (token: string): boolean => {
  if (!isBrowser()) return false;

  try {
    const tokenKey = generateTokenKey();
    const tokenData = {
      token: token,
      timestamp: Date.now()
    };

    const encryptedData = encryptData(tokenData);
    localStorage.setItem(tokenKey, encryptedData);
    return true;
  } catch (error) {
    console.error('Error setting auth token:', error);
    return false;
  }
};

export const getAuthToken = (): string | null => {
  if (!isBrowser()) return null;

  try {
    const tokenKey = generateTokenKey();
    const encryptedData = localStorage.getItem(tokenKey);
    if (!encryptedData) return null;

    const tokenData = decryptData(encryptedData);
    if (!tokenData) return null;

    return tokenData.token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const clearAuthToken = (): void => {
  if (!isBrowser()) return;

  try {
    const tokenKey = generateTokenKey();
    localStorage.removeItem(tokenKey);
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};

export const shouldRefreshToken = (): boolean => {
  if (!isBrowser()) return false;

  try {
    const tokenKey = generateTokenKey();
    const encryptedData = localStorage.getItem(tokenKey);
    if (!encryptedData) return true;

    const tokenData = decryptData(encryptedData);
    if (!tokenData) return true;

    return (Date.now() - tokenData.timestamp) > (5 * 60 * 1000);
  } catch (error) {
    console.error('Error checking token refresh:', error);
    return true;
  }
};

const generateModalDismissalKey = (): string => {
  if (!isBrowser()) {
    return 'server-modal-key';
  }

  const nav = navigator as any;
  const fingerprint = [
    nav.userAgent || '',
    nav.language || '',
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
    new Date().getTimezoneOffset(),
    typeof window !== 'undefined' ? window.location.origin : ''
  ].join('|');

  return CryptoJS.SHA256(fingerprint + '_modal_dismissal').toString();
};

export const setModalDismissed = (): boolean => {
  if (!isBrowser()) return false;

  try {
    const dismissalKey = generateModalDismissalKey();
    const dismissedData = {
      dismissed: true,
      expiry: Date.now() + (6 * 60 * 60 * 1000)
    };

    const encryptedData = encryptData(dismissedData);
    localStorage.setItem(dismissalKey, encryptedData);
    return true;
  } catch (error) {
    console.error('Error setting modal dismissed state:', error);
    return false;
  }
};

export const isModalDismissed = (): boolean => {
  if (!isBrowser()) return false;

  try {
    const dismissalKey = generateModalDismissalKey();
    const encryptedData = localStorage.getItem(dismissalKey);
    if (!encryptedData) return false;

    const dismissedData = decryptData(encryptedData);
    if (!dismissedData) return false;

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

export const clearModalDismissed = (): void => {
  if (!isBrowser()) return;

  try {
    const dismissalKey = generateModalDismissalKey();
    localStorage.removeItem(dismissalKey);
  } catch (error) {
    console.error('Error clearing modal dismissed state:', error);
  }
};

export function getSpinAttempts(): SpinAttempts {
  if (!isBrowser()) return { remaining: 3, total: 3 };

  try {
    const encrypted = getCookie(SPIN_ATTEMPTS_COOKIE_NAME);
    if (!encrypted) return { remaining: 3, total: 3 };

    return decryptData(encrypted) || { remaining: 3, total: 3 };
  } catch (error) {
    console.error('Failed to get spin attempts:', error);
    return { remaining: 3, total: 3 };
  }
}

export function decrementSpinAttempts(): SpinAttempts {
  if (!isBrowser()) return { remaining: 0, total: 3 };

  try {
    const attempts = getSpinAttempts();
    const newAttempts: SpinAttempts = {
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

export function savePendingDiscount(discountValue: number): boolean {
  if (!isBrowser()) return false;

  try {
    const discountData: PendingDiscount = {
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

export function getPendingDiscount(): PendingDiscount | null {
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

export function clearPendingDiscount(): void {
  if (!isBrowser()) return;

  deleteCookie(PENDING_DISCOUNT_COOKIE_NAME);
}

export function claimDiscount(): boolean {
  if (!isBrowser()) return false;

  try {
    const pendingDiscount = getPendingDiscount();
    if (!pendingDiscount) return false;

    const claimedData = {
      value: pendingDiscount.value,
      timestamp: Date.now(),
      claimed: true
    };

    const encrypted = encryptData(claimedData);
    setCookie(DISCOUNT_COOKIE_NAME, encrypted, 7);

    clearPendingDiscount();
    return true;
  } catch (error) {
    console.error('Failed to claim discount:', error);
    return false;
  }
}

export function getClaimedDiscount(): number | null {
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

export function hasClaimedDiscount(): boolean {
  return getClaimedDiscount() !== null;
}

export function clearSpinDiscountData(): void {
  if (!isBrowser()) return;

  deleteCookie(DISCOUNT_COOKIE_NAME);
  deleteCookie(PENDING_DISCOUNT_COOKIE_NAME);
  deleteCookie(SPIN_ATTEMPTS_COOKIE_NAME);
  clearModalDismissed();
}

export function resetSpinnerData(): void {
  clearSpinDiscountData();
}

export function getSpinDiscount(): number | null {
  return getClaimedDiscount();
}

const generateCheckoutFormKey = (): string => {
  if (!isBrowser()) {
    return 'server-checkout-key';
  }

  const nav = navigator as any;
  const fingerprint = [
    nav.userAgent || '',
    nav.language || '',
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
    new Date().getTimezoneOffset(),
    typeof window !== 'undefined' ? window.location.origin : ''
  ].join('|');

  return CryptoJS.SHA256(fingerprint + '_checkout_form').toString();
};

export function saveCheckoutFormData(formData: any): boolean {
  if (!isBrowser()) return false;

  try {
    const formKey = generateCheckoutFormKey();
    const encryptedData = encryptData(formData);
    setCookie(formKey, encryptedData, 7);
    return true;
  } catch (error) {
    console.error('Error saving checkout form data:', error);
    return false;
  }
}

export function getCheckoutFormData(): any {
  if (!isBrowser()) return null;

  try {
    const formKey = generateCheckoutFormKey();
    const encryptedData = getCookie(formKey);

    if (!encryptedData) return null;

    return decryptData(encryptedData);
  } catch (error) {
    console.error('Error getting checkout form data:', error);
    return null;
  }
}

export function clearCheckoutFormData(): void {
  if (!isBrowser()) return;

  try {
    const formKey = generateCheckoutFormKey();
    deleteCookie(formKey);
  } catch (error) {
    console.error('Error clearing checkout form data:', error);
  }
}
