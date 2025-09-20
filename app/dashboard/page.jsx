import toast from 'react-hot-toast';
import Select from 'react-select';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import citiesWithAreas from '@/utils/locations.json';
import { selectStyles, citySelectStyles, areaSelectStyles } from '@/styles/SelectStyles';

import GridIcon from '@/components/Icons/GridIcon';
import PersonMdIcon from '@/components/Icons/PersonMdIcon';
import OrderMdIcon from '@/components/Icons/OrderMdIcon';
import CouponMdIcon from '@/components/Icons/CouponMdIcon';
import AddressMdIcon from '@/components/Icons/AddressMdIcon';
import OrderTrackingMdIcon from '@/components/Icons/OrderTrackingMdIcon';
import NotificationIcon from '@/components/Icons/NotificationIcon';
import RightArrowIcon from '@/components/Icons/RightArrowIcon';
import ProcessingIcon from '@/components/Icons/ProcessingIcon';
import ReadyToShipIcon from '@/components/Icons/ReadyToShipIcon';
import ShippedIcon from '@/components/Icons/ShippedIcon';
import ReviewIcon from '@/components/Icons/ReviewIcon';
import OrderTrackingLgIcon from '@/components/Icons/OrderTrackingLgIcon';
import AddressLgIcon from '@/components/Icons/AddressLgIcon';
import OrderLgIcon from '@/components/Icons/OrderLgIcon';
import CouponLgIcon from '@/components/Icons/CouponLgIcon';
import WishListLgIcon from '@/components/Icons/WishListLgIcon';
import TakaIcon from '@/components/Icons/TakaIcon';
import EditIcon from '@/components/Icons/EditIcon';
import PersonSmIcon from '@/components/Icons/PersonSmIcon';
import PhoneCallIcon from '@/components/Icons/PhoneCallIcon';
import EmailIcon from '@/components/Icons/EmailIcon';
import DateIcon from '@/components/Icons/DateIcon';
import GenderIcon from '@/components/Icons/GenderIcon';
import KeyIcon from '@/components/Icons/KeyIcon';
import EyeSlashIcon from '@/components/Icons/EyeSlashIcon';

