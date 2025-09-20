'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import { Base64 } from 'js-base64';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { useFloatingCart } from '@/context/CartContext';
import citiesWithAreas from '@/utils/locations.json';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrFetchToken } from '@/utils/tokenService';
import { selectStyles, citySelectStyles, areaSelectStyles } from '@/styles/SelectStyles';
import DeleteIcon from '@/components/Icons/DeleteIcon';
import {
    getSpinDiscount,
    saveCheckoutFormData,
    getCheckoutFormData,
    clearCheckoutFormData,
    clearSpinDiscountData
} from "@/utils/cryptoHelper";

export default function Checkout() {
    const {
        cartItems,
        total,
        evPointTotal,
        formatCurrency,
        removeItemById,
        increaseQty,
        decreaseQty,
        clearCart,
        calculateTotalDiscount
    } = useFloatingCart();

    // Use auth context to get user state
    const { user, isAuthenticated, loading: authLoading, fetchUserData } = useAuth();
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkScreenSize();

        // Add event listener for window resize
        window.addEventListener('resize', checkScreenSize);

        // Cleanup
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // ----------------------
    // Form & Location States
    // ----------------------
    const [formData, setFormData] = useState(() => {
        const savedData = getCheckoutFormData();
        return savedData || {
            recipientName: '',
            contactNumber: '',
            postCode: '',
            paymentMethod: '',
            country: 'Bangladesh',
            city: '',
            region: '',
            addressline2: '',
            address: '',
        };
    });

    const [selectedCityId, setSelectedCityId] = useState(() => {
        const savedData = getCheckoutFormData();
        return savedData?.selectedCityId || null;
    });

    const [selectedAreaId, setSelectedAreaId] = useState(() => {
        const savedData = getCheckoutFormData();
        return savedData?.selectedAreaId || null;
    });

    const [areas, setAreas] = useState([]);
    const [formValid, setFormValid] = useState(false);

    // ----------------------
    // Checkout Steps & Order
    // ----------------------
    const [currentStep, setCurrentStep] = useState(1);
    const [orderPlaced, setOrderPlaced] = useState(false);

    // Set initial shipping charge based on saved city
    const initialCityId = getCheckoutFormData()?.selectedCityId;
    const [shippingCharge, setShippingCharge] = useState(() =>
        parseInt(initialCityId, 10) === 15 ? 80 : 120
    );

    // Update shipping charge when city changes
    useEffect(() => {
        const cityId = parseInt(selectedCityId, 10);
        setShippingCharge(cityId === 15 ? 80 : 120);
    }, [selectedCityId]);

    // ----------------------
    // UI States
    // ----------------------
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [formTouched, setFormTouched] = useState({
        city: false,
        area: false
    });

    // ----------------------
    // Location Select Options
    // ----------------------
    const countryOptions = [{ value: 1, label: "Bangladesh" }];
    const cityOptions = citiesWithAreas.map(city => ({
        value: city.cityId,
        label: city.cityName
    }));

    const areaOptions = areas.map(area => ({
        value: area.areaId,
        label: area.areaName
    }));

    // ----------------------
    // Validation Functions
    // ----------------------
    const validatePhoneNumber = (phone) => {
        const regex = /^(013|014|015|016|017|018|019)\d{8}$/;
        return regex.test(phone);
    };

    const validateName = (name) => {
        if (!name) return false; // Handle undefined/null
        const trimmed = name.trim();
        const regex = /^[a-zA-Z\u00C0-\u017F\s-]{5,30}$/;
        return regex.test(trimmed) && trimmed.length >= 5;
    };

    const validateAddress = (address) => {
        if (!address) return false; // Handle undefined/null
        const trimmed = address.trim();
        if (trimmed.length < 10 || trimmed.length > 50) return false;
        if (!/[a-zA-Z\u0980-\u09FF]{5,}/.test(trimmed)) return false;
        return /^[a-zA-Z0-9\u0980-\u09FF\s,.\-#]+$/.test(trimmed);
    };

    const validatePostCode = (postCode) => {
        if (!postCode) return true; // Optional field
        const numericValue = parseInt(postCode, 10);
        return /^\d{4}$/.test(postCode) &&
            numericValue >= 1000 &&
            numericValue <= 9499;
    };

    const validateForm = () => {
        const isNameValid = validateName(formData.recipientName);
        const isPhoneValid = validatePhoneNumber(formData.contactNumber);
        const isAddressValid = validateAddress(formData.address);
        const isCityValid = selectedCityId !== null;
        const isAreaValid = selectedAreaId !== null;
        const isCountryValid = formData.country === 'Bangladesh';

        return isNameValid && isPhoneValid && isAddressValid && isCityValid && isAreaValid && isCountryValid;
    };

    // ----------------------
    // Effects
    // ----------------------
    useEffect(() => {
        setFormValid(validateForm());
    }, [formData, selectedCityId, selectedAreaId]);

    useEffect(() => {
        if (selectedCityId !== null) {
            const city = citiesWithAreas.find(c => c.cityId === selectedCityId);
            setAreas(city?.areas || []);
            if (!city?.areas.some(a => a.areaId === selectedAreaId)) {
                setSelectedAreaId(null);
            }
        } else {
            setAreas([]);
            setSelectedAreaId(null);
        }
    }, [selectedCityId]);

    // Persistent form data
    useEffect(() => {
        const dataToSave = {
            ...formData,
            selectedCityId,
            selectedAreaId
        };

        // Save to encrypted cookie
        saveCheckoutFormData(dataToSave);
    }, [formData, selectedCityId, selectedAreaId]);

    // ----------------------
    // Utility Functions
    // ----------------------
    // Process name into first and last name
    const processName = (name) => {
        const nameParts = name.trim().split(/\s+/);
        return {
            fname: nameParts[0] || "",
            lname: nameParts.slice(1).join(" ") || ""
        };
    };

    // ----------------------
    // API Mutations
    // ----------------------
    // Register user mutation (for guest checkout)
    const useRegisterGuestUser = () => {
        return useMutation({
            mutationFn: async ({ name, phone, country, city, region, postcode, address }) => {
                const token = await getOrFetchToken();
                if (!token) throw new Error("Authentication token not found");

                const { fname, lname } = processName(name);
                const formData = new FormData();
                formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
                formData.append('token', token);
                formData.append('com', 'Admission');
                formData.append('action', 'createPerson');
                formData.append('branchcode', '101');
                formData.append('department', '13');
                formData.append('remark', 'Guest Registration during checkout');
                formData.append('fname', fname);
                formData.append('lname', lname);
                formData.append('phoneno', phone);
                formData.append('country', 'Bangladesh');
                formData.append('district', city);
                formData.append('region', region);
                formData.append('addressline2', postcode);
                formData.append('address', address);

                // Get city and area names for user attributes
                const cityName = cityOptions.find(c => c.value === parseInt(city))?.label || '';
                const areaName = areaOptions.find(a => a.value === parseInt(region))?.label || '';

                // Create user attributes JSON
                const userAttributes = {
                    attributestitles: {
                        "5": "GOOGLE_TOKEN",
                        "6": "GOOGLE_ID",
                        "16": "NAME",
                        "12": "DISTRICT",
                        "13": "AREA",
                        "14": "POSTCODE",
                        "15": "ADDRESS",
                        "17": "PHONE",
                        "18": "EMAIL"
                    },
                    attributes: {
                        "5": "",
                        "6": "",
                        "16": name,
                        "12": cityName,  // City name/label
                        "13": areaName,  // Area name/label
                        "14": postcode,
                        "15": address,
                        "17": phone,
                        "18": ""
                    }
                };

                // Add user attributes as JSON string
                formData.append('userattributes', JSON.stringify(userAttributes));

                // Log the form data for debugging
                console.log('Sending form data:', {
                    country, city, region, postcode, address, userAttributes
                });

                const response = await fetch(`${BASE_URL}/exchange`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData?.message || 'Guest registration failed');
                }

                const result = await response.json();
                console.log('API Response:', result); // Log the response for debugging

                if (result.status === "1" && result.state === "100" && result.id) {
                    return result;
                } else {
                    console.log('Guest Registration API Response:', result);
                    throw new Error(result.message || 'Guest registration failed');
                }
            }
        });
    };

    // Create invoice mutation hook
    const useCreateInvoice = () => {
        const queryClient = useQueryClient();

        return useMutation({
            mutationFn: async (invoiceData) => {
                const token = await getOrFetchToken();
                if (!token) throw new Error("Authentication token not found");

                const timestamp = Math.floor(Date.now() / 1000);
                const formData = new FormData();

                // Add required fields from the curl example
                formData.append('timestamp', timestamp.toString());
                formData.append('token', token);
                formData.append('com', 'Inventory');
                formData.append('action', 'transportInvoice');
                formData.append('itemmaxid', invoiceData.itemmaxid || '');
                formData.append('stockmaxid', invoiceData.stockmaxid || '');
                formData.append('servertime_lastsync', invoiceData.servertime_lastsync || '');

                // Stringify the invoice head and body as shown in the curl example
                formData.append('invoiceHead', JSON.stringify(invoiceData.invoiceHead));
                formData.append('invoiceBody', JSON.stringify(invoiceData.invoiceBody));

                // Use the appropriate URL based on environment
                const apiUrl = process.env.NODE_ENV === 'development'
                    ? '/api/exchange'  // Use proxy in development
                    : `${BASE_URL}/exchange`;  // Use direct URL in production

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                return await response.json();
            },
            onSuccess: () => {
                // Invalidate any related queries after successful invoice creation
                queryClient.invalidateQueries(['invoices']);
                queryClient.invalidateQueries(['inventory']);
            },
            retry: 2, // Retry twice on failure
        });
    };

    const registerGuestUserMutation = useRegisterGuestUser();
    const createInvoiceMutation = useCreateInvoice();

    // ----------------------
    // Handlers
    // ----------------------
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value || ''
        }));
    };

    const handleClearForm = () => {
        setFormData({
            recipientName: '',
            contactNumber: '',
            address: '',
            postCode: '',
            paymentMethod: '',
            country: 'Bangladesh',
            city: '',
            region: '',
            addressline2: ''
        });

        setSelectedCityId(null);
        setSelectedAreaId(null);
        setAreas([]);

        // Clear encrypted cookie data
        clearCheckoutFormData();

        // Reset form touched state
        setFormTouched({
            city: false,
            area: false
        });

        setCurrentStep(1);
        setShowClearConfirm(false);

        // Force form validation after reset
        setTimeout(() => {
            setFormValid(validateForm());
        }, 0);
    };

    useEffect(() => {
        setFormValid(validateForm());
    }, [formData, selectedCityId, selectedAreaId]);

    const handleSubmitStep1 = (e) => {
        e.preventDefault();
        setFormTouched({
            city: true,
            area: true
        });

        if (!validateForm()) return;
        setCurrentStep(2);
    };

    const handleSubmitStep2 = (e) => {
        e.preventDefault();
        setCurrentStep(3);
    };

    // Calculate base values (keep them separate for display)
    const subTotal = cartItems.reduce((sum, item) => sum + (item.qty * item.originalPrice), 0);
    const totalDiscount = calculateTotalDiscount(cartItems);
    const spinDiscount = getSpinDiscount();

    // Calculate grandTotal with conditional spin discount
    let grandTotal = total + (currentStep > 1 ? shippingCharge : 0);

    // Apply spin discount only if it exists and is a valid number
    if (spinDiscount && !isNaN(spinDiscount)) {
        grandTotal = Math.max(0, grandTotal - spinDiscount); // Ensure total doesn't go negative
    }

    // Subtract evPointTotal if it exists and is a valid number
    if (evPointTotal && !isNaN(evPointTotal)) {
        grandTotal = Math.max(0, grandTotal - evPointTotal); // Ensure total doesn't go negative
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        try {
            let customerId;

            // If user is logged in, use their ID
            if (isAuthenticated && user?.id) {
                customerId = user.id;
            } else {
                // Register guest user and get their ID
                toast.loading('Creating guest account...');

                // Send IDs for the main fields
                const cityId = selectedCityId || '';
                const areaId = selectedAreaId || '';
                const postcode = formData.postCode || '';

                console.log('Sending data for guest registration:', {
                    name: formData.recipientName,
                    phone: formData.contactNumber,
                    country: 'Bangladesh',
                    cityId: cityId,
                    areaId: areaId,
                    postcode: postcode,
                    address: formData.address
                });

                const guestUserResult = await registerGuestUserMutation.mutateAsync({
                    name: formData.recipientName,
                    phone: formData.contactNumber,
                    country: 'Bangladesh',
                    city: cityId,
                    region: areaId,
                    postcode: postcode,
                    address: formData.address
                });

                customerId = guestUserResult.id;
                toast.dismiss();
                toast.success('Guest account created successfully!');
            }

            // Prepare shipping information for the remark field
            const shippingInfo = {
                recipientName: formData.recipientName,
                contactNumber: formData.contactNumber,
                address: formData.address,
                city: cityOptions.find(c => c.value === selectedCityId)?.label,
                area: areaOptions.find(a => a.value === selectedAreaId)?.label,
                postCode: formData.postCode,
                shippingCharge: shippingCharge,
                customerType: isAuthenticated ? 'Registered' : 'Guest'
            };

            // Calculate combined discount for API only
            const combinedDiscount = totalDiscount + (spinDiscount && !isNaN(spinDiscount)
                ? parseFloat(spinDiscount) : 0) + (evPointTotal && !isNaN(evPointTotal)
                    ? parseFloat(evPointTotal) : 0);

            // Prepare invoice data
            const invoiceData = {
                itemmaxid: "",
                stockmaxid: "",
                servertime_lastsync: "",
                invoiceHead: {
                    type: formData.paymentMethod === "Cash" ? "Cash" : "Cash",
                    customerid: customerId.toString(),
                    fkey: `INV-${Date.now()}`,
                    fkeytype: "izoldi",
                    status: "Processing",
                    received: "0",
                    otherpaymentreceived: "",
                    otherpaymentreceivedlist: "",
                    returned: "",
                    discount: combinedDiscount.toString(),
                    servicecharge: shippingCharge.toString(),
                    adjustment: "0",
                    cashreceived: "0",
                    creditreceived: "0",
                    remark: Base64.encode(JSON.stringify(shippingInfo)),
                    entrydate: new Date().toISOString().replace('T', ' ').substring(0, 19)
                },
                invoiceBody: cartItems.map(item => ({
                    id: item.id.toString(),
                    discount: "0",
                    unitsalesprice: item.price.toString(),
                    discountmethod: "",
                    additionals: "",
                    storeid: "1",
                    qty: item.qty.toString()
                }))
            };

            // Submit the invoice
            const result = await createInvoiceMutation.mutateAsync(invoiceData);

            console.log('Invoice created successfully:', result);

            // Show success message
            toast.success('Order placed successfully!');

            setOrderPlaced(true);
            clearCart();
            clearSpinDiscountData();

        } catch (error) {
            console.error('Failed to place order:', error);
            toast.error(error.message || 'Failed to place order. Please try again.');
        }
    };

    // Add a ref to track if we've already populated the shipping info
    const populatedRef = React.useRef(false);

    // Update the useEffect to prevent multiple executions
    useEffect(() => {
        const populateShippingInfo = async () => {
            // Only populate if we haven't done it already
            if (populatedRef.current) return;

            if (isAuthenticated && user?.id) {
                try {
                    // Fetch user data using the fetchUserData function from the context
                    const userData = await fetchUserData(user.id);

                    // Parse user attributes if available
                    let userAttributes = {};
                    if (userData.userattributes) {
                        try {
                            userAttributes = JSON.parse(userData.userattributes);
                        } catch (e) {
                            console.error('Error parsing user attributes:', e);
                        }
                    }

                    // Extract address information from user attributes
                    const { attributes = {} } = userAttributes;
                    const name = attributes["16"] || '';
                    const district = attributes["12"] || '';
                    const area = attributes["13"] || '';
                    const postcode = attributes["14"] || '';
                    const address = attributes["15"] || '';
                    const phone = attributes["17"] || userData.phoneno || '';

                    // Find city in citiesWithAreas by cityName (district)
                    const cityData = citiesWithAreas.find(c => c.cityName === district);

                    // Find area in the city's areas by areaName
                    let areaData = null;
                    if (cityData) {
                        areaData = cityData.areas.find(a => a.areaName === area);
                    }

                    // Update form data
                    setFormData(prev => ({
                        ...prev,
                        recipientName: name || `${userData.fname} ${userData.lname}`.trim(),
                        contactNumber: phone,
                        postCode: postcode,
                        address: address,
                        country: 'Bangladesh'
                    }));

                    // Set selected city and area IDs
                    if (cityData) {
                        setSelectedCityId(cityData.cityId);
                        // Set areas for the selected city
                        setAreas(cityData.areas);

                        if (areaData) {
                            setSelectedAreaId(areaData.areaId);
                        }
                    }

                    console.log('Shipping info populated from user data');
                    console.log('City found:', cityData);
                    console.log('Area found:', areaData);
                    populatedRef.current = true; // Mark as populated
                } catch (error) {
                    console.error('Error populating shipping info:', error);
                    toast.error('Failed to load your shipping information');
                }
            }
        };

        populateShippingInfo();
    }, [isAuthenticated, user, fetchUserData]);

    // Reset the ref when user logs out or when the component unmounts
    useEffect(() => {
        if (!isAuthenticated || !user) {
            populatedRef.current = false;
        }
    }, [isAuthenticated, user]);

    // Also reset the ref when the component unmounts
    useEffect(() => {
        return () => {
            populatedRef.current = false;
        };
    }, []);

    // Update the useEffect hooks to store IDs in form data
    useEffect(() => {
        if (selectedCityId !== null) {
            const city = citiesWithAreas.find(c => c.cityId === selectedCityId);
            setAreas(city?.areas || []);
            if (!city?.areas.some(a => a.areaId === selectedAreaId)) {
                setSelectedAreaId(null);
            }

            // Update city in form data with ID
            setFormData(prev => ({
                ...prev,
                city: selectedCityId.toString()
            }));
        } else {
            setAreas([]);
            setSelectedAreaId(null);
            setFormData(prev => ({
                ...prev,
                city: ''
            }));
        }
    }, [selectedCityId]);

    useEffect(() => {
        if (selectedAreaId !== null && areas.length > 0) {
            // Update region in form data with ID
            setFormData(prev => ({
                ...prev,
                region: selectedAreaId.toString()
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                region: ''
            }));
        }
    }, [selectedAreaId, areas]);

    if (cartItems.length === 0 && !orderPlaced) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12">
                <section>
                    <div className="mb-10 2xl:px-20">
                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                            <img
                                alt="empty_cart"
                                loading="lazy"
                                width="100"
                                height="100"
                                className="color-transparent"
                                src="/resources/media/empty-cart.gif"
                                style={{ color: 'transparent' }}
                            />
                            <p className="text-2xl font-bold uppercase">
                                Empty <span className="text-primary">Cart !</span>
                            </p>
                            <p>Please add some products to your cart before checkout</p>
                            <Link
                                href="/"
                                className="bg-primary rounded-md px-6 py-2 font-medium text-white"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (orderPlaced) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12">
                <section>
                    <div className="mb-10 2xl:px-20">
                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                            <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <h2 className="text-2xl font-bold text-gray-800 mt-4">Order Placed Successfully!</h2>
                            <p className="text-gray-600 mt-2">Your order has been received and is being processed.</p>
                            <p className="text-gray-600 mt-1">You will receive a confirmation email shortly.</p>
                            <Link
                                href="/"
                                className="mt-6 inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12">
            <section>
                <h1 className="sr-only">Secure Checkout</h1>

                {/* Progress Steps */}
                <div className="mb-3 2xl:px-20">
                    <div className="flex items-center justify-between">
                        {/* Step indicators */}
                        {[1, 2, 3].map((step) => (
                            <React.Fragment key={step}>
                                <div className={`flex items-center ${currentStep >= step ? 'text-primary' : 'text-gray-400'}`}>
                                    <div className={`rounded-full w-8 h-8 flex items-center justify-center ${currentStep >= step ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                                        {step}
                                    </div>
                                    <span className="ml-2 font-medium">
                                        {step === 1 ? 'Shipping Info' : step === 2 ? 'Review Order' : 'Payment'}
                                    </span>
                                </div>
                                {step < 3 && (
                                    <div className={`flex-1 h-1 mx-2 ${currentStep > step ? 'bg-primary' : 'bg-gray-200'}`}></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Step 1: Shipping Information */}
                {currentStep === 1 && (
                    <div className="mb-10 2xl:px-20">
                        <form onSubmit={handleSubmitStep1} className="grid grid-cols-1 gap-8 xl:grid-cols-3" autoComplete="off">
                            {/* Hidden inputs to prevent autofill */}
                            <input type="text" style={{ display: 'none' }} autoComplete="username" />
                            <input type="password" style={{ display: 'none' }} autoComplete="new-password" />

                            <div className="col-span-1 space-y-5 md:space-y-8 xl:col-span-2">
                                <div className="rounded-default shadow-custom mx-auto flex flex-col gap-2.5 pb-2.5 text-[15px] sm:gap-5 sm:pb-6">
                                    <h2 className="text-dark border-light-white border-b px-3 py-2.5 text-sm font-semibold sm:px-5 sm:py-3 sm:text-lg">
                                        Shipping Information
                                    </h2>
                                    <div className="space-y-2 px-3 sm:px-5">
                                        <ul className="grid grid-cols-1 gap-x-7 gap-y-2 sm:grid-cols-2">
                                            {/* Recipient Name */}
                                            <ul className="flex flex-col">
                                                <label className="font-medium pb-[3px]" htmlFor="recipientName">
                                                    Recipient Name<span className="text-danger ml-1">*</span>
                                                </label>
                                                <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-sm py-1 md:py-1.5 px-2 md:px-2.5">
                                                    <input
                                                        placeholder="Full Name"
                                                        className="outline-0 text-dark-ash w-full"
                                                        type="text"
                                                        name="recipientName"
                                                        value={formData.recipientName || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^a-zA-Z\s-]/g, '');
                                                            handleInputChange({ target: { name: 'recipientName', value } });
                                                        }}
                                                        minLength={2}
                                                        maxLength={50}
                                                        required
                                                    />
                                                </li>
                                                {formData.recipientName && !validateName(formData.recipientName) && (
                                                    <div className="text-danger text-sm">
                                                        {formData.recipientName.length < 5
                                                            ? "Name must be at least 5 characters"
                                                            : "Only letters, spaces, hyphens allowed"}
                                                    </div>
                                                )}
                                            </ul>

                                            {/* Contact Number */}
                                            <ul className="flex flex-col">
                                                <label className="font-medium pb-[3px]" htmlFor="contactNumber">
                                                    Contact Number<span className="text-danger ml-1">*</span>
                                                </label>
                                                <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-sm py-1 md:py-1.5 px-2 md:px-2.5">
                                                    <input
                                                        placeholder="Mobile Number"
                                                        className="outline-0 text-dark-ash w-full"
                                                        type="tel"
                                                        name="contactNumber"
                                                        value={formData.contactNumber}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                            handleInputChange({ target: { name: 'contactNumber', value } });
                                                        }}
                                                        required
                                                    />
                                                </li>
                                                {formData.contactNumber && !validatePhoneNumber(formData.contactNumber) && (
                                                    <div className="text-danger text-sm">
                                                        Please enter a valid mobile number
                                                    </div>
                                                )}
                                            </ul>

                                            {/* Country (disabled) */}
                                            <ul className="flex flex-col">
                                                <label className="font-semibold pb-[3px]" htmlFor="country">
                                                    Country
                                                </label>
                                                <li className="flex gap-4 hover:border-primary bg-white rounded-sm">
                                                    <Select
                                                        id="country"
                                                        name="country"
                                                        options={countryOptions}
                                                        value={countryOptions[0]}
                                                        isDisabled
                                                        styles={selectStyles}
                                                    />
                                                </li>
                                            </ul>

                                            {/* City Selection */}
                                            <ul className="flex flex-col">
                                                <label className="font-semibold pb-[3px]" htmlFor="cityId">
                                                    District/City<span className="text-danger ml-1">*</span>
                                                </label>
                                                <li className="flex gap-4 hover:border-primary bg-white rounded-sm">
                                                    <Select
                                                        id="cityId"
                                                        name="cityId"
                                                        options={cityOptions}
                                                        value={cityOptions.find(option => option.value === selectedCityId) || null}
                                                        onChange={(selected) => {
                                                            setSelectedCityId(selected ? selected.value : null);
                                                            setFormTouched(prev => ({ ...prev, city: true }));
                                                        }}
                                                        onBlur={() => setFormTouched(prev => ({ ...prev, city: true }))}
                                                        placeholder="Select District/City"
                                                        isClearable
                                                        required
                                                        styles={citySelectStyles}
                                                    />
                                                </li>
                                                {formTouched.city && !selectedCityId && (
                                                    <div className="text-danger text-sm">Please select a city</div>
                                                )}
                                            </ul>

                                            {/* Area Selection */}
                                            <ul className="flex flex-col">
                                                <label className="font-semibold pb-[3px]" htmlFor="areaId">
                                                    Area/Thana/Upazilla<span className="text-danger ml-1">*</span>
                                                </label>
                                                <li className="flex gap-4 hover:border-primary bg-white rounded-sm">
                                                    <Select
                                                        id="areaId"
                                                        name="areaId"
                                                        options={areaOptions}
                                                        value={areaOptions.find(option => option.value === selectedAreaId) || null}
                                                        onChange={(selected) => {
                                                            setSelectedAreaId(selected ? selected.value : null);
                                                            setFormTouched(prev => ({ ...prev, area: true }));
                                                        }}
                                                        onBlur={() => setFormTouched(prev => ({ ...prev, area: true }))}
                                                        placeholder="Select Area/Thana/Upazilla"
                                                        isClearable
                                                        isDisabled={!selectedCityId}
                                                        required
                                                        styles={areaSelectStyles}
                                                    />
                                                </li>
                                                {formTouched.area && !selectedAreaId && selectedCityId && (
                                                    <div className="text-danger text-sm">Please select an area</div>
                                                )}
                                            </ul>

                                            {/* Post Code */}
                                            <ul className="flex flex-col">
                                                <label className="font-medium pb-[3px]" htmlFor="postCode">
                                                    Post Code
                                                </label>
                                                <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-sm py-1 md:py-1.5 px-2 md:px-2.5">
                                                    <input
                                                        placeholder="Post Code (1000-9499)"
                                                        className="outline-0 text-dark-ash w-full"
                                                        type="text"
                                                        name="postCode"
                                                        value={formData.postCode}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                            handleInputChange({ target: { name: 'postCode', value } });
                                                        }}
                                                        maxLength={4}
                                                    />
                                                </li>
                                                {formData.postCode && !validatePostCode(formData.postCode) && (
                                                    <div className="text-danger text-sm">
                                                        {!formData.postCode.match(/^\d+$/)
                                                            ? "Post code must contain only numbers"
                                                            : formData.postCode.length !== 4
                                                                ? "Post code must be 4 digits"
                                                                : "Post code must be between 1000-9499"}
                                                    </div>
                                                )}
                                            </ul>
                                        </ul>

                                        {/* Address */}
                                        <ul className="flex flex-col">
                                            <label className="font-medium pb-[3px]" htmlFor="address">
                                                Address<span className="text-danger ml-1">*</span>
                                            </label>
                                            <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-sm py-1 md:py-1.5 px-2 md:px-2.5">
                                                <textarea
                                                    name="address"
                                                    placeholder="House/Building, Road, Area"
                                                    className="outline-0 text-dark-ash w-full min-h-[80px]"
                                                    value={formData.address || ''}
                                                    onChange={handleInputChange}
                                                    minLength={10}
                                                    maxLength={200}
                                                    required
                                                />
                                            </li>
                                            {formData.address && !validateAddress(formData.address) && (
                                                <div className="text-danger text-sm">
                                                    {formData.address.trim().length < 10
                                                        ? "Address must be at least 10 characters"
                                                        : !/[a-zA-Z\u0980-\u09FF]{5,}/.test(formData.address)
                                                            ? "Must contain proper location description"
                                                            : "Only letters, numbers, spaces, and basic punctuation allowed"}
                                                </div>
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Product Items */}
                                <div>
                                    <h2 className="text-dark mb-1 text-sm font-medium sm:mb-2.5 sm:text-lg">
                                        Product Items
                                    </h2>
                                    <div className="space-y-2.5">
                                        {cartItems.map((item, index) => (
                                            <ProductItem
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                formatCurrency={formatCurrency}
                                                decreaseQty={decreaseQty}
                                                increaseQty={increaseQty}
                                                removeItemById={removeItemById}
                                                totalDiscount={totalDiscount}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="col-span-1 w-full">
                                <div className="space-y-5 xl:sticky xl:top-[157px]">
                                    <div className="shadow-custom rounded-default">
                                        <h2 className="text-dark text-sm sm:text-lg font-semibold py-2.5 border-b border-light-white px-3 sm:px-5">
                                            Your Bill
                                        </h2>
                                        <ul className="pb-2.5 sm:pb-5 px-3 sm:px-5">
                                            <div className="mt-3 space-y-3 text-sm">
                                                <li className="flex justify-between">
                                                    <p>Sub-Total</p>
                                                    <p className="flex items-center font-medium">
                                                        {formatCurrency(subTotal)}
                                                    </p>
                                                </li>
                                                {totalDiscount > 0 && (
                                                    <li className="flex justify-between">
                                                        <p>Regular Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(totalDiscount)}
                                                        </p>
                                                    </li>
                                                )}
                                                {evPointTotal > 0 && (
                                                    <li className="flex justify-between">
                                                        <p>EV Points Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(evPointTotal)}
                                                        </p>
                                                    </li>
                                                )}
                                                {spinDiscount && !isNaN(parseFloat(spinDiscount)) && (
                                                    <li className="flex justify-between">
                                                        <p>Spin Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(parseFloat(spinDiscount))}
                                                        </p>
                                                    </li>
                                                )}
                                                <li className="flex justify-between font-bold sm:text-base pt-2 border-t border-light-white">
                                                    <p>Total</p>
                                                    <p className="flex items-center">{formatCurrency(grandTotal)}</p>
                                                </li>
                                            </div>
                                            <button
                                                className={`mt-7 w-full rounded-md py-2 text-lg font-bold ${formValid && cartItems.length > 0
                                                    ? 'bg-primary hover:bg-primary-dark text-white'
                                                    : 'bg-light-white text-light-ash cursor-not-allowed'
                                                    }`}
                                                type="submit"
                                                disabled={!formValid || cartItems.length === 0}
                                            >
                                                Continue to Shipping
                                            </button>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step 2: Review Order */}
                {currentStep === 2 && (
                    <div className="mb-10 2xl:px-20">
                        <form onSubmit={handleSubmitStep2} className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                            <div className="col-span-1 space-y-5 md:space-y-8 xl:col-span-2">
                                <div className="rounded-default shadow-custom mx-auto flex flex-col gap-2.5 pb-2.5 text-[15px] sm:gap-5 sm:pb-6">
                                    <h2 className="text-dark border-light-white border-b px-3 py-2.5 text-sm font-semibold sm:px-5 sm:py-3 sm:text-lg">
                                        Shipping Information
                                    </h2>
                                    <div className="flex items-start text-sm">
                                        <ul className="divide-light-white flex flex-col sm:flex-row sm:divide-x-2">
                                            <li className="space-y-0.5 px-3 whitespace-nowrap sm:px-5">
                                                <p className="text-gray font-normal">
                                                    Name :<span className="text-dark ml-0.5 capitalize">{formData.recipientName}</span>
                                                </p>
                                                <p className="text-gray">
                                                    Phone :<span className="text-dark ml-0.5">{formData.contactNumber}</span>
                                                </p>
                                            </li>
                                            <li className="text-dark space-y-0.5 px-3 sm:px-5">
                                                <p className="truncate-1 md:truncate-2 w-56 capitalize md:w-80 lg:w-[500px]">
                                                    {formData.address}
                                                </p>
                                                <p className="capitalize">
                                                    {(selectedAreaId && areaOptions.find(a => a.value === selectedAreaId)?.label) || ''}
                                                    {(selectedCityId && `, ${cityOptions.find(c => c.value === selectedCityId)?.label}`) || ''}
                                                    {(formData.postCode && `, ${formData.postCode}`) || ''}
                                                    {formData.recipientName || formData.contactNumber ? ', Bangladesh' : ''}
                                                </p>
                                            </li>
                                        </ul>
                                        <div className="flex flex-col items-end gap-2 ms-auto mx-5 w-[100px]">
                                            <button
                                                type="button"
                                                className="w-full text-primary hover:bg-primary ring-primary rounded-md px-2.5 py-1 font-medium ring-1 hover:text-white"
                                                onClick={() => setCurrentStep(1)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="w-full text-danger hover:bg-danger ring-danger rounded-md px-2.5 py-1 font-medium ring-1 hover:text-white"
                                                onClick={() => setShowClearConfirm(true)}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Product Items */}
                                <div>
                                    <h2 className="text-dark mb-1 text-sm font-medium sm:mb-2.5 sm:text-lg">
                                        Product Items
                                    </h2>
                                    <div className="space-y-2.5">
                                        {cartItems.map((item, index) => (
                                            <ProductItem
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                formatCurrency={formatCurrency}
                                                decreaseQty={decreaseQty}
                                                increaseQty={increaseQty}
                                                removeItemById={removeItemById}
                                                totalDiscount={totalDiscount}
                                                reviewMode
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="col-span-1 w-full">
                                <div className="space-y-5 xl:sticky xl:top-[157px]">
                                    <div className="shadow-custom rounded-default">
                                        <h2 className="text-dark text-sm sm:text-lg font-semibold py-2.5 border-b border-light-white px-3 sm:px-5">
                                            Your Bill
                                        </h2>
                                        <ul className="pb-2.5 sm:pb-5 px-3 sm:px-5">
                                            <div className="mt-3 space-y-3 text-sm">
                                                <li className="flex justify-between">
                                                    <p>Sub-Total</p>
                                                    <p className="flex items-center font-medium">
                                                        {formatCurrency(subTotal)}
                                                    </p>
                                                </li>
                                                {totalDiscount > 0 && (
                                                    <li className="flex justify-between">
                                                        <p>Regular Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(totalDiscount)}
                                                        </p>
                                                    </li>
                                                )}
                                                {evPointTotal > 0 && (
                                                    <li className="flex justify-between">
                                                        <p>EV Points Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(evPointTotal)}
                                                        </p>
                                                    </li>
                                                )}
                                                {spinDiscount && !isNaN(parseFloat(spinDiscount)) && (
                                                    <li className="flex justify-between">
                                                        <p>Spin Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(parseFloat(spinDiscount))}
                                                        </p>
                                                    </li>
                                                )}
                                                <li className="flex justify-between">
                                                    <p>Shipping Charge</p>
                                                    <p className="flex items-center font-medium">
                                                        {formatCurrency(shippingCharge)}
                                                    </p>
                                                </li>
                                                <li className="flex justify-between font-bold sm:text-base pt-2 border-t border-light-white">
                                                    <p>Total</p>
                                                    <p className="flex items-center">{formatCurrency(grandTotal)}</p>
                                                </li>
                                            </div>
                                            <button
                                                className={`mt-7 w-full rounded-md py-2 text-lg font-bold ${cartItems.length > 0
                                                    ? 'bg-primary hover:bg-primary-dark text-white'
                                                    : 'bg-light-white text-light-ash cursor-not-allowed'
                                                    }`}
                                                type="submit"
                                                disabled={cartItems.length === 0}
                                            >
                                                Continue to Payment
                                            </button>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step 3: Payment */}
                {currentStep === 3 && (
                    <div className="mb-10 2xl:px-20">
                        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                            <div className="col-span-1 space-y-8 xl:col-span-2">
                                <fieldset className="shadow-custom rounded-default">
                                    <h2
                                        id="payment-method-label"
                                        className="text-dark border-light-white border-b px-3 py-2.5 text-sm font-medium sm:px-5 sm:text-lg"
                                    >
                                        Select Payment Method
                                    </h2>
                                    <div className="px-3 sm:px-5">
                                        <div
                                            role="radiogroup"
                                            aria-labelledby="payment-method-label"
                                            className="divide-light-white divide-y"
                                        >
                                            <label
                                                htmlFor="payment-5"
                                                className="text-dark-ash flex items-center space-x-3.5 py-2.5 text-base md:py-5 cursor-pointer"
                                            >
                                                <input
                                                    id="payment-5"
                                                    className="accent-primary 3xl:w-6 3xl:h-6 h-4 w-4 sm:h-5 sm:w-5"
                                                    type="radio"
                                                    value="Cash"
                                                    checked={formData.paymentMethod === 'Cash'}
                                                    onChange={handleInputChange}
                                                    name="paymentMethod"
                                                />
                                                <div className="border-light-white max-h-[75px] min-w-[150px] overflow-clip rounded-sm border">
                                                    <img
                                                        alt="COD"
                                                        width="140"
                                                        height="70"
                                                        decoding="async"
                                                        className="max-h-[75px] w-full min-w-[50px]"
                                                        src="/resources/media/cash_on_delivery.webp"
                                                        style={{ color: "transparent" }}
                                                    />
                                                </div>
                                                <div className="text-sm font-medium sm:text-base">
                                                    <p className="text-dark leading-normal">Cash On Delivery</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                            <div className="col-span-1 w-full space-y-4 xl:space-y-10">
                                <div className="space-y-5 xl:sticky xl:top-[157px]">
                                    <div className="shadow-custom rounded-default">
                                        <h2 className="text-dark text-sm sm:text-lg font-semibold py-2.5 border-b border-light-white px-3 sm:px-5">
                                            Your Bill
                                        </h2>
                                        <ul className="pb-2.5 sm:pb-5 px-3 sm:px-5">
                                            <div className="mt-3 space-y-3 text-sm">
                                                <li className="flex justify-between">
                                                    <p>Sub-Total</p>
                                                    <p className="flex items-center font-medium">
                                                        {formatCurrency(subTotal)}
                                                    </p>
                                                </li>
                                                {totalDiscount > 0 && (
                                                    <li className="flex justify-between">
                                                        <p>Regular Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(totalDiscount)}
                                                        </p>
                                                    </li>
                                                )}
                                                {evPointTotal > 0 && (
                                                    <li className="flex justify-between">
                                                        <p>EV Points Discount</p>
                                                        <p className="flex items-center font-medium text-success">
                                                            - {formatCurrency(evPointTotal)}
                                                        </p>
                                                    </li>
                                                )}
                                                {spinDiscount && !isNaN(parseFloat(spinDiscount)) && (
                                                    <li className="flex justify-between">
                                                        <p>Spin Discount</p>
                                                        <p className="flex items-center font-medium text-danger">
                                                            - {formatCurrency(parseFloat(spinDiscount))}
                                                        </p>
                                                    </li>
                                                )}
                                                <li className="flex justify-between">
                                                    <p>Shipping Charge</p>
                                                    <p className="flex items-center font-medium">
                                                        {formatCurrency(shippingCharge)}
                                                    </p>
                                                </li>
                                                <li className="flex justify-between font-bold sm:text-base pt-2 border-t border-light-white">
                                                    <p>Total</p>
                                                    <p className="flex items-center">{formatCurrency(grandTotal)}</p>
                                                </li>
                                            </div>
                                            {!isMobile && (
                                                <button
                                                    className={`mt-7 w-full rounded-md py-2 text-lg font-bold ${cartItems.length > 0 && formData.paymentMethod
                                                        ? 'bg-primary hover:bg-primary-dark text-white'
                                                        : 'bg-light-white text-light-ash cursor-not-allowed'
                                                        }`}
                                                    type="submit"
                                                    disabled={cartItems.length === 0 || !formData.paymentMethod || createInvoiceMutation.isLoading}
                                                >
                                                    {createInvoiceMutation.isLoading ? 'Placing Order...' : 'Place Order'}
                                                </button>
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Mobile-only sticky order bar */}
                                {isMobile && (
                                    <div className="text-light-ash shadow-custom fixed bottom-0 z-40 -mx-5 flex h-16 w-full items-center justify-between bg-white px-5 text-sm font-semibold capitalize sm:text-base md:-mx-7 md:px-7 lg:-mx-12 lg:px-12 xl:hidden">
                                        <p className="flex items-center text-base md:text-lg">
                                            Total:
                                            <span className="text-dark ml-1 flex items-center">
                                                {formatCurrency(grandTotal)}
                                            </span>
                                        </p>
                                        <button
                                            className={`rounded-md px-5 py-2 font-semibold md:px-20 ${cartItems.length > 0 && formData.paymentMethod
                                                ? 'bg-primary text-white'
                                                : 'bg-light-white text-light-ash cursor-not-allowed'
                                                }`}
                                            type="submit"
                                            disabled={cartItems.length === 0 || !formData.paymentMethod || createInvoiceMutation.isLoading}
                                        >
                                            {createInvoiceMutation.isLoading ? 'Processing...' : 'Place Order'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* Clear Confirmation Modal */}
                {showClearConfirm && (
                    <div className="modal-overlay fixed inset-0 z-[99999] flex items-center justify-center bg-black/70">
                        <div className="mx-4 md:mx-10 relative max-h-[300px] max-w-[500px] w-full shadow-lg bg-white rounded-xl z-[99999] p-6 flex flex-col">
                            <div className="py-5 px-5">
                                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 text-center">
                                    Clear Form Data
                                </h3>
                                <p className="text-sm md:text-base text-gray-700 mb-6 text-center leading-relaxed">
                                    Are you sure you want to clear all entered information? This action cannot be undone.
                                </p>
                                <div className="flex justify-center gap-3 mt-4">
                                    <button
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-800 text-sm md:text-base font-medium hover:bg-gray-100 transition-colors duration-200"
                                        onClick={() => setShowClearConfirm(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="flex-1 px-4 py-2 bg-primary text-white rounded-md text-sm md:text-base font-medium hover:bg-red-600 transition-colors duration-200"
                                        onClick={handleClearForm}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

// Reusable ProductItem component
const ProductItem = ({ item, index, formatCurrency, decreaseQty, increaseQty, removeItemById, totalDiscount, reviewMode = false }) => {
    // Calculate discounts
    const itemRegularDiscount = item.discount > 0 ? item.qty * item.discount : 0;
    const itemEvDiscount = item.evPoint > 0 ? item.qty * item.evPoint : 0;
    const itemFinalPrice = (item.qty * item.price) - itemEvDiscount;

    return (
        <div className="rounded-sm bg-white shadow-custom">
            <div className="divide-light-white divide-y px-3 sm:px-5">
                <div className="relative flex items-center gap-2 py-3">
                    <Link
                        href={`/product/${item.id}`}
                    >
                        <img
                            alt="cart_product"
                            loading="lazy"
                            width="90"
                            height="90"
                            className="my-auto"
                            src={item.image}
                            style={{ color: 'transparent' }}
                            onError={(e) => {
                                e.target.src = '/resources/images/product_placeholder.jpg';
                            }}
                        />
                    </Link>
                    <div className="text-dark-ash flex w-full flex-col justify-between text-xs sm:flex-row sm:gap-4 md:text-sm">
                        <div className="w-full max-w-xs flex flex-col justify-center">
                            <div>SN. {index + 1}</div>
                            <div className="text-dark font-semibold capitalize">{item.name}</div>
                            {item.color && (
                                <div>
                                    Color: <span className="font-medium">{item.color}</span>
                                </div>
                            )}
                            {item.size && (
                                <div>
                                    Size: <span className="font-medium">{item.size}</span>
                                </div>
                            )}
                        </div>

                        <div className="w-full max-w-xs space-y-1 text-sm text-dark">

                            {/* Unit Price */}
                            <div className="flex items-center gap-2">
                                <div className="font-medium">Unit Price:</div>
                                <div className="font-semibold">{formatCurrency(item.originalPrice)}</div>
                            </div>

                            {/* After Regular Discount (RG) */}
                            {itemRegularDiscount > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="font-medium">- Discount:</div>
                                    <div className="font-semibold">
                                        {formatCurrency(item.price)}
                                    </div>
                                    <div className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-lg py-0.5 sm:py-0.5">
                                        -{formatCurrency(itemRegularDiscount)}
                                    </div>
                                </div>
                            )}

                            {/* After EV Discount */}
                            {itemEvDiscount > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="font-medium">- EV Discount:</div>
                                    <div className="font-semibold">
                                        {formatCurrency(item.price - (itemEvDiscount / item.qty))}
                                    </div>
                                    <div className="bg-danger text-white px-1.5 text-xs sm:text-[13px] font-semibold flex items-center gap-1 rounded-lg py-0.5 sm:py-0.5">
                                        -{formatCurrency(itemEvDiscount / item.qty)}
                                    </div>
                                </div>
                            )}

                            {/* Final Amount */}
                            <div className="flex items-center gap-2">
                                <div className="font-medium">Amount:</div>
                                <div className="font-semibold">{formatCurrency(itemFinalPrice)}</div>
                                {(item.originalPrice > item.price || itemEvDiscount > 0) && (
                                    <div
                                        className="text-light-ash text-lg"
                                        style={{
                                            textDecoration: 'line-through',
                                            textDecorationColor: 'red',
                                            textDecorationThickness: '2px'
                                        }}
                                    >
                                        {formatCurrency(item.qty * item.originalPrice)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {!reviewMode && (
                            <div className="flex flex-row items-center gap-5 pt-3 sm:flex-col sm:justify-center sm:gap-2 sm:pt-0">
                                <div className="border-primary text-primary xs:w-32 3xl:w-28 flex h-8 w-28 items-center justify-around rounded border sm:h-9 sm:w-24 sm:border-2">
                                    <button
                                        type="button"
                                        aria-label="decrease-quantity"
                                        className="disabled:text-light-ash p-3 font-semibold"
                                        disabled={item.qty <= 1}
                                        onClick={() => {
                                            decreaseQty(item.id);
                                            toast.success(`"${item.name}" removed from cart`);
                                        }}
                                    >
                                        <svg
                                            width="11"
                                            height="4"
                                            viewBox="0 0 11 4"
                                            fill="currentColor"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z"></path>
                                        </svg>
                                    </button>
                                    <div className="w-6 text-center text-base font-bold sm:text-lg">{item.qty}</div>
                                    <button
                                        type="button"
                                        aria-label="increase-quantity"
                                        className="disabled:text-light-ash p-3 font-semibold"
                                        onClick={() => {
                                            increaseQty(item.id);
                                            toast.success(`"${item.name}" added to cart`);
                                        }}
                                    >
                                        <svg
                                            width="13"
                                            height="13"
                                            viewBox="0 0 13 13"
                                            fill="currentColor"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z"></path>
                                        </svg>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    aria-label="delete-product"
                                    onClick={() => removeItemById(item.id, item.name)}
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};