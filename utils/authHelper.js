import CryptoJS from "crypto-js";

// ---------------------------
// Device Fingerprint
// ---------------------------
const generateDeviceFingerprint = () => {
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height + 'x' + screen.pixelDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown',
        navigator.maxTouchPoints || 'unknown',
        typeof InstallTrigger !== 'undefined', // Firefox
        !!window.chrome, // Chrome
        !!window.opr, // Opera
        !!document.documentMode, // IE
        !!window.StyleMedia, // Edge
    ].join('|');

    return CryptoJS.SHA256(fingerprint).toString();
};

// ---------------------------
// Config
// ---------------------------
const CLIENT_SECRET = "SuperSecureClientSecret2025!"; // Replace with ENV var in production
const SESSION_COOKIE_PREFIX = "auth_session_";
const REF_COOKIE_NAME = "session_ref";

// ---------------------------
// Encryption Helpers
// ---------------------------
const encryptAuthData = (data) => {
    const payload = { ...data, deviceId: generateDeviceFingerprint() };
    return CryptoJS.AES.encrypt(JSON.stringify(payload), CLIENT_SECRET).toString();
};

const decryptAuthData = (cipherText) => {
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
const setCookie = (name, value, days = 1) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; Secure; SameSite=Strict`;
};

const getCookie = (name) => {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
};

const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

// ---------------------------
// Session Management
// ---------------------------
const generateSessionKey = () =>
    SESSION_COOKIE_PREFIX + Math.random().toString(36).substring(2, 12);

export const setSecureSession = (userData, rememberMe = false) => {
    try {
        const sessionKey = generateSessionKey();
        const encrypted = encryptAuthData({ user: userData, loginTime: Date.now() });

        setCookie(sessionKey, encrypted, rememberMe ? 30 : 1);
        setCookie(REF_COOKIE_NAME, sessionKey, rememberMe ? 30 : 1);

        return { success: true, sessionKey };
    } catch (err) {
        console.error("Failed to set secure session:", err);
        return { success: false, error: err.message };
    }
};

export const getSecureSession = () => {
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

export const clearSecureSession = () => {
    try {
        const sessionKey = getCookie(REF_COOKIE_NAME);
        if (sessionKey) deleteCookie(sessionKey);
        deleteCookie(REF_COOKIE_NAME);
        return true;
    } catch {
        return false;
    }
};
