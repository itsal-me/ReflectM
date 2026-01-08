"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Music, Loader2, CheckCircle2, XCircle } from "lucide-react";

function ConnectingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"connecting" | "success" | "error">(
        "connecting"
    );
    const [message, setMessage] = useState("Connecting to Spotify...");

    useEffect(() => {
        const error = searchParams.get("error");

        if (error) {
            setStatus("error");
            setMessage(
                error === "auth_failed"
                    ? "Authentication failed. Please try again."
                    : "An error occurred during authentication."
            );
            setTimeout(() => router.push("/"), 3000);
            return;
        }

        // Simulate connection process
        const timer = setTimeout(() => {
            setStatus("success");
            setMessage("Successfully connected!");
            setTimeout(() => router.push("/dashboard"), 1500);
        }, 2000);

        return () => clearTimeout(timer);
    }, [router, searchParams]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Animated Logo */}
                <div className="mb-8 flex justify-center">
                    <div
                        className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500 ${
                            status === "connecting"
                                ? "bg-[#1DB954] animate-pulse"
                                : status === "success"
                                ? "bg-[#1DB954] scale-110"
                                : "bg-red-500"
                        }`}
                    >
                        {status === "connecting" && (
                            <Loader2 className="w-12 h-12 text-black animate-spin" />
                        )}
                        {status === "success" && (
                            <CheckCircle2 className="w-12 h-12 text-black animate-bounce" />
                        )}
                        {status === "error" && (
                            <XCircle className="w-12 h-12 text-white" />
                        )}
                    </div>
                </div>

                {/* Status Message */}
                <h1 className="text-3xl font-bold text-white mb-4">
                    {status === "connecting" && "Connecting..."}
                    {status === "success" && "All Set!"}
                    {status === "error" && "Oops!"}
                </h1>

                <p className="text-gray-400 text-lg">{message}</p>

                {/* Progress Indicator */}
                {status === "connecting" && (
                    <div className="mt-8">
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1DB954] animate-progress"></div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes progress {
                    0% {
                        width: 0%;
                    }
                    100% {
                        width: 100%;
                    }
                }
                .animate-progress {
                    animation: progress 2s ease-in-out;
                }
            `}</style>
        </div>
    );
}

export default function ConnectingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-black flex items-center justify-center p-4">
                    <div className="w-24 h-24 rounded-3xl bg-[#1DB954] flex items-center justify-center animate-pulse">
                        <Loader2 className="w-12 h-12 text-black animate-spin" />
                    </div>
                </div>
            }
        >
            <ConnectingContent />
        </Suspense>
    );
}
