// utils/authHelper.ts
import CryptoJS from "crypto-js";

// ---------------------------
// Device Fingerprint
// ---------------------------
const generateDeviceFingerprint = (): string => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "server";
    }

    const nav = navigator as any;
    const win = window as any;
    const doc = document as any;

    const fingerprint = [
        nav.userAgent || '',
        nav.language || '',
        typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.pixelDepth}` : '',
        new Date().getTimezoneOffset(),
        nav.hardwareConcurrency || 'unknown',
        nav.deviceMemory || 'unknown',
        nav.maxTouchPoints || 'unknown',
        typeof win.InstallTrigger !== 'undefined', // Firefox
        !!win.chrome, // Chrome
        !!win.opr, // Opera
        !!doc.documentMode, // IE
        !!win.StyleMedia, // Edge
    ].join('|');

    return CryptoJS.SHA256(fingerprint).toString();
};

// ---------------------------
// Config
// ---------------------------
const CLIENT_SECRET = process.env.NEXT_PUBLIC_AUTH_SECRET || "SuperSecureClientSecret2025!";
const SESSION_COOKIE_PREFIX = "auth_session_";
const REF_COOKIE_NAME = "session_ref";

export interface AuthSessionPayload {
    user: any;
    loginTime: number;
    deviceId?: string;
}

// ---------------------------
// Encryption Helpers
// ---------------------------
const encryptAuthData = (data: Record<string, any>): string => {
    const payload = { ...data, deviceId: generateDeviceFingerprint() };
    return CryptoJS.AES.encrypt(JSON.stringify(payload), CLIENT_SECRET).toString();
};

const decryptAuthData = (cipherText: string): AuthSessionPayload | null => {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, CLIENT_SECRET);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        const data = decrypted ? JSON.parse(decrypted) : null;
        if (data && data.deviceId !== generateDeviceFingerprint()) return null; // Device check
        return data;
    } catch {
        return null;
    }
};

// ---------------------------
// Cookie Helpers
// ---------------------------
const setCookie = (name: string, value: string, days: number = 1): void => {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; Secure; SameSite=Strict`;
};

const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
};

const deleteCookie = (name: string): void => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

// ---------------------------
// Session Management
// ---------------------------
const generateSessionKey = (): string =>
    SESSION_COOKIE_PREFIX + Math.random().toString(36).substring(2, 12);

export const setSecureSession = (userData: any, rememberMe: boolean = false): { success: boolean; sessionKey?: string; error?: string } => {
    try {
        const sessionKey = generateSessionKey();
        const encrypted = encryptAuthData({ user: userData, loginTime: Date.now() });

        setCookie(sessionKey, encrypted, rememberMe ? 30 : 1);
        setCookie(REF_COOKIE_NAME, sessionKey, rememberMe ? 30 : 1);

        return { success: true, sessionKey };
    } catch (err: any) {
        console.error("Failed to set secure session:", err);
        return { success: false, error: err?.message || 'Failed to set session' };
    }
};

export const getSecureSession = (): AuthSessionPayload | null => {
    try {
        const sessionKey = getCookie(REF_COOKIE_NAME);
        if (!sessionKey) return null;

        const encrypted = getCookie(sessionKey);
        if (!encrypted) return null;

        return decryptAuthData(encrypted) || null;
    } catch (err) {
        console.error("Failed to get secure session:", err);
        return null;
    }
};

export const clearSecureSession = (): boolean => {
    try {
        const sessionKey = getCookie(REF_COOKIE_NAME);
        if (sessionKey) deleteCookie(sessionKey);
        deleteCookie(REF_COOKIE_NAME);
        return true;
    } catch {
        return false;
    }
};
