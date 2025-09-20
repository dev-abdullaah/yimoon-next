// app/(auth)/register/page.jsx
'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from '@tanstack/react-query';
import { BASE_URL, GOOGLE_CLIENT_ID } from '@/lib/config';
import { getOrFetchToken } from '@/utils/tokenService';
import EyeIcon from "@/components/Icons/EyeIcon";
import EyeSlashIcon from "@/components/Icons/EyeSlashIcon";

const Register = () => {
    const router = useRouter();
    // Form state
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: "",
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleInitialized, setGoogleInitialized] = useState(false);
    const [userExists, setUserExists] = useState(null);
    const [userExistsType, setUserExistsType] = useState(null);
    const [formTouched, setFormTouched] = useState({
        phone: false,
        email: false,
        password: false,
        confirmPassword: false
    });
    const [phoneError, setPhoneError] = useState("");

    // Load Google SDK
    useEffect(() => {
        // Check if Google Client ID is available
        if (!GOOGLE_CLIENT_ID) {
            console.error("Google Client ID is not configured");
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
                        use_fedcm_for_prompt: true,
                        itp_support: true,
                        ux_mode: 'popup',
                        locale: 'en'
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

                    setGoogleInitialized(true);
                } catch (error) {
                    console.error("Error initializing Google Sign-In:", error);
                }
            }
        };

        // Load Google SDK script if not already loaded
        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client?hl=en';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.setAttribute('data-use-moved-coop', 'true');
            script.onload = initializeGoogleSignIn;
            script.onerror = () => {
                console.error("Failed to load Google Sign-In script");
            };
            document.body.appendChild(script);
        } else {
            initializeGoogleSignIn();
        }
    }, []); // Empty dependency array - only run once on mount

    // Phone number validation
    const validatePhoneNumber = (phone) => {
        const regex = /^(013|014|015|016|017|018|019)\d{8}$/;
        return regex.test(phone);
    };

    // Email validation
    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    // Password validation
    const validatePassword = (password) => {
        return password.length >= 8;
    };

    // Check if user exists - only using email or phone
    const checkUserExists = async ({ email, phone }) => {
        const token = await getOrFetchToken();
        if (!token) throw new Error("Authentication token not found");

        const formData = new FormData();
        formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
        formData.append('token', token);
        formData.append('com', 'Dataexpert');
        formData.append('action', 'fetchFromModel');
        formData.append('method', 'find');
        formData.append('sourcename', 'admentry');

        let condition = '';
        if (email) {
            condition = `email="${email}"`;
        } else if (phone) {
            condition = `phoneno="${phone}"`;
        } else {
            throw new Error("Either email or phone must be provided");
        }

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
        if (result.status === "1" && result.data) {
            return result.data;
        } else {
            return null; // User not found
        }
    };

    // Register user mutation
    const useRegisterUser = () => {
        return useMutation({
            mutationFn: async ({
                fname,
                lname,
                phoneno,
                email,
                password,
                googleId,
                googleAccessToken
            }) => {
                const token = await getOrFetchToken();
                if (!token) throw new Error("Authentication token not found");

                const formData = new FormData();
                formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
                formData.append('token', token);
                formData.append('com', 'Admission');
                formData.append('action', 'createPerson');
                formData.append('branchcode', '101');
                formData.append('department', '13');
                formData.append('remark', 'Registration');
                formData.append('fname', fname);
                formData.append('lname', lname);
                formData.append('phoneno', phoneno);
                formData.append('email', email);

                // Only add password if it's a regular registration
                if (password) {
                    formData.append('password', password);
                }

                // Prepare userattributes object
                const userAttributes = {
                    attributestitles: {},
                    attributes: {}
                };

                // Add Google attributes if available
                if (googleId) {
                    userAttributes.attributestitles["6"] = "GOOGLE_ID";
                    userAttributes.attributes["6"] = googleId;
                }
                if (googleAccessToken) {
                    userAttributes.attributestitles["5"] = "GOOGLE_TOKEN";
                    userAttributes.attributes["5"] = googleAccessToken;
                }

                // Always append userattributes (even if empty)
                formData.append('userattributes', JSON.stringify(userAttributes));

                const response = await fetch(`${BASE_URL}/exchange`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData?.message || 'Registration failed');
                }

                const result = await response.json();
                // Check if registration was successful
                if (result.status === "1" && result.state === "100" && result.id) {
                    return result;
                } else {
                    console.log('Registration API Response:', result);
                    throw new Error(result.message || 'Registration failed - please check your information and try again');
                }
            },
            onSuccess: (data) => {
                console.log('Registration successful:', data);
                if (data.id) {
                    setTimeout(() => {
                        router.push('/login');
                    }, 2000);
                }
            },
            onError: (error) => {
                console.error('Registration failed:', error);
            }
        });
    };

    const { mutate: registerUser, isLoading: registering, isSuccess, isError, error } = useRegisterUser();

    // Handle Google Sign-In - only check by email
    const handleGoogleSignIn = async (response) => {
        setGoogleLoading(true);
        try {
            // Decode the JWT token to get user information
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            // Extract user data from Google response
            const { given_name, family_name, email, sub } = payload;

            // Check if user exists with this email only
            const existingEmailUser = await checkUserExists({ email });
            if (existingEmailUser) {
                // User already exists with this email
                setUserExists(true);
                setUserExistsType('email');
                setErrors({
                    google: 'An account with this email already exists. Please login instead.'
                });
                // Redirect to login after a delay
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
                return;
            }

            // User doesn't exist, proceed with registration
            registerUser({
                fname: given_name || '',
                lname: family_name || '',
                email: email,
                phoneno: '',
                password: '',
                googleId: sub,
                googleAccessToken: response.credential
            });
        } catch (error) {
            console.error('Google Sign-In error:', error);
            setErrors({
                google: error.message || 'Google registration failed. Please try again or use email registration.'
            });
        } finally {
            setGoogleLoading(false);
        }
    };

    // Handle input changes with real-time validation
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value || ''
        }));

        // Mark field as touched when user interacts with it
        if (!formTouched[name]) {
            setFormTouched(prev => ({
                ...prev,
                [name]: true
            }));
        }

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }

        // Reset user existence check when form data changes
        if (userExists) {
            setUserExists(null);
            setUserExistsType(null);
        }
    };

    // Handle phone number input with formatting and validation
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11); // Remove non-digits and limit to 11 digits
        setFormData(prev => ({
            ...prev,
            phone: value
        }));

        // Real-time validation
        if (value && !validatePhoneNumber(value)) {
            setPhoneError("Please enter a valid phone number");
        } else {
            setPhoneError("");
        }

        // Mark field as touched when user interacts with it
        if (!formTouched.phone) {
            setFormTouched(prev => ({
                ...prev,
                phone: true
            }));
        }

        // Clear error when user types
        if (errors.phone) {
            setErrors(prev => ({
                ...prev,
                phone: ""
            }));
        }
    };

    // Validation functions
    const validateStep1 = () => {
        const newErrors = {};
        if (!formData.username.trim()) {
            newErrors.username = "Email or phone number is required";
        } else {
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.username);
            const isPhone = validatePhoneNumber(formData.username);
            if (!isEmail && !isPhone) {
                newErrors.username = "Please enter a valid email or phone number";
            }
        }
        return newErrors;
    };

    const validateStep2 = () => {
        const newErrors = {};
        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        }
        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!validateEmail(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }
        // Phone validation
        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required";
        } else if (!validatePhoneNumber(formData.phone)) {
            newErrors.phone = "Please enter a valid phone number";
        }
        // Password validation
        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (!validatePassword(formData.password)) {
            newErrors.password = "Password must be at least 8 characters";
        }
        // Confirm password validation
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }
        return newErrors;
    };

    // Handle form submission for each step
    const handleStep1Submit = async (e) => {
        e.preventDefault();
        const stepErrors = validateStep1();
        if (Object.keys(stepErrors).length === 0) {
            // Check if user exists with this username (email or phone)
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.username);
            try {
                const existingUser = await checkUserExists({
                    email: isEmail ? formData.username : undefined,
                    phone: isEmail ? undefined : formData.username
                });
                if (existingUser) {
                    // User already exists
                    setUserExists(true);
                    setUserExistsType(isEmail ? 'email' : 'phone');
                    setErrors({
                        username: `An account with this ${isEmail ? 'email' : 'phone number'} already exists. Please login instead.`
                    });
                    return;
                }
                // Pre-fill email or phone based on username
                setFormData(prev => ({
                    ...prev,
                    email: isEmail ? prev.username : '',
                    phone: isEmail ? '' : prev.username
                }));
                setStep(2);
            } catch (error) {
                console.error('Error checking user existence:', error);
                setErrors({
                    general: error.message || 'Failed to check user existence. Please try again.'
                });
            }
        } else {
            setErrors(stepErrors);
        }
    };

    // Process name into first and last name
    const processName = (name) => {
        const nameParts = name.trim().split(/\s+/);
        return {
            fname: nameParts[0] || "",
            lname: nameParts.slice(1).join(" ") || ""
        };
    };

    const handleStep2Submit = async (e) => {
        e.preventDefault();
        const stepErrors = validateStep2();
        if (Object.keys(stepErrors).length === 0) {
            try {
                // Check if user exists with this email
                const existingEmailUser = await checkUserExists({ email: formData.email });
                if (existingEmailUser) {
                    setUserExists(true);
                    setUserExistsType('email');
                    setErrors({
                        email: 'An account with this email already exists. Please login instead.'
                    });
                    return;
                }
                // Check if user exists with this phone
                const existingPhoneUser = await checkUserExists({ phone: formData.phone });
                if (existingPhoneUser) {
                    setUserExists(true);
                    setUserExistsType('phone');
                    setErrors({
                        phone: 'An account with this phone number already exists. Please login instead.'
                    });
                    return;
                }
                // User doesn't exist, proceed with registration
                const { fname, lname } = processName(formData.name);
                registerUser({
                    fname,
                    lname,
                    email: formData.email,
                    phoneno: formData.phone,
                    password: formData.password
                });
            } catch (error) {
                console.error('Error checking user existence:', error);
                setErrors({
                    general: error.message || 'Failed to check user existence. Please try again.'
                });
            }
        } else {
            setErrors(stepErrors);
        }
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Toggle confirm password visibility
    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    // Header component to avoid repetition
    const FormHeader = () => (
        <div className="list-none text-center space-x-3 sm:space-x-7">
            <Link href="/login" className="w-full">
                <button
                    type="button"
                    className="capitalize text-xl md:text-2xl font-semibold rounded-md w-full max-w-[120px] md:max-w-[180px] min-h-[40px] md:min-h-[48px] border-2 border-dark-ash text-dark-ash"
                >
                    Login
                </button>
            </Link>
            <Link href="/register" className="w-full">
                <button
                    type="button"
                    className="capitalize text-xl md:text-2xl font-semibold rounded-md w-full max-w-[120px] md:max-w-[180px] min-h-[40px] md:min-h-[48px] bg-primary text-white"
                >
                    Register
                </button>
            </Link>
        </div>
    );

    return (
        <div>
            <section>
                <h1 className="sr-only">Register - Create Your Account</h1>
                <Link href="/" className="hover:text-primary m-5 flex items-center sm:hidden">
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        strokeWidth="2"
                        stroke="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 19.5L8.25 12l7.5-7.5"
                        />
                    </svg>{" "}
                    Back
                </Link>
                <div className="absolute top-20 left-1/2 w-full max-w-lg -translate-x-1/2 px-5">
                    <div className="flex justify-center">
                        <div className="flex items-center">
                            <Link href="/">
                                <img
                                    src="/resources/images/logo.png"
                                    alt="Logo"
                                    style={{ width: 180, height: 60, borderRadius: 10 }}
                                />
                            </Link>
                        </div>
                    </div>
                    {/* Step 1: Email/Phone Input */}
                    {step === 1 && (
                        <div className="shadow-custom mx-auto mt-9 max-w-lg rounded-xl px-5 py-6">
                            <FormHeader />
                            <hr className="border-t border-primary my-5" />
                            <form onSubmit={handleStep1Submit} className="mx-auto flex flex-col gap-5 text-[15px]">
                                <div className="flex flex-col">
                                    <label className="font-medium pb-[3px]" htmlFor="username">
                                        Email / Phone Number<span className="text-danger ml-1">*</span>
                                    </label>
                                    <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                        <input
                                            placeholder="Enter Your Email address / Phone Number"
                                            className="outline-0 text-dark-ash w-full"
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {errors.username && <div className="text-danger text-sm mt-1">{errors.username}</div>}
                                </div>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-dark-primary rounded-md py-2 text-base font-semibold text-white md:py-3"
                                >
                                    Continue
                                </button>
                                {/* Google Sign-In Button */}
                                <div className="flex flex-col">
                                    <div id="googleSignInButton" className="w-full flex justify-center"></div>
                                    {googleLoading && (
                                        <div className="text-center mt-2">
                                            <span className="text-primary">Processing Google Sign-In...</span>
                                        </div>
                                    )}
                                    {errors.google && (
                                        <div className="text-danger text-sm mt-2 text-center">{errors.google}</div>
                                    )}
                                </div>
                            </form>
                            {isSuccess && (
                                <div className="mt-4 p-3 text-success rounded-md">
                                    Registration successful! Redirecting to login...
                                </div>
                            )}
                            {errors.general && (
                                <div className="mt-4 p-3 text-primary rounded-md">
                                    {errors.general}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Step 2: Complete Registration */}
                    {step === 2 && (
                        <div className="shadow-custom mx-auto mt-9 max-w-lg rounded-xl px-5 py-6">
                            <FormHeader />
                            <hr className="border-t border-primary my-5" />
                            <form onSubmit={handleStep2Submit} className="text-[15px] flex flex-col gap-5 mx-auto">
                                <div className="flex flex-col">
                                    <label className="font-medium pb-[3px]" htmlFor="name">
                                        Name<span className="text-danger ml-1">*</span>
                                    </label>
                                    <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                        <input
                                            placeholder="Enter Your Name"
                                            className="outline-0 text-dark-ash w-full"
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {errors.name && <div className="text-danger text-sm mt-1">{errors.name}</div>}
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-medium pb-[3px]" htmlFor="email">
                                        Email<span className="text-danger ml-1">*</span>
                                    </label>
                                    <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                        <input
                                            placeholder="Enter Your Email"
                                            className="outline-0 text-dark-ash w-full"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            onBlur={() => setFormTouched(prev => ({ ...prev, email: true }))}
                                        />
                                    </div>
                                    {formTouched.email && formData.email && !validateEmail(formData.email) && (
                                        <div className="text-danger text-sm">
                                            Please enter a valid email address
                                        </div>
                                    )}
                                    {errors.email && <div className="text-danger text-sm mt-1">{errors.email}</div>}
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-medium pb-[3px]" htmlFor="phone">
                                        Phone Number<span className="text-danger ml-1">*</span>
                                    </label>
                                    <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                        <input
                                            placeholder="Enter Your Phone Number"
                                            className="outline-0 text-dark-ash w-full"
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            onBlur={() => setFormTouched(prev => ({ ...prev, phone: true }))}
                                        />
                                    </div>
                                    {phoneError && <div className="text-danger text-sm mt-1">{phoneError}</div>}
                                    {errors.phone && <div className="text-danger text-sm mt-1">{errors.phone}</div>}
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-medium pb-[3px]" htmlFor="password">
                                        Password<span className="text-danger ml-1">*</span>
                                    </label>
                                    <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                        <input
                                            placeholder="Password"
                                            className="outline-0 text-dark-ash w-full"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            onBlur={() => setFormTouched(prev => ({ ...prev, password: true }))}
                                        />
                                        <button
                                            aria-label="toggle-button"
                                            type="button"
                                            onClick={togglePasswordVisibility}
                                        >
                                            {showPassword ? (
                                                <EyeIcon />
                                            ) : (
                                                <EyeSlashIcon />
                                            )}
                                        </button>
                                    </div>
                                    {formTouched.password && formData.password && !validatePassword(formData.password) && (
                                        <div className="text-danger text-sm">
                                            Password must be at least 8 characters
                                        </div>
                                    )}
                                    {errors.password && <div className="text-danger text-sm mt-1">{errors.password}</div>}
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-medium pb-[3px]" htmlFor="confirmPassword">
                                        Confirm Password<span className="text-danger ml-1">*</span>
                                    </label>
                                    <div className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                        <input
                                            placeholder="Confirm Password"
                                            className="outline-0 text-dark-ash w-full"
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            onBlur={() => setFormTouched(prev => ({ ...prev, confirmPassword: true }))}
                                        />
                                        <button
                                            aria-label="toggle-button"
                                            type="button"
                                            onClick={toggleConfirmPasswordVisibility}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeIcon />
                                            ) : (
                                                <EyeSlashIcon />
                                            )}
                                        </button>
                                    </div>
                                    {formTouched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                        <div className="text-danger text-sm">
                                            Passwords do not match
                                        </div>
                                    )}
                                    {errors.confirmPassword && <div className="text-danger text-sm mt-1">{errors.confirmPassword}</div>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={registering}
                                    className="bg-primary hover:bg-dark-primary text-white rounded-md py-2 md:py-3 text-base font-semibold disabled:bg-gray-400"
                                >
                                    {registering ? "Processing..." : "Finish"}
                                </button>
                            </form>
                            {isError && (
                                <div className="mt-4 p-3 text-primary rounded-md">
                                    {error?.message || "Registration failed. Please try again."}
                                </div>
                            )}
                            {isSuccess && (
                                <div className="mt-4 p-3 text-success rounded-md">
                                    Registration successful! Redirecting to login...
                                </div>
                            )}
                            {errors.general && (
                                <div className="mt-4 p-3 text-primary rounded-md">
                                    {errors.general}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Register;