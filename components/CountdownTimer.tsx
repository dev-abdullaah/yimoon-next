// components/CountdownTimer.tsx
'use client';

import React, { useState, useEffect } from 'react';

export interface CountdownTimerProps {
    targetDate: string | number | Date;
    title?: string;
    className?: string;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
}

/**
 * World-class ticking countdown clock for flash sales and limited-time deals.
 * Styled with plain CSS (.hp-countdown) so it renders reliably everywhere.
 */
const CountdownTimer: React.FC<CountdownTimerProps> = ({
    targetDate,
    title = '⚡ Flash Deal Ends In:',
    className = ''
}) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
    const [isMounted, setIsMounted] = useState<boolean>(false);

    useEffect(() => {
        setIsMounted(true);
        if (!targetDate) return;

        const calculateTimeLeft = (): TimeLeft => {
            const difference = new Date(targetDate).getTime() - new Date().getTime();
            if (difference <= 0) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
                expired: false,
            };
        };

        setTimeLeft(calculateTimeLeft());

        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    if (!isMounted || !timeLeft || timeLeft.expired) {
        return null;
    }

    const pad = (num: number): string => String(num).padStart(2, '0');

    return (
        <div className={`hp-countdown ${className}`}>
            {title && <span className="hp-countdown__label">{title}</span>}
            <div className="hp-countdown__units" aria-live="off">
                {timeLeft.days > 0 && (
                    <>
                        <div className="hp-countdown__unit">
                            <b>{pad(timeLeft.days)}</b>
                            <small>days</small>
                        </div>
                        <span className="hp-countdown__sep">:</span>
                    </>
                )}
                <div className="hp-countdown__unit">
                    <b>{pad(timeLeft.hours)}</b>
                    <small>hrs</small>
                </div>
                <span className="hp-countdown__sep">:</span>
                <div className="hp-countdown__unit">
                    <b>{pad(timeLeft.minutes)}</b>
                    <small>min</small>
                </div>
                <span className="hp-countdown__sep">:</span>
                <div className="hp-countdown__unit">
                    <b style={{ color: '#ffd7a8' }}>{pad(timeLeft.seconds)}</b>
                    <small>sec</small>
                </div>
            </div>
        </div>
    );
};

export default CountdownTimer;
