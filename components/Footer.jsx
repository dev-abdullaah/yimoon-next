import React from 'react';
import RedLocationIcon from '@/components/Icons/RedLocationIcon';
import RedPhoneCallIcon from '@/components/Icons/RedPhoneCallIcon';
import RedEmailIcon from '@/components/Icons/RedEmailIcon';
import FacebookIcon from '@/components/Icons/FacebookIcon';
import LinkedInIcon from '@/components/Icons/LinkedIcon';
import YoutubeIcon from '@/components/Icons/YoutubeIcon';
import InstagramIcon from '@/components/Icons/InstagramIcon';
import TiktokIcon from '@/components/Icons/TiktokIcon';
import XIcon from '@/components/Icons/XIcon';


function Footer() {
    return (
        <footer className="container mx-auto px-5 md:px-7 lg:px-14">
            <div className="grid gap-5 py-5 xl:grid-cols-3">
                <div className="col-span-full xl:col-span-1">
                    <h3 className="mb-2 text-base font-semibold sm:mb-3">Contact Us</h3>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <RedLocationIcon />
                            <address className="text-sm text-[#6b6867] not-italic">
                                Plot #18, Road #6, Block #H, Uttara #17 <br />
                                (Opposite of World University Gate), <br />
                                DHAKA-1230, Bangladesh
                            </address>
                        </div>
                        <div className="flex items-center gap-2">
                            <RedPhoneCallIcon />
                            <a className="text-gray hover:text-primary" href="tel:+88-01885-998899">+88-01763-638847</a>
                        </div>
                        <div className="flex items-center gap-2">
                            <RedEmailIcon />
                            <a className="text-gray hover:text-primary"
                                href="/cdn-cgi/l/email-protection#562523262639242216253724373a3f303325222f3a337835393b">
                                <span className="__cf_email__"
                                    data-cfemail="5f2c2a2f2f302d2b1f2c3e2d3e3336393a2c2b26333a713c3032">
                                    info@yi-moon.com
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="col-span-full grid grid-cols-2 justify-between gap-5 lg:flex xl:col-span-2">
                    <div className="col-span-1">
                        <h3 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">Company</h3>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">About Us</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Contact Us</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Outlets</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Blogs</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Careers</a>
                    </div>
                    <div className="col-span-1">
                        <h3 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">Customer</h3>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="/login">Login</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="/register">Register</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Marketplace</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Brands</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Best Deals</a>
                    </div>
                    <div className="col-span-1">
                        <h3 className="mt-1 mb-2 text-sm font-semibold sm:mt-0 sm:mb-3 sm:text-base">Help</h3>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">FAQs</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Privacy Policy</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Terms &amp; Conditions</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Cookies Policy</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">Replacement Policy</a>
                        <a className="my-1 sm:my-2 text-sm font-medium block text-[#6b6867] hover:text-primary "
                            href="javascript:void()">EMI Terms &amp; Conditions</a>
                    </div>
                    <div className="col-span-2 space-y-3 sm:col-span-1 md:space-y-5">
                        <div>
                            <h3 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">Social Media for Yi Moon</h3>
                            <ul className="mt-2 flex items-center gap-x-2">
                                <li>
                                    <a aria-label="Facebook" href="https://www.facebook.com/yimoon007">
                                        <FacebookIcon />
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Linkedin" href="javascript:void()">
                                        <LinkedInIcon />
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Youtube" href="javascript:void()">
                                        <YoutubeIcon />
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Instagram" href="javascript:void()">
                                        <InstagramIcon/>
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Tiktok" href="javascript:void()">
                                        <TiktokIcon/>
                                    </a>
                                </li>
                                <li>
                                    <a aria-label="Twitter" href="javascript:void()">
                                        <XIcon/>
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mt-3 mb-2 text-sm font-semibold sm:text-base">Download App</h3>
                            <div className="flex items-center gap-2">
                                <a aria-label="Download Yi Moon App on Google Play"
                                    rel="noopener noreferrer"
                                    href="javascript:void()">
                                    <span className="sr-only">Download on Google Play</span>
                                    <img alt="Google Play Download" loading="lazy" width="120" height="40"
                                        decoding="async" className="bg-white" style={{ color: 'transparent' }}
                                        src="/resources/media/playstore.webp" />
                                </a>
                                <a aria-label="Download Yi Moon App on Apple Store"
                                    rel="noopener noreferrer"
                                    href="javascript:void()">
                                    <span className="sr-only">Download on Apple Store</span>
                                    <img alt="Apple Store Download" loading="lazy" width="120" height="40"
                                        decoding="async" className="bg-white" style={{ color: 'transparent' }}
                                        src="/resources/media/applestore.webp" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div
                className="border-light-white border-t-2 pt-3.5 pb-20 text-center text-sm font-medium xl:pt-4 xl:pb-4 xl:text-base"
            >
                © {new Date().getFullYear()} Yi Moon Ltd. All Rights Reserved
            </div>
        </footer>
    );
}

export default Footer;