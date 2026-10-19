// context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { setAuthToken, getAuthToken, clearAuthToken } from '@/lib/api';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

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
     */
    const login = useCallback(async (credentials: any): Promise<User> => {
        const response = await authApi.login(credentials);
        const { user: userData, token } = response.data || response;

        setAuthToken(token);
        setUser(userData);
        setIsAuthenticated(true);

        return userData;
    }, []);

    /**
     * Create an account and sign into it in one step.
     */
    const register = useCallback(async (data: any): Promise<User> => {
        const response = await authApi.register(data);
        const { user: userData, token } = response.data || response;

        setAuthToken(token);
        setUser(userData);
        setIsAuthenticated(true);

        return userData;
    }, []);

    const logout = useCallback(async (): Promise<void> => {
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
     */
    const logoutAll = useCallback(async (): Promise<void> => {
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
     */
    const applyUser = useCallback((nextUser: User | null): void => {
        if (!nextUser) {
            clearAuthToken();
            setUser(null);
            setIsAuthenticated(false);
            return;
        }

        setUser(nextUser);
        setIsAuthenticated(true);
    }, []);

    const value: AuthContextType = {
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
