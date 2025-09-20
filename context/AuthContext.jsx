"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setSecureSession, getSecureSession, clearSecureSession } from '@/utils/authHelper';
import { BASE_URL } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';

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
        const session = getSecureSession();
        if (session && session.user) {
            setUser(session.user);
            setIsAuthenticated(true);
        } else {
            clearSecureSession(); // Cleanup invalid session
            setUser(null);
            setIsAuthenticated(false);
        }
        setLoading(false);
    }, []);

    const login = async (userData, rememberMe = false) => {
        try {
            clearSecureSession(); // Clear any existing session
            const result = setSecureSession(userData, rememberMe);

            if (result.success) {
                setUser(userData);
                setIsAuthenticated(true);
                return { success: true };
            } else {
                throw new Error(result.error || 'Failed to create secure session');
            }
        } catch (err) {
            console.error('Login failed:', err);
            return { success: false, error: err.message };
        }
    };

    const logout = () => {
        clearSecureSession();
        setUser(null);
        setIsAuthenticated(false);
        return true;
    };

    // Function to fetch user data by ID
    const fetchUserData = async (userId) => {
        try {
            // Get the token from tokenService
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            const timestamp = Math.floor(Date.now() / 1000);
            const formData = new FormData();
            formData.append('timestamp', timestamp.toString());
            formData.append('token', token);
            formData.append('com', 'Admission');
            formData.append('action', 'fetchPerson');
            formData.append('personid', userId);

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            const result = await response.json();
            if (result.status === "1" && result.data) {
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to fetch user data');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw error;
        }
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        fetchUserData
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};