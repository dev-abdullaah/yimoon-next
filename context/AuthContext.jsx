"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { setAuthToken, getAuthToken, clearAuthToken } from '@/lib/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize session on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    setAuthToken(token);
                    const userData = await authApi.me();
                    setUser(userData.data || userData);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error('Failed to restore session:', error);
                    clearAuthToken();
                    setUser(null);
                    setIsAuthenticated(false);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    /**
     * Exchange credentials for a session.
     *
     * Throws on failure rather than returning `{ success: false }`. A login form
     * has to tell the shopper *which* thing was wrong — an unverified address
     * needs a different next step from a wrong password, and the API
     * distinguishes them with a flag on the error that a bare message would
     * flatten. The thrown error carries that flag, plus the per-field messages.
     */
    const login = useCallback(async (credentials) => {
        const response = await authApi.login(credentials);
        const { user: userData, token } = response.data || response;

        setAuthToken(token);
        setUser(userData);
        setIsAuthenticated(true);

        return userData;
    }, []);

    /**
     * Create an account and sign into it in one step, since the API returns a
     * token with the registration.
     */
    const register = useCallback(async (data) => {
        const response = await authApi.register(data);
        const { user: userData, token } = response.data || response;

        setAuthToken(token);
        setUser(userData);
        setIsAuthenticated(true);

        return userData;
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch (err) {
            console.error('Logout API error:', err);
        } finally {
            clearAuthToken();
            setUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    /**
     * Revoke every token on this account, not just this device's.
     *
     * Unlike `logout`, a failure here is *not* swallowed. The point of this
     * action is that the other devices are signed out; clearing the local token
     * after a request that failed signs the shopper out of this tab while
     * leaving every other session alive, and reports success. That is the one
     * outcome worse than doing nothing — somebody using a lost phone would be
     * told the phone was signed out and it would not be. So the error is thrown
     * and the caller says so.
     *
     * The local session is cleared regardless of what the server answered,
     * because the shopper asked to be signed out here too.
     */
    const logoutAll = useCallback(async () => {
        try {
            await authApi.logoutAll();
        } finally {
            clearAuthToken();
            setUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    /**
     * Adopt a user record the server has just returned.
     *
     * Exposed so a form that saves a change can publish the server's version
     * instead of guessing at it. The value is the API's own record — it is
     * never assembled from the submitted fields — because the server is the
     * only party that knows what it actually stored (a trimmed email, a
     * normalised phone number, a field it ignored).
     *
     * An unauthenticated response clears the session, so a token that has just
     * expired mid-save does not leave a signed-in-looking app behind.
     */
    const applyUser = useCallback((nextUser) => {
        if (!nextUser) {
            clearAuthToken();
            setUser(null);
            setIsAuthenticated(false);
            return;
        }

        setUser(nextUser);
        setIsAuthenticated(true);
    }, []);

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        logoutAll,
        applyUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};