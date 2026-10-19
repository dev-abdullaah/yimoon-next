// components/Spinner.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
    getSpinAttempts,
    decrementSpinAttempts,
    savePendingDiscount,
    getPendingDiscount,
    claimDiscount,
    hasClaimedDiscount,
    resetSpinnerData,
    setModalDismissed,
    SpinAttempts
} from "@/utils/cryptoHelper";

export interface SpinnerModalProps {
    onClose: () => void;
}

type GameState = 'ready' | 'spinning' | 'won' | 'lost' | 'claimed';

const SpinnerModal: React.FC<SpinnerModalProps> = ({ onClose }) => {
    const [spinning, setSpinning] = useState<boolean>(false);
    const [currentDiscount, setCurrentDiscount] = useState<number | null>(null);
    const [rotation, setRotation] = useState<number>(0);
    const [spinAttempts, setSpinAttempts] = useState<SpinAttempts>({ remaining: 3, total: 3 });
    const [gameState, setGameState] = useState<GameState>('ready');
    const [showResult, setShowResult] = useState<boolean>(false);
    const wheelRef = useRef<HTMLDivElement | null>(null);
    const [wheelRadius, setWheelRadius] = useState<number>(0);

    useEffect(() => {
        const updateRadius = () => {
            if (wheelRef.current) {
                const rect = wheelRef.current.getBoundingClientRect();
                setWheelRadius(rect.width / 2 - 30);
            }
        };

        updateRadius();
        window.addEventListener("resize", updateRadius);
        return () => window.removeEventListener("resize", updateRadius);
    }, []);

    const handleCloseButtonClick = () => {
        setModalDismissed();
        onClose();
    };

    const segments: number[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const winnableSegments: number[] = [10, 20, 30, 40, 50];

    const segmentColors: string[] = [
        'linear-gradient(135deg, #ff8945ff, #FF8C00)',
        'linear-gradient(135deg, #00F5A0, #00D9F5)',
        'linear-gradient(135deg, #008CFF, #00FFE5)',
        'linear-gradient(135deg, #10c400ff, #ff9100ff)',
        'linear-gradient(135deg, #FFE53B, #FF2525)',
        'linear-gradient(135deg, #6b54bdff, #47a893ff)',
        'linear-gradient(135deg, #00FF00, #007F00)',
        'linear-gradient(135deg, #FFA07A, #FF4500)',
        'linear-gradient(135deg, #a229d6ff, #a429fcff)',
        'linear-gradient(135deg, #00FFFF, #0000FF)'
    ];

    const getRandomDiscount = (): { actualDiscount: number; segmentIndex: number } => {
        const actualDiscount = winnableSegments[Math.floor(Math.random() * winnableSegments.length)];
        const segmentIndex = segments.findIndex(val => val === actualDiscount);

        return {
            actualDiscount,
            segmentIndex
        };
    };

    const loadInitialState = () => {
        const attempts = getSpinAttempts();
        setSpinAttempts(attempts);

        const pendingDiscount = getPendingDiscount();
        if (pendingDiscount && !pendingDiscount.claimed) {
            setCurrentDiscount(pendingDiscount.value);
            setGameState('won');
            setShowResult(true);
        } else if (attempts.remaining === 0) {
            setGameState('lost');
        } else {
            setGameState('ready');
        }
    };

    useEffect(() => {
        loadInitialState();
    }, []);

    const handleSpin = () => {
        if (spinning || spinAttempts.remaining === 0 || gameState === 'claimed') return;

        const discountResult = getRandomDiscount();
        const degreesPerSegment = 360 / segments.length;
        const segmentCenterAngle = discountResult.segmentIndex * degreesPerSegment + (degreesPerSegment / 2);

        const normalizedRotation = rotation % 360;
        const rotationNeeded = (360 - normalizedRotation) + (360 * 4) - segmentCenterAngle;

        const newRotation = rotation + rotationNeeded;
        setRotation(newRotation);
        setSpinning(true);
        setGameState('spinning');

        const newAttempts = decrementSpinAttempts();
        setSpinAttempts(newAttempts);

        setTimeout(() => {
            setCurrentDiscount(discountResult.actualDiscount);
            setSpinning(false);
            setShowResult(true);

            savePendingDiscount(discountResult.actualDiscount);
            setGameState('won');
        }, 4000);
    };

    const handleClaim = () => {
        const success = claimDiscount();
        if (success) {
            setGameState('claimed');
            setTimeout(() => {
                onClose();
            }, 1500);
        }
    };

    const handleSpinAgain = () => {
        if (spinAttempts.remaining > 0) {
            setCurrentDiscount(null);
            setShowResult(false);
            setGameState('ready');

            setTimeout(() => {
                handleSpin();
            }, 100);
        } else {
            setGameState('lost');
        }
    };

    const handleReset = () => {
        resetSpinnerData();
        setCurrentDiscount(null);
        setRotation(0);
        setSpinAttempts({ remaining: 3, total: 3 });
        setGameState('ready');
        setShowResult(false);
    };

    const getMainMessage = (): React.ReactNode => {
        const baseStyle: React.CSSProperties = {
            fontSize: "clamp(0.9rem, 2.5vw, 1.25rem)",
            fontWeight: "600",
            color: "#374151",
            lineHeight: 1.4,
            wordBreak: "break-word",
            textAlign: "center",
        };

        switch (gameState) {
            case 'spinning':
                return <p style={baseStyle}>🎯 Spinning...</p>;

            case 'won':
                return (
                    <p style={baseStyle}>
                        🎉 You won a <span className="text-green-600 font-bold">{currentDiscount}৳</span> discount!
                    </p>
                );

            case 'claimed':
                return <p style={baseStyle}>✅ Discount claimed!</p>;

            case 'lost':
                return <p style={baseStyle}>😔 No attempts left</p>;

            case 'ready':
            default:
                return (
                    <p style={baseStyle}>
                        🎯 You have {spinAttempts.remaining} attempt{spinAttempts.remaining !== 1 ? 's' : ''} left
                    </p>
                );
        }
    };

    const getSubMessage = (): string => {
        switch (gameState) {
            case 'won':
                return "Tap below to claim your discount.";
            case 'claimed':
                return "Discount applied to your account.";
            case 'lost':
                return "Come back later for more spins!";
            case 'spinning':
                return "Good luck! 🍀";
            default:
                return "Try your luck and win a discount!";
        }
    };

    const renderActionButtons = (): React.ReactNode => {
        switch (gameState) {
            case 'spinning':
                return (
                    <button
                        className="bg-gray-400 cursor-wait rounded-md py-2 px-6 text-white"
                        disabled
                    >
                        Spinning...
                    </button>
                );

            case 'won':
                return (
                    <div className="flex gap-3 justify-center flex-row flex-nowrap">
                        <button
                            className="rounded-md py-2 px-6 text-white transition-colors bg-success hover:bg-dark-primary"
                            onClick={handleClaim}
                        >
                            Claim Discount
                        </button>
                        {spinAttempts.remaining > 0 && (
                            <button
                                className="rounded-md py-2 px-6 text-white transition-colors bg-primary hover:bg-dark-primary"
                                onClick={handleSpinAgain}
                            >
                                Spin Again
                            </button>
                        )}
                    </div>
                );

            case 'claimed':
            case 'lost':
                return (
                    <button
                        className="bg-gray-500 rounded-md py-2 px-6 text-white"
                        onClick={onClose}
                    >
                        Close
                    </button>
                );

            case 'ready':
            default:
                return (
                    <button
                        className={`rounded-md py-2 px-6 text-white transition-colors ${spinAttempts.remaining > 0
                            ? "bg-primary hover:bg-dark-primary"
                            : "bg-gray-400 cursor-not-allowed"
                            }`}
                        onClick={handleSpin}
                        disabled={spinAttempts.remaining === 0}
                    >
                        🎯 Spin Now
                    </button>
                );
        }
    };

    if (hasClaimedDiscount()) {
        return null;
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
                zIndex: 9999,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "1rem",
            }}
        >
            <div
                style={{
                    position: "relative",
                    background: "#fff",
                    borderRadius: "1rem",
                    width: "100%",
                    maxWidth: "36rem",
                    padding: "clamp(1rem, 4vw, 2rem)",
                    textAlign: "center",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
            >
                {/* Close Button */}
                <button
                    onClick={handleCloseButtonClick}
                    style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                    }}
                    aria-label="modal-close-button"
                    type="button"
                    className="focus:outline-none hover:scale-110 transition-transform"
                >
                    <svg width="32" height="32" viewBox="0 0 32 32" className="fill-primary" fill="var(--color-primary, #C20000)" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd"
                            d="M10.2265 2.66553H21.7865C26.3065 2.66553 29.3332 5.83886 29.3332 10.5589V21.4535C29.3332 26.1602 26.3065 29.3322 21.7865 29.3322H10.2265C5.7065 29.3322 2.6665 26.1602 2.6665 21.4535V10.5589C2.6665 5.83886 5.7065 2.66553 10.2265 2.66553ZM20.0132 19.9989C20.4665 19.5469 20.4665 18.8135 20.0132 18.3602L17.6398 15.9869L20.0132 13.6122C20.4665 13.1602 20.4665 12.4135 20.0132 11.9602C19.5598 11.5055 18.8265 11.5055 18.3598 11.9602L15.9998 14.3322L13.6265 11.9602C13.1598 11.5055 12.4265 11.5055 11.9732 11.9602C11.5198 12.4135 11.5198 13.1602 11.9732 13.6122L14.3465 15.9869L11.9732 18.3469C11.5198 18.8135 11.5198 19.5469 11.9732 19.9989C12.1998 20.2255 12.5065 20.3469 12.7998 20.3469C13.1065 20.3469 13.3998 20.2255 13.6265 19.9989L15.9998 17.6402L18.3732 19.9989C18.5998 20.2402 18.8932 20.3469 19.1865 20.3469C19.4932 20.3469 19.7865 20.2255 20.0132 19.9989Z">
                        </path>
                    </svg>
                </button>

                {/* Header */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #667eea 0%, #ff0000ff 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
                        fontWeight: "800",
                        marginBottom: "0.5rem",
                        letterSpacing: "-0.02em",
                    }}
                >
                    🎯 Spin & Win!
                </div>

                {/* Attempts Counter */}
                <div className="mb-4">
                    <div className="flex justify-center items-center gap-1">
                        {[...Array(spinAttempts.total)].map((_, index) => (
                            <div
                                key={index}
                                className={`w-3 h-3 rounded-full ${index < spinAttempts.remaining ? "bg-green-500" : "bg-gray-300"
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        {spinAttempts.remaining} of {spinAttempts.total} attempts remaining
                    </p>
                </div>

                {/* Responsive Spinner Wheel */}
                <div
                    ref={wheelRef}
                    style={{
                        position: "relative",
                        width: "clamp(12rem, 60vw, 20rem)",
                        height: "clamp(12rem, 60vw, 20rem)",
                        margin: "0 auto 2rem",
                        filter: spinning
                            ? "drop-shadow(0 0 30px rgba(74, 144, 226, 0.5))"
                            : "drop-shadow(0 8px 25px rgba(0,0,0,0.15))",
                        opacity: gameState === "lost" || gameState === "claimed" ? 0.6 : 1,
                        transition: "opacity 0.3s ease",
                    }}
                >
                    {/* Outer glow ring */}
                    <div
                        style={{
                            position: "absolute",
                            inset: "-10px",
                            borderRadius: "50%",
                            background:
                                "conic-gradient(from 0deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #00f2fe, #667eea)",
                            animation: spinning ? "rotate 3s linear infinite" : "none",
                            opacity: 0.3,
                        }}
                    />

                    {/* Main wheel container */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            overflow: "hidden",
                            background: "#ffffff",
                            boxShadow:
                                "inset 0 0 0 8px rgba(255,255,255,0.9), 0 15px 35px rgba(0,0,0,0.1)",
                        }}
                    >
                        {/* Wheel segments */}
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                transition: "transform 4s cubic-bezier(0.33, 1, 0.68, 1)",
                                transform: `rotate(${rotation}deg)`,
                                position: "relative",
                            }}
                        >
                            {segments.map((val, i) => {
                                const degreesPerSegment = 360 / segments.length;
                                const segmentRotation = i * degreesPerSegment;

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: "absolute",
                                            width: "50%",
                                            height: "50%",
                                            left: "50%",
                                            top: "50%",
                                            transformOrigin: "0% 0%",
                                            transform: `rotate(${segmentRotation}deg) skewY(${90 - degreesPerSegment
                                                }deg)`,
                                            background: segmentColors[i % segmentColors.length],
                                            borderRight: "2px solid rgba(255,255,255,0.8)",
                                            borderBottom: "2px solid rgba(255,255,255,0.8)",
                                            transition: "all 0.3s ease",
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Labels container */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                transition: "transform 4s cubic-bezier(0.33, 1, 0.68, 1)",
                                transform: `rotate(${rotation}deg)`,
                                pointerEvents: "none",
                                zIndex: 10,
                            }}
                        >
                            {segments.map((val, i) => {
                                const degreesPerSegment = 360 / segments.length;
                                const angle =
                                    (i * degreesPerSegment + degreesPerSegment / 2) *
                                    (Math.PI / 180);
                                const radius = wheelRadius;
                                const x = Math.cos(angle - Math.PI / 2) * radius;
                                const y = Math.sin(angle - Math.PI / 2) * radius;

                                return (
                                    <div
                                        key={`label-${i}`}
                                        style={{
                                            position: "absolute",
                                            left: "50%",
                                            top: "50%",
                                            transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${-rotation}deg)`,
                                            color: "#ffffff",
                                            fontWeight: "900",
                                            fontSize: "clamp(0.7rem, 2vw, 1rem)",
                                            textShadow:
                                                "2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)",
                                            zIndex: 2,
                                            pointerEvents: "none",
                                            letterSpacing: "0.5px",
                                            textAlign: "center",
                                            whiteSpace: "nowrap",
                                            transition: "transform 4s cubic-bezier(0.33, 1, 0.68, 1)",
                                        }}
                                    >
                                        {val}৳
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pointer */}
                        <div
                            style={{
                                position: "absolute",
                                top: "-20px",
                                left: "51%",
                                transform: "translateX(-50%) rotate(60deg)",
                                zIndex: 10,
                            }}
                        >
                            <div
                                style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: "20px solid transparent",
                                    borderRight: "20px solid transparent",
                                    borderBottom: "30px solid #ffffff",
                                    filter: "drop-shadow(2px 2px 6px rgba(0,0,0,0.4))",
                                }}
                            />
                        </div>

                        {/* Center Hub */}
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: "50px",
                                height: "50px",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                borderRadius: "50%",
                                border: "4px solid #ffffff",
                                zIndex: 5,
                                boxShadow:
                                    "0 4px 12px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "20px",
                                    height: "20px",
                                    backgroundColor: "#ffffff",
                                    borderRadius: "50%",
                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Messages and Actions */}
                <div className="text-center">
                    <div style={{ marginBottom: ".3rem", minHeight: "1.5rem" }}>
                        {getMainMessage()}
                    </div>

                    <p
                        style={{
                            minHeight: "1rem",
                            fontSize: "clamp(0.8rem, 2vw, 0.95rem)",
                            color: "#6b7280",
                            marginBottom: "1rem",
                        }}
                    >
                        {getSubMessage()}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {renderActionButtons()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpinnerModal;
