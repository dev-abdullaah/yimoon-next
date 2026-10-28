// utils/cryptoHelper.ts
import CryptoJS from "crypto-js";

// Helper function to check if we're in the browser
const isBrowser = (): boolean => typeof window !== 'undefined';

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

// Initialize variables with default values for server-side
let SECRET_KEY = 'server-secret-key';

if (isBrowser()) {
  SECRET_KEY = generateSecretKey();
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
