// components/Home/SectionHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export interface SectionHeaderProps {
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    href?: string;
    linkLabel?: string;
    extra?: React.ReactNode;
    onPrev?: () => void;
    onNext?: () => void;
    canPrev?: boolean;
    canNext?: boolean;
}

export interface ChevronProps {
    dir?: 'left' | 'right';
    size?: number;
}

/**
 * The shared heading for every homepage section: an optional eyebrow label,
 * title, subtitle, and a right-hand slot for "View all", rail arrows, or a
 * countdown. One header keeps every band reading the same way.
 */
export default function SectionHeader({
    eyebrow,
    title,
    subtitle,
    href,
    linkLabel = 'View all',
    extra,
    onPrev,
    onNext,
    canPrev = true,
    canNext = true,
}: SectionHeaderProps) {
    return (
        <div className="hp-head">
            <div className="hp-head__text">
                {eyebrow && <div className="hp-eyebrow">{eyebrow}</div>}
                <div className="hp-head__title-row">
                    <h2 className="hp-title">{title}</h2>
                    {extra && <div className="hp-head__extra">{extra}</div>}
                </div>
                {subtitle && <p className="hp-subtitle">{subtitle}</p>}
            </div>
            <div className="hp-head__actions">
                {(onPrev || onNext) && (
                    <div className="hp-arrows">
                        <button type="button" className="hp-arrow" onClick={onPrev} disabled={!canPrev} aria-label={`Previous ${typeof title === 'string' ? title : 'section'}`}>
                            <Chevron dir="left" />
                        </button>
                        <button type="button" className="hp-arrow" onClick={onNext} disabled={!canNext} aria-label={`Next ${typeof title === 'string' ? title : 'section'}`}>
                            <Chevron dir="right" />
                        </button>
                    </div>
                )}
                {href && (
                    <Link href={href} className="hp-link">
                        {linkLabel}
                        <span className="sr-only"> {typeof title === 'string' ? title : ''}</span>
                        <Chevron dir="right" size={12} />
                    </Link>
                )}
            </div>
        </div>
    );
}

export function Chevron({ dir = 'right', size = 14 }: ChevronProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
        </svg>
    );
}
