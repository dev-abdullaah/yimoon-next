// app/(auth)/forgot-password/page.jsx
'use client';

import React, { useState } from "react";
import Link from "next/link";

const ForgotPass = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const validateEmail = (value) => {
        // Basic email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // Basic phone number validation (10 digits)
        const phoneRegex = /^\d{10}$/;

        if (!value) {
            return "Please enter your email or phone number";
        } else if (!emailRegex.test(value) && !phoneRegex.test(value)) {
            return "Please enter a valid email or phone number";
        }
        return "";
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationError = validateEmail(email);
        setError(validationError);

        if (!validationError) {
            // Here you would typically make an API call to handle password reset
            console.log("Password reset requested for:", email);
            setSubmitted(true);
        }
    };

    return (
        <div>
            <section>
                <h1 className="sr-only">Forgot Password - Reset Access</h1>
                <Link href="/login"
                    type="button"
                    className="hover:text-primary m-5 flex items-center sm:hidden"
                >
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
                    <div className="shadow-custom mx-auto mt-9 max-w-lg rounded-xl px-5 py-6">
                        {submitted ? (
                            <div className="text-center p-4">
                                <h2 className="text-xl font-semibold mb-2">Password Reset Requested</h2>
                                <p className="text-gray-600">
                                    If an account exists with this email/phone, you'll receive a password reset link shortly.
                                </p>
                                <Link
                                    href="/login"
                                    className="mt-4 inline-block bg-primary hover:bg-dark-primary rounded-md py-2 px-4 text-base font-semibold text-white"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="mx-auto flex flex-col gap-5 text-[15px]">
                                <ul className="flex flex-col">
                                    <label className="font-medium pb-[3px]" htmlFor="userName">
                                        Email / Phone Number<span className="text-danger ml-1">*</span>
                                    </label>
                                    <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                        <input
                                            placeholder="Enter Your Email address / Phone Number"
                                            className="outline-0 text-dark-ash w-full false"
                                            type="text"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (error) setError(""); // Clear error when typing
                                            }}
                                            name="userName"
                                        />
                                    </li>
                                    {error && <div className="text-danger text-sm mt-1">{error}</div>}
                                </ul>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-dark-primary rounded-md py-2 text-base font-semibold text-white md:py-3"
                                >
                                    Continue
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>
            <section
                className="Toastify"
                aria-live="polite"
                aria-atomic="false"
                aria-relevant="additions text"
                aria-label="Notifications Alt+T"
            ></section>
        </div>
    );
};

export default ForgotPass;