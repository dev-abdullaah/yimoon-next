// app/(auth)/login/page.jsx
'use client';

import React, { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { BASE_URL, GOOGLE_CLIENT_ID } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';
import EyeIcon from "@/components/Icons/EyeIcon";
import EyeSlashIcon from "@/components/Icons/EyeSlashIcon";

const Login = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [formData, setFormData] = useState({
        mobileNo: "",
        password: ""
    });
    const [errors, setErrors] = useState({});
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
    const [googleError, setGoogleError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Get the intended destination from URL parameter or default to home
    const from = searchParams.get('from') || '/';

    // Load Google SDK
    useEffect(() => {
        // Check if Google Client ID is available
        if (!GOOGLE_CLIENT_ID) {
            console.error("Google Client ID is not configured");
            setGoogleError("Google Sign-In is not configured properly");
            return;
        }

        // Initialize Google Sign-In
        const initializeGoogleSignIn = () => {
            if (window.google && window.google.accounts) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: handleGoogleSignIn,
                        auto_select: false,
                        ux_mode: 'popup',
                        use_fedcm_for_prompt: true
                    });

                    // Render Google Sign-In button
                    const button = document.getElementById("googleSignInButton");
                    if (button) {
                        // Clear any existing content
                        button.innerHTML = '';

                        window.google.accounts.id.renderButton(
                            button,
                            {
                                theme: "outline",
                                size: "large",
                                text: "continue_with",
                                locale: 'en',
                                type: "standard",
                                shape: "rectangular"
                            }
                        );
                    }
                    setGoogleScriptLoaded(true);
                    setGoogleError("");
                } catch (error) {
                    console.error("Error initializing Google Sign-In:", error);
                    setGoogleError("Failed to initialize Google Sign-In");
                }
            }
        };

        // Load Google SDK script if not already loaded
        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                // Wait for script to be fully loaded and parsed
                setTimeout(initializeGoogleSignIn, 300);
            };
            script.onerror = () => {
                console.error("Failed to load Google Sign-In script");
                setGoogleError("Failed to load Google Sign-In. Please check your connection.");
            };
            document.head.appendChild(script);
        } else {
            // If already loaded, initialize immediately
            setTimeout(initializeGoogleSignIn, 100);
        }

        return () => {
            // Cleanup if needed
        };
    }, []);

    // Phone number validation
    const validatePhoneNumber = (phone) => {
        const regex = /^(013|014|015|016|017|018|019)\d{8}$/;
        return regex.test(phone);
    };

    // Login mutation with your actual API
    const loginMutation = useMutation({
        mutationFn: async ({ username, password, googleId, googleAccessToken }) => {
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            // If using Google login, handle differently
            if (googleId) {
                // First, try to find user by email
                const formData = new FormData();
                formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
                formData.append('token', token);
                formData.append('com', 'Dataexpert');
                formData.append('action', 'fetchFromModel');
                formData.append('method', 'find');
                formData.append('sourcename', 'admentry');
                formData.append('condition', `email="${username}"`);

                const response = await fetch(`${BASE_URL}/exchange`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData?.message || 'Network error occurred');
                }

                const result = await response.json();

                if (result.status === "1" && result.data === false) {
                    throw new Error('No account found with this Google account');
                }

                if (result.status !== "1" || !result.data) {
                    throw new Error('Authentication failed with Google account.');
                }

                // Check if user has Google ID in attributes
                let userAttributes = {};
                if (result.data.userattributes) {
                    try {
                        userAttributes = typeof result.data.userattributes === 'string'
                            ? JSON.parse(result.data.userattributes)
                            : result.data.userattributes;
                    } catch (e) {
                        console.error('Error parsing user attributes:', e);
                        throw new Error('Failed to verify Google account. Please contact support.');
                    }
                }

                // Verify Google ID matches
                if (!userAttributes.attributes || !userAttributes.attributes["6"] || userAttributes.attributes["6"] !== googleId) {
                    throw new Error('Google account not associated with this user. Please use a different login method.');
                }

                // Check account status
                if (result.data.status !== 'Active') {
                    throw new Error('Your account is not active. Please contact support.');
                }

                return result.data;
            } else {
                // Regular email/phone login
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
                const condition = isEmail
                    ? `email="${username}"`
                    : `phoneno="${username}"`;

                const formData = new FormData();
                formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
                formData.append('token', token);
                formData.append('com', 'Dataexpert');
                formData.append('action', 'fetchFromModel');
                formData.append('method', 'find');
                formData.append('sourcename', 'admentry');
                formData.append('condition', condition);

                const response = await fetch(`${BASE_URL}/exchange`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData?.message || 'Network error occurred');
                }

                const result = await response.json();

                if (result.status === "1" && result.data === false) {
                    const fieldType = isEmail ? 'email address' : 'phone number';
                    throw new Error(`Account not found with this ${fieldType}`);
                }

                if (result.status !== "1" || !result.data) {
                    throw new Error('Authentication failed. Please check your credentials.');
                }

                // Verify password with MD5 hash
                const hashedPassword = CryptoJS.MD5(password).toString();
                if (hashedPassword !== result.data.password) {
                    // Add delay for failed attempts to prevent brute force
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    throw new Error('Invalid password');
                }

                // Check account status
                if (result.data.status !== 'Active') {
                    throw new Error('Your account is not active. Please contact support.');
                }

                return result.data;
            }
        },
        onSuccess: async (userData) => {
            try {
                // Prepare user session data
                const userSession = {
                    id: userData.id.toString(),
                    fname: userData.fname,
                    lname: userData.lname,
                    email: userData.email,
                    phoneno: userData.phoneno,
                    status: userData.status,
                    lastLoginTime: new Date().toISOString()
                };

                // Use auth context to login
                const loginResult = await login(userSession, rememberMe);
                if (loginResult.success) {
                    // Show success message under buttons instead of toast
                    setSuccessMessage('Login successful!');
                    // Navigate to the intended destination after a brief delay
                    setTimeout(() => {
                        router.push(from);
                    }, 2000);
                } else {
                    throw new Error(loginResult.error || 'Failed to establish secure session');
                }
            } catch (error) {
                console.error('Post-login processing failed:', error);
                toast.error('Login process failed. Please try again.');
            }
        },
        onError: (error) => {
            console.error('Login failed:', error);
            let errorMessage = 'Login failed. Please try again.';

            if (error.message.includes('not found')) {
                errorMessage = error.message;
            } else if (error.message.includes('Invalid password')) {
                errorMessage = 'Incorrect password. Please check and try again.';
            } else if (error.message.includes('not active')) {
                errorMessage = error.message;
            } else if (error.message.includes('Network')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('Google account not associated')) {
                errorMessage = 'This Google account is not linked to any user. Please register first.';
            }

            toast.error(errorMessage);
            // Clear success message on error
            setSuccessMessage("");
        }
    });

    // Handle Google Sign-In
    const handleGoogleSignIn = async (response) => {
        setGoogleLoading(true);
        setGoogleError("");
        setSuccessMessage(""); // Clear any previous success message
        try {
            // Decode the JWT token to get user information
            const payload = JSON.parse(atob(response.credential.split('.')[1]));

            // Extract user data from Google response
            const { email, sub } = payload;

            // Login user with Google data
            loginMutation.mutate({
                username: email,
                password: '', // No password for Google sign-in
                googleId: sub,
                googleAccessToken: response.credential
            });
        } catch (error) {
            console.error('Google Sign-In error:', error);
            setGoogleError('Google login failed. Please try again.');
            toast.error('Google login failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setRememberMe(checked);
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value.trim()
            }));

            // Clear error when user types
            if (errors[name]) {
                setErrors(prev => ({
                    ...prev,
                    [name]: ""
                }));
            }
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.mobileNo.trim()) {
            newErrors.mobileNo = "Email or phone number is required";
        } else {
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.mobileNo);
            const isPhone = validatePhoneNumber(formData.mobileNo);
            if (!isEmail && !isPhone) {
                newErrors.mobileNo = "Please enter a valid email or phone number";
            }
        }
        if (!formData.password.trim()) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSuccessMessage(""); // Clear any previous success message
        const formErrors = validateForm();
        if (Object.keys(formErrors).length === 0) {
            loginMutation.mutate({
                username: formData.mobileNo,
                password: formData.password
            });
        } else {
            setErrors(formErrors);
        }
    };

    return (
        <div>
            <section>
                <h1 className="sr-only">Secure Login - Access Your Account</h1>
                <Link href="/" className="hover:text-primary m-5 flex items-center sm:hidden">
                    <svg width="24" height="24" viewBox="0 0 24 24" className="h-4 w-4" fill="none" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    Back
                </Link>
                <div className="absolute top-20 left-1/2 w-full max-w-lg -translate-x-1/2 px-5">
                    <div className="flex justify-center">
                        <div className="flex items-center">
                            <Link href="/">
                                <img src="/resources/images/logo.png" alt="Logo" style={{ width: 180, height: 60, borderRadius: 10 }} />
                            </Link>
                        </div>
                    </div>
                    <div className="shadow-custom mx-auto mt-9 max-w-lg rounded-xl px-5 py-6">
                        <div className="list-none text-center space-x-3 sm:space-x-7">
                            <Link className="w-full" href="/login">
                                <button type="button" className="capitalize text-xl md:text-2xl font-semibold rounded-md w-full max-w-[120px] md:max-w-[180px] min-h-[40px] md:min-h-[48px] bg-primary text-white">
                                    Login
                                </button>
                            </Link>
                            <Link className="w-full" href="/register">
                                <button type="button" className="capitalize text-xl md:text-2xl font-semibold rounded-md w-full max-w-[120px] md:max-w-[180px] min-h-[40px] md:min-h-[48px] border-2 border-dark-ash text-dark-ash">
                                    Register
                                </button>
                            </Link>
                        </div>

                        {/* Success Message Display */}
                        {successMessage && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span className="text-green-700 text-sm font-medium">{successMessage}</span>
                                </div>
                            </div>
                        )}

                        <hr className="border-t border-primary my-5" />
                        <form onSubmit={handleSubmit} className="mx-auto flex flex-col gap-5 text-[15px]">
                            <div className="flex flex-col">
                                <label className="font-medium pb-[3px]" htmlFor="mobileNo">
                                    E-mail / Phone Number<span className="text-danger ml-1">*</span>
                                </label>
                                <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                    <input
                                        placeholder="Enter Your E-mail address / Phone number"
                                        className="outline-0 text-dark-ash w-full"
                                        type="text"
                                        name="mobileNo"
                                        value={formData.mobileNo}
                                        onChange={handleInputChange}
                                        disabled={loginMutation.isLoading || googleLoading}
                                        autoComplete="username"
                                    />
                                </div>
                                {errors.mobileNo && <div className="text-danger text-sm mt-1">{errors.mobileNo}</div>}
                            </div>
                            <div className="flex flex-col">
                                <label className="font-medium pb-[3px]" htmlFor="password">
                                    Password<span className="text-danger ml-1">*</span>
                                </label>
                                <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                    <input
                                        placeholder="Enter Your Password"
                                        className="outline-0 text-dark-ash w-full"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        disabled={loginMutation.isLoading || googleLoading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        aria-label="toggle-password-visibility"
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        disabled={loginMutation.isLoading || googleLoading}
                                    >
                                        {showPassword ? (
                                            <EyeIcon />
                                        ) : (
                                            <EyeSlashIcon />
                                        )}
                                    </button>
                                </div>
                                {errors.password && <div className="text-danger text-sm mt-1">{errors.password}</div>}
                            </div>
                            {/* Remember Me and Forgot Password */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={handleInputChange}
                                        disabled={loginMutation.isLoading || googleLoading}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-dark-ash">
                                        Keep me signed in
                                    </label>
                                </div>
                                <Link href="/forgot-password">
                                    <button type="button" className="text-danger hover:text-primary text-sm font-semibold">
                                        Forgot Password?
                                    </button>
                                </Link>
                            </div>
                            <button
                                type="submit"
                                disabled={loginMutation.isLoading || googleLoading}
                                className="bg-primary hover:bg-dark-primary rounded-md py-2 text-base font-semibold text-white md:py-3 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {loginMutation.isLoading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in securely...
                                    </span>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                            {/* Google Sign-In Button with simple container */}
                            <div className="flex flex-col">
                                <div
                                    id="googleSignInButton"
                                    className="w-full flex justify-center"
                                ></div>
                                {googleError && (
                                    <div className="text-danger text-sm mt-2 text-center p-2 bg-red-50 rounded">
                                        {googleError}
                                        <div className="text-xs mt-1">
                                            Please check your Google OAuth configuration.
                                        </div>
                                    </div>
                                )}
                                {googleLoading && (
                                    <div className="text-center mt-2">
                                        <span className="text-primary">Processing Google Sign-In...</span>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Login;