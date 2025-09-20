// app/outlets/page.jsx
'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/lib/config";
import { getOrFetchToken } from "@/utils/tokenService";
import RightArrowLgIcon from "@/components/Icons/RightArrowLgIcon";
import Image from "next/image";

const Outlets = () => {
    const [activeOutlet, setActiveOutlet] = useState(null);
    const [imageErrors, setImageErrors] = useState({});

    // Fetch outlets data from API
    const { data: outletsData, isLoading, isError } = useQuery({
        queryKey: ["outlets"],
        queryFn: async () => {
            // Use central token service to get or fetch token
            const token = await getOrFetchToken();
            if (!token) throw new Error("Authentication token not found");

            const timestamp = Math.floor(Date.now() / 1000);
            const formData = new FormData();
            formData.append("timestamp", timestamp.toString());
            formData.append("token", token);
            formData.append("com", "DataExpert");
            formData.append("action", "fetchFromInformationSet");
            formData.append("sourcename", "invprodstore");
            formData.append("method", "findAll");
            formData.append("condition", "");

            const response = await fetch(`${BASE_URL}/exchange`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            return await response.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    // Transform API data to match UI
    const transformOutletData = (apiData) => {
        if (!apiData?.data?.data) return [];

        return apiData.data.data.map((store) => ({
            name: store.name,
            address: store.location,
            opening: "10:00 AM to 10:00 PM",
            days: "(Everyday)",
            contacts: ["+" + store.name.match(/\d+/g)?.join("") || ""],
            image: store.storelogo || "/resources/images/yi-moon-shop.jpg",
            mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                store.location
            )}`,
        }));
    };

    const outlets = outletsData ? transformOutletData(outletsData) : [];

    const toggleOutlet = (index) => {
        setActiveOutlet(activeOutlet === index ? null : index);
    };

    const handleImageError = (index) => {
        setImageErrors(prev => ({ ...prev, [index]: true }));
    };

    if (isLoading) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12">
                <section className="my-4 lg:my-10">
                    <div className="grid grid-cols-1 gap-4">
                        {[...Array(1)].map((_, i) => (
                            <div key={i} className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                <div
                                    className="shadow-md rounded-default relative overflow-hidden bg-gray-100 animate-pulse"
                                >
                                    <div className="w-full h-[300px] 2xl:h-[380px] bg-gray-200"></div>
                                    <div className="px-5 py-3.5 space-y-3">
                                        <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                                            <div className="h-4 w-full bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                                            <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                                            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                                            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="h-8 w-32 bg-gray-200 rounded mt-3"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        );
    }

    if (isError) {
        return (
            <main className="container mx-auto px-5 md:px-7 lg:px-12">
                <section className="my-4 lg:my-10">
                    <div className="text-center py-10 text-red-500">
                        Error loading outlets data
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-5 md:px-7 lg:px-12">
            <section>
                <h1 className="sr-only">Shop Address – Find Our Stores</h1>
                <section className="my-4 lg:my-10">
                    {/* Desktop View */}
                    <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {outlets.map((outlet, index) => (
                            <div
                                key={index}
                                className="shadow-md rounded-default relative group overflow-hidden"
                            >
                                <div className="relative w-full h-[300px] 2xl:h-[380px]">
                                    <Image
                                        alt={outlet.name}
                                        src={imageErrors[index] ? "/resources/images/chinese-book-shop.webp" : outlet.image}
                                        fill
                                        className="object-cover group-hover:scale-[2.2] group-hover:translate-y-2/4 transition-all ease-in-out duration-[1500ms]"
                                        onError={() => handleImageError(index)}
                                        unoptimized={outlet.image.startsWith("http")}
                                    />
                                </div>
                                <ul className="px-5 py-3.5 group-hover:absolute inset-0 group-hover:bg-primary/60 group-hover:text-slate-100">
                                    <div className="space-y-2 group-hover:translate-y-1/2 2xl:group-hover:translate-y-full transition-all duration-700">
                                        <h4 className="text-primary group-hover:text-white font-semibold text-xl xl:text-2xl 3xl:text-[26px]">
                                            {outlet.name}
                                        </h4>
                                        <p>
                                            <span className="font-semibold">Address:</span>{" "}
                                            <span>{outlet.address}</span>
                                        </p>
                                        <div className="flex">
                                            <div className="font-semibold pr-1">Opening: </div>
                                            <div className="flex flex-col">
                                                <span>{outlet.opening}</span>
                                                <span>{outlet.days}</span>
                                            </div>
                                        </div>
                                        <li className="flex gap-1">
                                            <p className="font-semibold">Contact Number: </p>
                                            <p className="flex flex-col">
                                                {outlet.contacts.map((contact, i) => (
                                                    <a key={i} href={`tel:${contact}`}>
                                                        <span>{contact}</span>
                                                    </a>
                                                ))}
                                            </p>
                                        </li>
                                        <a target="_blank" rel="noopener noreferrer" href={outlet.mapLink}>
                                            <p className="hidden group-hover:flex items-center gap-1.5 text-lg 3xl:text-2xl font-semibold mt-3.5">
                                                Get Direction{" "}
                                                <RightArrowLgIcon />
                                            </p>
                                        </a>
                                    </div>
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-2.5">
                        {outlets.map((outlet, index) => (
                            <div key={index}>
                                <button
                                    type="button"
                                    onClick={() => toggleOutlet(index)}
                                    className="border border-light-white rounded-md p-2 flex justify-between items-center w-full"
                                >
                                    <h4 className="text-primary group-hover:text-white font-semibold text-lg">
                                        {outlet.name}
                                    </h4>
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        className={`transition-transform duration-300 stroke-slate-500 ${activeOutlet === index ? "rotate-0" : "-rotate-90"
                                            }`}
                                        fill="none"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15.75 19.5L8.25 12l7.5-7.5"
                                        ></path>
                                    </svg>
                                </button>
                                <div
                                    className={`transition-all ease-in-out duration-300 shadow-md rounded-md relative overflow-hidden ${activeOutlet === index ? "h-auto" : "h-0"
                                        }`}
                                >
                                    <div
                                        className={`${activeOutlet === index ? "block" : "hidden"
                                            }`}
                                    >
                                        <div className="relative w-full h-80 sm:h-[350px]">
                                            <Image
                                                alt={outlet.name}
                                                src={imageErrors[index] ? "/resources/images/chinese-book-shop.webp" : outlet.image}
                                                fill
                                                className="object-cover"
                                                onError={() => handleImageError(index)}
                                                unoptimized={outlet.image.startsWith("http")}
                                            />
                                        </div>
                                        <ul className="px-5 py-3.5">
                                            <div className="space-y-2">
                                                <h4 className="text-primary font-semibold text-xl">
                                                    {outlet.name}
                                                </h4>
                                                <p>
                                                    <span className="font-semibold">Address:</span>{" "}
                                                    <span>{outlet.address}</span>
                                                </p>
                                                <div className="flex">
                                                    <div className="font-semibold pr-1">Opening: </div>
                                                    <div className="flex flex-col">
                                                        <span>{outlet.opening}</span>
                                                        <span>{outlet.days}</span>
                                                    </div>
                                                </div>
                                                <li className="flex gap-1">
                                                    <p className="font-semibold">Contact Number: </p>
                                                    <p className="flex flex-col">
                                                        {outlet.contacts.map((contact, i) => (
                                                            <a key={i} href={`tel:${contact}`}>
                                                                <span>{contact}</span>
                                                            </a>
                                                        ))}
                                                    </p>
                                                </li>
                                                <a
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    href={outlet.mapLink}
                                                    className="hover:text-dark-primary"
                                                >
                                                    <p className="flex items-center gap-1.5 text-lg font-semibold mt-3.5">
                                                        Get Direction{" "}
                                                        <RightArrowLgIcon />
                                                    </p>
                                                </a>
                                            </div>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </section>
        </main>
    );
};

export default Outlets;