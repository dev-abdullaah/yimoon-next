// app/outlets/page.jsx
import Image from 'next/image';
import RightArrowLgIcon from '@/components/Icons/RightArrowLgIcon';
import { OUTLETS, directionsUrl } from '@/lib/outlets';

/**
 * The shop's physical outlets.
 *
 * A server component reading `lib/outlets.js`, so the directory is in the HTML
 * rather than fetched after paint. The previous version was a client component
 * that fetched the list, then rendered the same card twice — once for desktop
 * and once for mobile — and kept them in step with an `imageErrors` map keyed by
 * array index. That was ~300 lines to maintain two copies of one card, and both
 * copies had to agree about which outlet was expanded.
 *
 * The accordion is now a `<details>` element, so the open/closed state is the
 * browser's, the card is written once, and it is keyboard- and
 * screen-reader-accessible without any of it being reimplemented.
 */
const Outlets = () => (
    <main className="container mx-auto px-5 md:px-7 lg:px-12">
        <h1 className="text-dark sr-only">Find our outlets</h1>

        <section className="my-4 lg:my-10">
            {OUTLETS.length === 0 ? (
                <p className="text-gray py-10 text-center">
                    We are online only at the moment. Delivery is available everywhere in Bangladesh.
                </p>
            ) : (
                <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {OUTLETS.map((outlet) => (
                        <li key={outlet.id}>
                            <OutletCard outlet={outlet} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    </main>
);

function OutletCard({ outlet }) {
    return (
        <details className="shadow-md rounded-default group overflow-hidden">
            {/* The image is decorative here — the heading beside it names the
                outlet — so it is hidden from assistive technology rather than
                announced twice. */}
            <div className="relative w-full h-[300px] 2xl:h-[380px]" aria-hidden="true">
                <Image
                    alt=""
                    src={outlet.image}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                    // These are files served from `public/`, not imported assets,
                    // so Next's optimiser has no way to measure them and would
                    // otherwise refuse the request.
                    unoptimized
                />
            </div>

            <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between gap-3">
                <h2 className="text-primary font-semibold text-xl xl:text-2xl">{outlet.name}</h2>
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    className="transition-transform duration-300 stroke-slate-500 shrink-0 group-open:rotate-0 -rotate-90"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </summary>

            <div className="px-5 pb-4 space-y-2">
                <p>
                    <span className="font-semibold">Address:</span> <span>{outlet.address}</span>
                </p>

                <p className="flex">
                    <span className="font-semibold pr-1">Opening:</span>
                    <span>
                        {outlet.opening} to {outlet.closing}
                        <br />
                        {outlet.days}
                    </span>
                </p>

                <p className="flex">
                    <span className="font-semibold pr-1">Contact:</span>
                    <span className="flex flex-col">
                        {outlet.phones.map((phone) => (
                            // `tel:` takes the number in international form without
                            // punctuation, so a link dialled from the rendered
                            // "+880 1711-000000" still connects.
                            <a key={phone} href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                                {phone}
                            </a>
                        ))}
                    </span>
                </p>

                <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={directionsUrl(outlet)}
                    className="inline-flex items-center gap-1.5 text-lg font-semibold mt-3.5 text-primary hover:underline"
                >
                    Get Direction <RightArrowLgIcon />
                </a>
            </div>
        </details>
    );
}

export default Outlets;