const Dashboard = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // State for screen size detection
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

    // State for profile and password views
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard', 'profile'

    useEffect(() => {
        const handleResize = () => {
            setIsLargeScreen(window.innerWidth >= 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/');
    };

    const handleDashboardClick = (e) => {
        e.preventDefault();
        setActiveSection('dashboard');
    };

    const handleProfileClick = (e) => {
        e.preventDefault();
        setActiveSection('profile');
        setShowProfileEdit(false);
        setShowPasswordForm(false);
    };

    const handleShippingInfoClick = (e) => {
        e.preventDefault();
        setActiveSection('shipping_info');
    };

    // ----------------------
    // Form & Location States
    // ----------------------
    const [formData, setFormData] = useState(() => {
        return {
            recipientName: '',
            contactNumber: '',
            address: '',
            postCode: '',
        };
    });

    const [selectedCityId, setSelectedCityId] = useState(() => {

    });

    const [selectedAreaId, setSelectedAreaId] = useState(() => {
    });

    const [areas, setAreas] = useState([]);
    const [formValid, setFormValid] = useState(false);

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

        return isNameValid && isPhoneValid && isAddressValid && isCityValid && isAreaValid;
    };

    // ----------------------
    // UI States
    // ----------------------
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [formTouched, setFormTouched] = useState({
        city: false,
        area: false
    });

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
            paymentMethod: ''
        });

        setSelectedCityId(null);
        setSelectedAreaId(null);
        setAreas([]);

        // Clear encrypted cookie data
        clearCheckoutFormData();

        setFormTouched({
            city: false,
            area: false
        });

        setCurrentStep(1);
        setShowClearConfirm(false);
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


    if (!isAuthenticated || !user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">Please log in to access your dashboard.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-primary text-white px-6 py-2 rounded-md hover:bg-dark-primary"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="-mt-2 lg:-mt-3 2xl:-mt-4 bg-light">
            <div className="container mx-auto px-5 md:px-7 lg:px-12">
                {/* Desktop Dashboard - Only visible on screens 1024px and wider */}

                {isLargeScreen && (
                    <div className="flex gap-10 py-10">

                        {/* Desktop sidebar */}
                        <div className="lg:basis-1/6">
                            <div className="rounded-default bg-white">
                                <div className="flex items-center gap-3 px-4 py-4 rounded-full stroke-dark-ash">
                                    <div className="border border-dark-ash rounded-full aspect-square">
                                        <img
                                            alt="User Profile"
                                            loading="lazy"
                                            width="55"
                                            height="55"
                                            decoding="async"
                                            className="rounded-full m-1 aspect-square"
                                            src="/resources/images/default_user.avif"
                                            style={{ color: 'transparent' }}
                                        />
                                    </div>
                                    <p className="flex flex-col">
                                        <span className="text-dark text-lg capitalize w-20 2xl:w-32 3xl:w-[150px] truncate">
                                            {user.fname} {user.lname}
                                        </span>
                                        <span className="text-dark-ash text-sm">{user.rollno}</span>
                                    </p>
                                </div>
                                <hr className="text-light-white" />
                                <ul className="space-y-2 my-2.5 capitalize">
                                    <li className={`font-medium py-2 px-5 border-l-4 group ${activeSection === 'dashboard' ? 'border-primary text-primary bg-light/90 border-r-4' : 'border-transparent hover:border-primary/80 hover:bg-light text-dark-ash hover:text-dark'}`}>
                                        <a className="flex items-center gap-2" href="/dashboard" onClick={handleDashboardClick}>
                                            <GridIcon />
                                            Dashboard
                                        </a>
                                    </li>
                                    <li className={`font-medium py-2 px-5 border-l-4 group ${activeSection === 'profile' ? 'border-primary text-primary bg-light/90 border-r-4' : 'border-transparent hover:border-primary/80 hover:bg-light text-dark-ash hover:text-dark'}`}>
                                        <a className="flex items-center gap-2" href="/dashboard/profile" onClick={handleProfileClick}>
                                            <PersonMdIcon />
                                            My Profile
                                        </a>
                                    </li>
                                    <li className={`font-medium py-2 px-5 border-l-4 group ${activeSection === 'shipping_info' ? 'border-primary text-primary bg-light/90 border-r-4' : 'border-transparent hover:border-primary/80 hover:bg-light text-dark-ash hover:text-dark'}`}>
                                        <a className="flex items-center gap-2" href="/dashboard/shipping-info" onClick={handleShippingInfoClick}>
                                            <AddressMdIcon />
                                            Shiping Info
                                        </a>
                                    </li>
                                    <li className="font-medium py-2 px-5 border-l-4 group border-transparent hover:border-primary/80 hover:bg-light text-dark-ash hover:text-dark">
                                        <a className="flex items-center gap-2" href="#">
                                            <OrderMdIcon />
                                            My Orders
                                        </a>
                                    </li>
                                    <li className="font-medium py-2 px-5 border-l-4 group border-transparent hover:border-primary/80 hover:bg-light text-dark-ash hover:text-dark">
                                        <a className="flex items-center gap-2" href="#">
                                            <CouponMdIcon />
                                            Coupon
                                        </a>
                                    </li>
                                    <li className="font-medium py-2 px-5 border-l-4 group border-transparent hover:border-primary/80 hover:bg-light text-dark-ash hover:text-dark">
                                        <a className="flex items-center gap-2" href="#">
                                            <OrderTrackingMdIcon />
                                            Order Tracking
                                        </a>
                                    </li>
                                    <li className="font-medium py-2 px-5 border-l-4 group border-transparent hover:border-primary/80 hover:bg-light text-dark-ash hover:text-dark">
                                        <a className="flex items-center gap-2" href="#">
                                            <NotificationIcon />
                                            Notification
                                        </a>
                                    </li>
                                </ul>
                                <hr className="text-light-white" />
                                <div className="px-5 py-4">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full rounded-md py-2 bg-danger text-white text-lg font-bold"
                                        type="button"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="lg:basis-5/6">

                            {/* Dashboard Content */}
                            {activeSection === 'dashboard' && (
                                <div className="space-y-3 lg:space-y-8">

                                    <div className="grid grid-cols-5 gap-5">
                                        <div className="col-span-5 lg:col-span-2">
                                            <div className="rounded-default bg-white px-2 lg:px-5 py-5">
                                                <div className="flex justify-between font-medium">
                                                    <p className="text-lg">My Orders</p>
                                                    <a
                                                        className="flex items-center px-2.5 py-0.5 border border-primary rounded-md gap-1.5 text-primary hover:bg-primary hover:text-white"
                                                        href="#"
                                                    >
                                                        See More
                                                        <RightArrowIcon />
                                                    </a>
                                                </div>
                                                <ul className="mt-5 flex justify-between gap-5 font-semibold text-light-ash text-xs lg:text-sm text-center px-2">
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ProcessingIcon />
                                                        </p>
                                                        Processing
                                                    </li>
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ReadyToShipIcon />
                                                        </p>
                                                        Ready To Ship
                                                    </li>
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ShippedIcon />
                                                        </p>
                                                        Shipped
                                                    </li>
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ReviewIcon />
                                                        </p>
                                                        Review
                                                    </li>
                                                </ul>
                                            </div>
                                            <ul className="mt-5 grid grid-cols-2 gap-5 font-semibold text-light-ash text-xs lg:text-sm text-center">
                                                <a href="#">
                                                    <li className="bg-white p-4 rounded-default hover:text-primary hover:shadow-md">
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[60px] w-[60px] mb-1">
                                                            <OrderTrackingLgIcon />
                                                        </p>
                                                        Order Tracking
                                                    </li>
                                                </a>
                                                <a href="#">
                                                    <li className="bg-white p-4 rounded-default hover:text-primary hover:shadow-md">
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[60px] w-[60px] mb-1">
                                                            <AddressLgIcon />
                                                        </p>
                                                        Shiping Info
                                                    </li>
                                                </a>
                                            </ul>
                                        </div>
                                        <div className="col-span-5 lg:col-span-1 text-center rounded-default relative bg-white group hover:shadow-md">
                                            <a href="#">
                                                <div className="relative">
                                                    <img
                                                        alt="order-cover"
                                                        loading="lazy"
                                                        width="304"
                                                        height="208"
                                                        decoding="async"
                                                        className="w-full"
                                                        src="/resources/images/my-order.avif"
                                                        style={{ color: 'transparent' }}
                                                    />
                                                    <div className="h-[68px] w-[68px] absolute -bottom-7 right-1/2 translate-x-1/2 rounded-full bg-white mx-auto p-2">
                                                        <div className="h-[50px] w-[50px] bg-light-white rounded-full mx-auto flex justify-center items-center">
                                                            <OrderLgIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-8 bg-white">
                                                    <h2 className="text-lg font-medium text-dark group-hover:text-primary">My Orders</h2>
                                                    <p className="mb-5 lg:mt-2 lg:mb-0 text-sm text-dark-ash group-hover:text-primary">
                                                        All of your orders in here
                                                    </p>
                                                </div>
                                            </a>
                                        </div>
                                        <div className="col-span-5 lg:col-span-1 text-center rounded-default relative bg-white group hover:shadow-md">
                                            <a href="#">
                                                <div className="relative">
                                                    <img
                                                        alt="order-cover"
                                                        loading="lazy"
                                                        width="304"
                                                        height="208"
                                                        decoding="async"
                                                        className="w-full"
                                                        src="/resources/images/my-wishlist.avif"
                                                        style={{ color: 'transparent' }}
                                                    />
                                                    <div className="h-[68px] w-[68px] absolute -bottom-7 right-1/2 translate-x-1/2 rounded-full bg-white mx-auto p-2">
                                                        <div className="h-[50px] w-[50px] bg-light-white rounded-full mx-auto flex justify-center items-center">
                                                            <WishListLgIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-8 bg-white">
                                                    <h2 className="text-lg font-medium text-dark group-hover:text-primary">Wishlist</h2>
                                                    <p className="mb-5 lg:mt-2 lg:mb-0 text-sm text-dark-ash group-hover:text-primary">
                                                        All of your wishlist items in here
                                                    </p>
                                                </div>
                                            </a>
                                        </div>
                                        <div className="col-span-5 lg:col-span-1 text-center rounded-default relative bg-white group hover:shadow-md">
                                            <a href="#">
                                                <div className="relative">
                                                    <img
                                                        alt="order-cover"
                                                        loading="lazy"
                                                        width="304"
                                                        height="208"
                                                        decoding="async"
                                                        className="w-full"
                                                        src="/resources/images/my-coupon.avif"
                                                        style={{ color: 'transparent' }}
                                                    />
                                                    <div className="h-[68px] w-[68px] absolute -bottom-7 right-1/2 translate-x-1/2 rounded-full bg-white mx-auto p-2">
                                                        <div className="h-[50px] w-[50px] bg-light-white rounded-full mx-auto flex justify-center items-center">
                                                            <CouponLgIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-8 bg-white">
                                                    <h2 className="text-lg font-medium text-dark group-hover:text-primary">Coupon</h2>
                                                    <p className="mb-5 lg:mt-2 lg:mb-0 text-sm text-dark-ash group-hover:text-primary">
                                                        All of your coupons in here
                                                    </p>
                                                </div>
                                            </a>
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="font-medium text-2xl text-dark mb-2.5">Recent Orders</h2>
                                        <div className="bg-white rounded-default">
                                            <ul className="flex lg:justify-between items-center p-4">
                                                <div className="basis-3/5 flex flex-col lg:flex-row lg:justify-between lg:items-center">
                                                    <li>
                                                        <p className="text-xs sm:text-sm lg:text-base font-medium flex items-center">
                                                            Invoice No:
                                                            <span className="pl-1 text-primary inline-flex items-center">
                                                                <svg
                                                                    width="16"
                                                                    height="16"
                                                                    viewBox="0 0 24 24"
                                                                    className="rotate-180 h-5"
                                                                    fill="none"
                                                                    strokeWidth="2"
                                                                    stroke="currentColor"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                >
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                                                </svg>
                                                            </span>
                                                        </p>
                                                        <p className="text-dark-ash text-xs lg:text-sm">Order Date: 00-00-0000 00:00</p>
                                                    </li>
                                                    <li className="text-sm lg:text-base">
                                                        Payment Status: <span className="font-medium"></span>
                                                    </li>
                                                </div>
                                                <div className="basis-2/5 text-right text-xs lg:text-base">
                                                    <a
                                                        className="px-2.5 py-0.5 border border-primary rounded-md text-primary hover:bg-primary hover:text-white"
                                                        href="#"
                                                    >
                                                        See Details
                                                    </a>
                                                </div>
                                            </ul>
                                            <div className="flex justify-between gap-20 py-5 px-4">
                                                <p className="lg:ms-auto text-lg font-medium text-dark-ash">
                                                    Item: <span className="text-dark"></span>
                                                </p>
                                                <p className="text-lg font-medium text-dark-ash flex items-center">
                                                    Total: <span className="text-primary font-semibold flex items-center">
                                                        <TakaIcon />
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Profile Content */}
                            {activeSection === 'profile' && (
                                <div>
                                    <h3 className="font-semibold text-sm sm:text-lg text-dark pb-2.5">My Account Information</h3>
                                    <div className="grid grid-cols-6 gap-5">
                                        {/* Default Profile Info */}
                                        {!showProfileEdit && (
                                            <div className="col-span-6 lg:col-span-4">
                                                <div className="rounded-default bg-white p-5">
                                                    <div className="border-light-white border-b pb-3 flex flex-col sm:flex-row justify-between items-center gap-2.5">
                                                        <p className="text-primary text-lg font-medium text-center">My Profile Information</p>
                                                        <p className="text-dark-ash hover:text-primary flex cursor-pointer items-center font-medium" onClick={() => setShowProfileEdit(true)}>
                                                            <EditIcon />
                                                            <span className="ml-1">Edit Profile</span>
                                                        </p>
                                                    </div>
                                                    <div className="mx-5 my-10">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="mb-10">
                                                                <div className="bg-light-ash rounded-full p-2 aspect-square">
                                                                    <img
                                                                        alt="Account Image"
                                                                        loading="lazy"
                                                                        width="140"
                                                                        height="140"
                                                                        decoding="async"
                                                                        data-nimg="1"
                                                                        className="aspect-square rounded-full"
                                                                        src="/resources/images/default_user.avif"
                                                                        style={{ color: 'transparent' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="text- grid grid-cols-3 gap-x-24 gap-y-5">
                                                                <div className="col-span-3 lg:col-span-1">
                                                                    <p className="flex items-center font-medium">
                                                                        <PersonSmIcon />
                                                                        <span className="text-dark-ash ml-1 font-medium">Full Name:</span>
                                                                    </p>
                                                                    <span className="font-semibold">{user.fname} {user.lname}</span>
                                                                </div>
                                                                <div className="col-span-3 lg:col-span-1">
                                                                    <p className="flex items-center font-medium">
                                                                        <PhoneCallIcon />
                                                                        <span className="text-dark-ash ml-1 font-medium">Contact Number:</span>
                                                                    </p>
                                                                    <span className="font-semibold">{user.phoneno}</span>
                                                                </div>
                                                                <div className="col-span-3 lg:col-span-1">
                                                                    <p className="flex items-center font-medium">
                                                                        <EmailIcon />
                                                                        <span className="text-dark-ash ml-1 font-medium">Email:</span>
                                                                    </p>
                                                                    <span className="font-semibold">{user.email}</span>
                                                                </div>
                                                                <div className="col-span-3 lg:col-span-1">
                                                                    <p className="flex items-center font-medium">
                                                                        <DateIcon />
                                                                        <span className="text-dark-ash ml-1 font-medium">Date of Birth:</span>
                                                                    </p>
                                                                    <span className="font-semibold">N/A</span>
                                                                </div>
                                                                <div className="col-span-3 lg:col-span-1">
                                                                    <p className="flex items-center font-medium">
                                                                        <GenderIcon />
                                                                        <span className="text-dark-ash ml-1 font-medium">Gender:</span>
                                                                    </p>
                                                                    <span className="font-semibold">N/A</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Profile Info Update Form */}
                                        {showProfileEdit && (
                                            <div className="col-span-6 lg:col-span-4">
                                                <div className="rounded-default bg-white p-5">
                                                    <div className="border-light-white border-b pb-3 flex flex-col sm:flex-row justify-between items-center gap-2.5">
                                                        <p className="text-primary text-lg font-medium text-center">Edit Profile Information</p>
                                                    </div>
                                                    <div className="my-10">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="mb-10">
                                                                <div className="bg-light-ash rounded-full p-2">
                                                                    <img
                                                                        alt="Account Image"
                                                                        loading="lazy"
                                                                        width="140"
                                                                        height="140"
                                                                        decoding="async"
                                                                        data-nimg="1"
                                                                        className="aspect-square rounded-full"
                                                                        src="/resources/images/default_user.avif"
                                                                        style={{ color: 'transparent' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <form action="#">
                                                            <div className="grid grid-cols-1 gap-5 pb-7 lg:grid-cols-3">
                                                                <ul className="flex flex-col">
                                                                    <label className="font-medium pb-[3px]" htmlFor="fullName">Full Name<span className="text-danger ml-1">*</span></label>
                                                                    <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                        <input
                                                                            placeholder="Enter Your Full Name"
                                                                            className="outline-0 text-dark-ash w-full false"
                                                                            type="text"
                                                                            value="Tori We"
                                                                            name="fullName"
                                                                        />
                                                                    </li>
                                                                </ul>
                                                                <ul className="flex flex-col">
                                                                    <label className="font-medium pb-[3px]" htmlFor="mobileNo">Mobile Number</label>
                                                                    <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                        <input
                                                                            placeholder="Enter Your Phone Number"
                                                                            disabled
                                                                            className="outline-0 text-dark-ash w-full cursor-not-allowed"
                                                                            type="tel"
                                                                            value=""
                                                                            name="mobileNo"
                                                                        />
                                                                    </li>
                                                                </ul>
                                                                <ul className="flex flex-col">
                                                                    <label className="font-medium pb-[3px]" htmlFor="email">Email</label>
                                                                    <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                        <input
                                                                            placeholder="Enter Your Email"
                                                                            disabled
                                                                            className="outline-0 text-dark-ash w-full cursor-not-allowed"
                                                                            type="email"
                                                                            value="toriwe7465@iotrama.com"
                                                                            name="email"
                                                                        />
                                                                    </li>
                                                                </ul>
                                                                <ul className="flex flex-col">
                                                                    <label className="font-medium pb-[3px]" htmlFor="DOB">Date Of Birth</label>
                                                                    <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                        <input
                                                                            placeholder="Enter Your Email"
                                                                            className="outline-0 text-dark-ash w-full false"
                                                                            type="date"
                                                                            value=""
                                                                            name="DOB"
                                                                        />
                                                                    </li>
                                                                </ul>
                                                                <ul>
                                                                    <p id="my-radio-group" className="font-medium pb-1.5">Gender</p>
                                                                    <div role="group" aria-labelledby="my-radio-group" className="space-x-5 flex">
                                                                        <label className="text-base text-dark-ash flex flex-row items-center">
                                                                            <input className="mr-1 accent-primary w-4 h-4" type="radio" value="1" name="genderId" />
                                                                            Male
                                                                        </label>
                                                                        <label className="text-base text-dark-ash flex flex-row items-center">
                                                                            <input className="mr-1 accent-primary w-4 h-4" type="radio" value="2" name="genderId" />
                                                                            Female
                                                                        </label>
                                                                        <label className="text-base text-dark-ash flex flex-row items-center">
                                                                            <input className="mr-1 accent-primary w-4 h-4" type="radio" value="3" name="genderId" />
                                                                            Others
                                                                        </label>
                                                                    </div>
                                                                </ul>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-5 lg:w-6/12 lg:grid-cols-2">
                                                                <button
                                                                    type="button"
                                                                    className="bg-danger hover:bg-danger/90 rounded-md py-2 text-base font-semibold text-white md:py-2"
                                                                    onClick={() => setShowProfileEdit(false)}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button type="submit" className="bg-success hover:bg-success/90 rounded-md py-2 text-base font-semibold text-white md:py-2">
                                                                    Update Now
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Default Password Info */}
                                        {!showPasswordForm && (
                                            <div className="col-span-6 lg:col-span-2">
                                                <div className="rounded-default bg-white p-5">
                                                    <div className="border-light-white border-b pb-3 text-center">
                                                        <p className="text-primary inline-flex items-center text-center text-lg font-medium">
                                                            Change My Password
                                                        </p>
                                                    </div>
                                                    <div className="my-10 mx-5">
                                                        <div className="p-4 flex justify-center items-center flex-col">
                                                            <p className="font-medium flex items-center">
                                                                <KeyIcon />
                                                                <span className="text-dark-ash font-medium">Password</span>
                                                            </p>
                                                            <p className="font-medium mt-1">**********</p>
                                                        </div>
                                                        <div className="flex justify-center">
                                                            <button
                                                                className="bg-button-primary px-6 py-2 text-base text-white font-medium rounded-md hover:bg-button-primary-light"
                                                                onClick={() => setShowPasswordForm(true)}
                                                            >
                                                                Change Password
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Password Update Form */}
                                        {showPasswordForm && (
                                            <div className="col-span-6 lg:col-span-2">
                                                <div className="rounded-default bg-white p-5">
                                                    <div className="border-light-white border-b pb-3 text-center">
                                                        <p className="text-primary inline-flex items-center text-center text-lg font-medium">Change My Password</p>
                                                    </div>
                                                    <div className="mx-auto rounded-xl px-5 py-6">
                                                        <form action="#" className="mx-auto flex flex-col gap-5 text-[15px]">
                                                            <ul className="flex flex-col">
                                                                <label className="font-medium pb-[3px]" htmlFor="oldPassword">
                                                                    Old Password<span className="text-danger ml-1">*</span>
                                                                </label>
                                                                <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                    <input
                                                                        placeholder="Enter Your Old Password"
                                                                        className="outline-0 text-dark-ash w-full false"
                                                                        type="password"
                                                                        value=""
                                                                        name="oldPassword"
                                                                    />
                                                                    <button aria-label="toggle-button" type="button">
                                                                        <EyeSlashIcon />
                                                                    </button>
                                                                </li>
                                                            </ul>
                                                            <ul className="flex flex-col">
                                                                <label className="font-medium pb-[3px]" htmlFor="newPassword">
                                                                    New Password<span className="text-danger ml-1">*</span>
                                                                </label>
                                                                <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                    <input
                                                                        placeholder="Enter Your New Password"
                                                                        className="outline-0 text-dark-ash w-full false"
                                                                        type="password"
                                                                        value=""
                                                                        name="newPassword"
                                                                    />
                                                                    <button aria-label="toggle-button" type="button">
                                                                        <EyeSlashIcon />
                                                                    </button>
                                                                </li>
                                                            </ul>
                                                            <ul className="flex flex-col">
                                                                <label className="font-medium pb-[3px]" htmlFor="confirmPassword">
                                                                    Confirm New Password<span className="text-danger ml-1">*</span>
                                                                </label>
                                                                <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                    <input
                                                                        placeholder="Enter Your New Password Again"
                                                                        className="outline-0 text-dark-ash w-full false"
                                                                        type="password"
                                                                        value=""
                                                                        name="confirmPassword"
                                                                    />
                                                                    <button aria-label="toggle-button" type="button">
                                                                        <EyeSlashIcon />
                                                                    </button>
                                                                </li>
                                                            </ul>
                                                            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                                                                <button
                                                                    type="button"
                                                                    className="bg-danger hover:bg-danger/90 rounded-md py-2 text-base font-semibold text-white md:py-2"
                                                                    onClick={() => setShowPasswordForm(false)}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="submit"
                                                                    className="bg-success hover:bg-success/90 rounded-md py-2 text-base font-semibold text-white md:py-2"
                                                                >
                                                                    Update Now
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Shiping Info Area */}
                            {activeSection === 'shipping_info' && (
                                <div>
                                    <h3 className="font-semibold text-sm sm:text-lg text-dark pb-2.5">
                                        Shiping Info
                                    </h3>
                                    <form
                                        action="#"
                                        className="rounded-default bg-white p-5 text-[15px]"
                                        data-gtm-form-interact-id="2"
                                    >

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
                                            <button
                                                className="mt-7 hidden w-full rounded-md py-2 my-2 text-lg font-bold xl:block bg-light-white text-light-ash"
                                                type="submit"
                                            >
                                                Add Address
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                        </div>

                    </div>
                )}

                {/* Mobile Dashboard - Only visible on screens smaller than 1024px */}
                {!isLargeScreen && (
                    <div className="flex flex-col py-3">

                        {/* Mobile Dashboard Topbar (Desktop Sidebar) */}
                        <div className="rounded-default bg-white py-3 px-2 mb-5">
                            <div className="flex gap-2 lg:gap-4 overflow-auto scrollbar-hidden">
                                <div>
                                    <a
                                        className={`flex flex-col items-center justify-between rounded-default w-full min-w-[100px] max-w-[100px] text-center ${activeSection === 'dashboard' ? 'text-primary fill-primary font-medium border-primary underline decoration-primary underline-offset-4' : 'border-transparent'}`}
                                        href="/dashboard"
                                        onClick={handleDashboardClick}
                                    >
                                        <GridIcon />
                                        <span className="text-sm capitalize">Dashboard</span>
                                    </a>
                                </div>
                                <div>
                                    <a
                                        className={`flex flex-col items-center justify-between rounded-default w-full min-w-[100px] max-w-[100px] text-center ${activeSection === 'profile' ? 'text-primary fill-primary font-medium border-primary underline decoration-primary underline-offset-4' : 'border-transparent'}`}
                                        href="/dashboard/account"
                                        onClick={handleProfileClick}
                                    >
                                        <PersonMdIcon />
                                        <span className="text-sm capitalize">My Profile</span>
                                    </a>
                                </div>
                                <div>
                                    <a
                                        className={`flex flex-col items-center justify-between rounded-default w-full min-w-[100px] max-w-[100px] text-center ${activeSection === 'shipping_info' ? 'text-primary fill-primary font-medium border-primary underline decoration-primary underline-offset-4' : 'border-transparent'}`}
                                        href="/dashboard/shipping-info"
                                        onClick={handleShippingInfoClick}
                                    >
                                        <AddressMdIcon />
                                        <span className="text-sm capitalize">Shiping Info</span>
                                    </a>
                                </div>
                                <div>
                                    <a
                                        className="flex flex-col items-center justify-between rounded-default w-full min-w-[100px] max-w-[100px] text-center border-transparent"
                                        href="#"
                                    >
                                        <OrderMdIcon />
                                        <span className="text-sm capitalize">My Orders</span>
                                    </a>
                                </div>
                                <div>
                                    <a
                                        className="flex flex-col items-center justify-between rounded-default w-full min-w-[100px] max-w-[100px] text-center border-transparent"
                                        href="#"
                                    >
                                        <CouponMdIcon />
                                        <span className="text-sm capitalize">Coupon</span>
                                    </a>
                                </div>
                                <div>
                                    <a
                                        className="flex flex-col items-center justify-between rounded-default w-full min-w-[100px] max-w-[100px] text-center border-transparent"
                                        href="#"
                                    >
                                        <OrderTrackingMdIcon />
                                        <span className="text-sm capitalize">Order Tracking</span>
                                    </a>
                                </div>
                                <div>
                                    <a
                                        className="flex flex-col items-center justify-between rounded-default w-full min-w-[100px] max-w-[100px] text-center border-transparent"
                                        href="#"
                                    >
                                        <NotificationIcon />
                                        <span className="text-sm capitalize">Notification</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Dashboard Content */}
                        {activeSection === 'dashboard' && (
                            <div>
                                <div className="space-y-3 lg:space-y-8">
                                    <div className="grid grid-cols-5 gap-5">
                                        <div className="col-span-5 lg:col-span-2">
                                            <div className="rounded-default bg-white px-2 lg:px-5 py-5">
                                                <div className="flex justify-between font-medium">
                                                    <p className="text-lg">My Orders</p>
                                                    <a
                                                        className="flex items-center px-2.5 py-0.5 border border-primary rounded-md gap-1.5 text-primary hover:bg-primary hover:text-white"
                                                        href="#"
                                                    >
                                                        See More
                                                        <RightArrowIcon />
                                                    </a>
                                                </div>
                                                <ul className="mt-5 flex justify-between gap-5 font-semibold text-light-ash text-xs lg:text-sm text-center px-2">
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ProcessingIcon />
                                                        </p>
                                                        Processing
                                                    </li>
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ReadyToShipIcon />
                                                        </p>
                                                        Ready To Ship
                                                    </li>
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ShippedIcon />
                                                        </p>
                                                        Shipped
                                                    </li>
                                                    <li>
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[50px] w-[50px] lg:h-[60px] lg:w-[60px] mb-1">
                                                            <ReviewIcon />
                                                        </p>
                                                        Review
                                                    </li>
                                                </ul>
                                            </div>
                                            <ul className="mt-5 grid grid-cols-2 gap-5 font-semibold text-light-ash text-xs lg:text-sm text-center">
                                                <a href="#">
                                                    <li className="bg-white p-4 rounded-default hover:text-primary hover:shadow-md">
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[60px] w-[60px] mb-1">
                                                            <OrderTrackingLgIcon />
                                                        </p>
                                                        Order Tracking
                                                    </li>
                                                </a>
                                                <a href="#">
                                                    <li className="bg-white p-4 rounded-default hover:text-primary hover:shadow-md">
                                                        <p className="mx-auto flex justify-center items-center rounded-full bg-light-white h-[60px] w-[60px] mb-1">
                                                            <AddressLgIcon />
                                                        </p>
                                                        Shiping Info
                                                    </li>
                                                </a>
                                            </ul>
                                        </div>
                                        <div className="col-span-5 lg:col-span-1 text-center rounded-default relative bg-white group hover:shadow-md">
                                            <a href="#">
                                                <div className="relative">
                                                    <img
                                                        alt="order-cover"
                                                        loading="lazy"
                                                        width="304"
                                                        height="208"
                                                        decoding="async"
                                                        className="w-full"
                                                        src="/resources/images/my-order.avif"
                                                        style={{ color: 'transparent' }}
                                                    />
                                                    <div className="h-[68px] w-[68px] absolute -bottom-7 right-1/2 translate-x-1/2 rounded-full bg-white mx-auto p-2">
                                                        <div className="h-[50px] w-[50px] bg-light-white rounded-full mx-auto flex justify-center items-center">
                                                            <OrderLgIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-8 bg-white">
                                                    <h2 className="text-lg font-medium text-dark group-hover:text-primary">My Orders</h2>
                                                    <p className="mb-5 lg:mt-2 lg:mb-0 text-sm text-dark-ash group-hover:text-primary">
                                                        All of your orders in here
                                                    </p>
                                                </div>
                                            </a>
                                        </div>
                                        <div className="col-span-5 lg:col-span-1 text-center rounded-default relative bg-white group hover:shadow-md">
                                            <a href="#">
                                                <div className="relative">
                                                    <img
                                                        alt="order-cover"
                                                        loading="lazy"
                                                        width="304"
                                                        height="208"
                                                        decoding="async"
                                                        className="w-full"
                                                        src="/resources/images/my-wishlist.avif"
                                                        style={{ color: 'transparent' }}
                                                    />
                                                    <div className="h-[68px] w-[68px] absolute -bottom-7 right-1/2 translate-x-1/2 rounded-full bg-white mx-auto p-2">
                                                        <div className="h-[50px] w-[50px] bg-light-white rounded-full mx-auto flex justify-center items-center">
                                                            <WishListLgIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-8 bg-white">
                                                    <h2 className="text-lg font-medium text-dark group-hover:text-primary">Wishlist</h2>
                                                    <p className="mb-5 lg:mt-2 lg:mb-0 text-sm text-dark-ash group-hover:text-primary">
                                                        All of your wishlist items in here
                                                    </p>
                                                </div>
                                            </a>
                                        </div>
                                        <div className="col-span-5 lg:col-span-1 text-center rounded-default relative bg-white group hover:shadow-md">
                                            <a href="#">
                                                <div className="relative">
                                                    <img
                                                        alt="order-cover"
                                                        loading="lazy"
                                                        width="304"
                                                        height="208"
                                                        decoding="async"
                                                        className="w-full"
                                                        src="/resources/images/my-coupon.avif"
                                                        style={{ color: 'transparent' }}
                                                    />
                                                    <div className="h-[68px] w-[68px] absolute -bottom-7 right-1/2 translate-x-1/2 rounded-full bg-white mx-auto p-2">
                                                        <div className="h-[50px] w-[50px] bg-light-white rounded-full mx-auto flex justify-center items-center">
                                                            <CouponLgIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-8 bg-white">
                                                    <h2 className="text-lg font-medium text-dark group-hover:text-primary">Coupon</h2>
                                                    <p className="mb-5 lg:mt-2 lg:mb-0 text-sm text-dark-ash group-hover:text-primary">
                                                        All of your coupons in here
                                                    </p>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="font-medium text-2xl text-dark mb-2.5">Recent Orders</h2>
                                        <div className="bg-white rounded-default">
                                            <ul className="flex lg:justify-between items-center p-4">
                                                <div className="basis-3/5 flex flex-col lg:flex-row lg:justify-between lg:items-center">
                                                    <li>
                                                        <p className="text-xs sm:text-sm lg:text-base font-medium flex items-center">
                                                            Invoice No:
                                                            <span className="pl-1 text-primary inline-flex items-center">
                                                                <svg
                                                                    width="16"
                                                                    height="16"
                                                                    viewBox="0 0 24 24"
                                                                    className="rotate-180 h-5"
                                                                    fill="none"
                                                                    strokeWidth="2"
                                                                    stroke="currentColor"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                >
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                                                </svg>
                                                            </span>
                                                        </p>
                                                        <p className="text-dark-ash text-xs lg:text-sm">Order Date: 00-00-0000 00:00</p>
                                                    </li>
                                                    <li className="text-sm lg:text-base">
                                                        Payment Status: <span className="font-medium"></span>
                                                    </li>
                                                </div>
                                                <div className="basis-2/5 text-right text-xs lg:text-base">
                                                    <a
                                                        className="px-2.5 py-0.5 border border-primary rounded-md text-primary hover:bg-primary hover:text-white"
                                                        href="#"
                                                    >
                                                        See Details
                                                    </a>
                                                </div>
                                            </ul>
                                            <div className="flex justify-between gap-20 py-5 px-4">
                                                <p className="lg:ms-auto text-lg font-medium text-dark-ash">
                                                    Item: <span className="text-dark"></span>
                                                </p>
                                                <p className="text-lg font-medium text-dark-ash flex items-center">
                                                    Total: <span className="text-primary font-semibold flex items-center">
                                                        <TakaIcon />
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mobile Profile Content */}
                        {activeSection === 'profile' && (
                            <div>
                                <h3 className="font-semibold text-sm sm:text-lg text-dark pb-2.5">My Account Information</h3>
                                <div className="grid grid-cols-1 gap-5">
                                    {/* Default Profile Info */}
                                    {!showProfileEdit && (
                                        <div className="rounded-default bg-white p-5">
                                            <div className="border-light-white border-b pb-3 flex flex-col sm:flex-row justify-between items-center gap-2.5">
                                                <p className="text-primary text-lg font-medium text-center">My Profile Information</p>
                                                <p className="text-dark-ash hover:text-primary flex cursor-pointer items-center font-medium" onClick={() => setShowProfileEdit(true)}>
                                                    <EditIcon />
                                                    <span className="ml-1">Edit Profile</span>
                                                </p>
                                            </div>
                                            <div className="mx-5 my-10">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="mb-10">
                                                        <div className="bg-light-ash rounded-full p-2 aspect-square">
                                                            <img
                                                                alt="Account Image"
                                                                loading="lazy"
                                                                width="140"
                                                                height="140"
                                                                decoding="async"
                                                                data-nimg="1"
                                                                className="aspect-square rounded-full"
                                                                src="/resources/images/default_user.avif"
                                                                style={{ color: 'transparent' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text- grid grid-cols-1 gap-y-5">
                                                        <div className="col-span-1">
                                                            <p className="flex items-center font-medium">
                                                                <PersonSmIcon />
                                                                <span className="text-dark-ash ml-1 font-medium">Full Name:</span>
                                                            </p>
                                                            <span className="font-semibold">Tori We</span>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <p className="flex items-center font-medium">
                                                                <PhoneCallIcon />
                                                                <span className="text-dark-ash ml-1 font-medium">Contact Number:</span>
                                                            </p>
                                                            <span className="font-semibold">N/A</span>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <p className="flex items-center font-medium">
                                                                <EmailIcon />
                                                                <span className="text-dark-ash ml-1 font-medium">Email:</span>
                                                            </p>
                                                            <span className="font-semibold">toriwe7465@iotrama.com</span>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <p className="flex items-center font-medium">
                                                                <DateIcon />
                                                                <span className="text-dark-ash ml-1 font-medium">Date of Birth:</span>
                                                            </p>
                                                            <span className="font-semibold">N/A</span>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <p className="flex items-center font-medium">
                                                                <GenderIcon />
                                                                <span className="text-dark-ash ml-1 font-medium">Gender:</span>
                                                            </p>
                                                            <span className="font-semibold">N/A</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Profile Edit Form */}
                                    {showProfileEdit && (
                                        <div className="rounded-default bg-white p-5">
                                            <div className="border-light-white border-b pb-3 flex flex-col sm:flex-row justify-between items-center gap-2.5">
                                                <p className="text-primary text-lg font-medium text-center">Edit Profile Information</p>
                                            </div>
                                            <div className="my-10">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="mb-10">
                                                        <div className="bg-light-ash rounded-full p-2">
                                                            <img
                                                                alt="Account Image"
                                                                loading="lazy"
                                                                width="140"
                                                                height="140"
                                                                decoding="async"
                                                                data-nimg="1"
                                                                className="aspect-square rounded-full"
                                                                src="/resources/images/default_user.avif"
                                                                style={{ color: 'transparent' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <form action="#">
                                                    <div className="grid grid-cols-1 gap-5 pb-7">
                                                        <ul className="flex flex-col">
                                                            <label className="font-medium pb-[3px]" htmlFor="fullName">Full Name<span className="text-danger ml-1">*</span></label>
                                                            <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                <input
                                                                    placeholder="Enter Your Full Name"
                                                                    className="outline-0 text-dark-ash w-full false"
                                                                    type="text"
                                                                    value="Tori We"
                                                                    name="fullName"
                                                                />
                                                            </li>
                                                        </ul>
                                                        <ul className="flex flex-col">
                                                            <label className="font-medium pb-[3px]" htmlFor="mobileNo">Mobile Number</label>
                                                            <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                <input
                                                                    placeholder="Enter Your Phone Number"
                                                                    disabled
                                                                    className="outline-0 text-dark-ash w-full cursor-not-allowed"
                                                                    type="tel"
                                                                    value=""
                                                                    name="mobileNo"
                                                                />
                                                            </li>
                                                        </ul>
                                                        <ul className="flex flex-col">
                                                            <label className="font-medium pb-[3px]" htmlFor="email">Email</label>
                                                            <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                <input
                                                                    placeholder="Enter Your Email"
                                                                    disabled
                                                                    className="outline-0 text-dark-ash w-full cursor-not-allowed"
                                                                    type="email"
                                                                    value="toriwe7465@iotrama.com"
                                                                    name="email"
                                                                />
                                                            </li>
                                                        </ul>
                                                        <ul className="flex flex-col">
                                                            <label className="font-medium pb-[3px]" htmlFor="DOB">Date Of Birth</label>
                                                            <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                                <input
                                                                    placeholder="Enter Your Email"
                                                                    className="outline-0 text-dark-ash w-full false"
                                                                    type="date"
                                                                    value=""
                                                                    name="DOB"
                                                                />
                                                            </li>
                                                        </ul>
                                                        <ul>
                                                            <p id="my-radio-group" className="font-medium pb-1.5">Gender</p>
                                                            <div role="group" aria-labelledby="my-radio-group" className="space-x-5 flex">
                                                                <label className="text-base text-dark-ash flex flex-row items-center">
                                                                    <input className="mr-1 accent-primary w-4 h-4" type="radio" value="1" name="genderId" />
                                                                    Male
                                                                </label>
                                                                <label className="text-base text-dark-ash flex flex-row items-center">
                                                                    <input className="mr-1 accent-primary w-4 h-4" type="radio" value="2" name="genderId" />
                                                                    Female
                                                                </label>
                                                                <label className="text-base text-dark-ash flex flex-row items-center">
                                                                    <input className="mr-1 accent-primary w-4 h-4" type="radio" value="3" name="genderId" />
                                                                    Others
                                                                </label>
                                                            </div>
                                                        </ul>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                                        <button
                                                            type="button"
                                                            className="bg-danger hover:bg-danger/90 rounded-md py-2 text-base font-semibold text-white md:py-2"
                                                            onClick={() => setShowProfileEdit(false)}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button type="submit" className="bg-success hover:bg-success/90 rounded-md py-2 text-base font-semibold text-white md:py-2">
                                                            Update Now
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                    {/* Default Password Info */}
                                    {!showPasswordForm && (
                                        <div className="rounded-default bg-white p-5">
                                            <div className="border-light-white border-b pb-3 text-center">
                                                <p className="text-primary inline-flex items-center text-center text-lg font-medium">
                                                    Change My Password
                                                </p>
                                            </div>
                                            <div className="my-10 mx-5">
                                                <div className="p-4 flex justify-center items-center flex-col">
                                                    <p className="font-medium flex items-center">
                                                        <KeyIcon />
                                                        <span className="text-dark-ash font-medium">Password</span>
                                                    </p>
                                                    <p className="font-medium mt-1">**********</p>
                                                </div>
                                                <div className="flex justify-center">
                                                    <button
                                                        className="bg-button-primary px-6 py-2 text-base text-white font-medium rounded-md hover:bg-button-primary-light"
                                                        onClick={() => setShowPasswordForm(true)}
                                                    >
                                                        Change Password
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Password Update Form */}
                                    {showPasswordForm && (
                                        <div className="rounded-default bg-white p-5">
                                            <div className="border-light-white border-b pb-3 text-center">
                                                <p className="text-primary inline-flex items-center text-center text-lg font-medium">Change My Password</p>
                                            </div>
                                            <div className="mx-auto rounded-xl px-5 py-6">
                                                <form action="#" className="mx-auto flex flex-col gap-5 text-[15px]">
                                                    <ul className="flex flex-col">
                                                        <label className="font-medium pb-[3px]" htmlFor="oldPassword">
                                                            Old Password<span className="text-danger ml-1">*</span>
                                                        </label>
                                                        <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                            <input
                                                                placeholder="Enter Your Old Password"
                                                                className="outline-0 text-dark-ash w-full false"
                                                                type="password"
                                                                value=""
                                                                name="oldPassword"
                                                            />
                                                            <button aria-label="toggle-button" type="button">
                                                                <EyeSlashIcon />
                                                            </button>
                                                        </li>
                                                    </ul>
                                                    <ul className="flex flex-col">
                                                        <label className="font-medium pb-[3px]" htmlFor="newPassword">
                                                            New Password<span className="text-danger ml-1">*</span>
                                                        </label>
                                                        <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                            <input
                                                                placeholder="Enter Your New Password"
                                                                className="outline-0 text-dark-ash w-full false"
                                                                type="password"
                                                                value=""
                                                                name="newPassword"
                                                            />
                                                            <button aria-label="toggle-button" type="button">
                                                                <EyeSlashIcon />
                                                            </button>
                                                        </li>
                                                    </ul>
                                                    <ul className="flex flex-col">
                                                        <label className="font-medium pb-[3px]" htmlFor="confirmPassword">
                                                            Confirm New Password<span className="text-danger ml-1">*</span>
                                                        </label>
                                                        <li className="flex gap-4 border border-light-ash hover:border-primary bg-white rounded-md py-1 md:py-1.5 px-2 md:px-2.5">
                                                            <input
                                                                placeholder="Enter Your New Password Again"
                                                                className="outline-0 text-dark-ash w-full false"
                                                                type="password"
                                                                value=""
                                                                name="confirmPassword"
                                                            />
                                                            <button aria-label="toggle-button" type="button">
                                                                <EyeSlashIcon />
                                                            </button>
                                                        </li>
                                                    </ul>
                                                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                                        <button
                                                            type="button"
                                                            className="bg-danger hover:bg-danger/90 rounded-md py-2 text-base font-semibold text-white md:py-2"
                                                            onClick={() => setShowPasswordForm(false)}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            className="bg-success hover:bg-success/90 rounded-md py-2 text-base font-semibold text-white md:py-2"
                                                        >
                                                            Update Now
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Shiping Info Area */}
                        {activeSection === 'shipping_info' && (
                            <div>
                                <h3 className="font-semibold text-sm sm:text-lg text-dark pb-2.5">
                                    Shiping Info
                                </h3>
                                <form
                                    action="#"
                                    className="rounded-default bg-white p-5 text-[15px]"
                                    data-gtm-form-interact-id="2"
                                >

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
                                        <button
                                            className="mt-7 hidden w-full rounded-md py-2 my-2 text-lg font-bold xl:block bg-light-white text-light-ash"
                                            type="submit"
                                        >
                                            Add Address
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;