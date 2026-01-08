"use client";

import { useEffect, useState } from "react";

interface DynamicAuraProps {
    valence: number; // 0-1 (sad to happy)
    energy: number; // 0-1 (calm to energetic)
}

export function DynamicAura({ valence, energy }: DynamicAuraProps) {
    const [gradient, setGradient] = useState("");

    useEffect(() => {
        // Map valence and energy to colors
        const getColors = () => {
            // High valence (happy) = warm colors (gold, pink, orange)
            // Low valence (sad) = cool colors (blue, purple, indigo)
            // High energy = bright, saturated
            // Low energy = muted, darker

            if (valence > 0.7 && energy > 0.7) {
                // Happy & Energetic: Bright warm colors
                return ["#FF6B9D", "#FEC163", "#FF8E53"];
            } else if (valence > 0.7 && energy <= 0.7) {
                // Happy & Calm: Soft warm colors
                return ["#FFB88C", "#FEC8D8", "#FFDDB5"];
            } else if (valence <= 0.3 && energy > 0.7) {
                // Sad & Energetic: Deep dramatic colors
                return ["#667EEA", "#764BA2", "#F093FB"];
            } else if (valence <= 0.3 && energy <= 0.7) {
                // Sad & Calm: Muted cool colors
                return ["#4A5568", "#667EEA", "#5A67D8"];
            } else {
                // Neutral/Mixed
                return ["#6B46C1", "#B794F4", "#E9D5FF"];
            }
        };

        const colors = getColors();
        const newGradient = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
        setGradient(newGradient);
    }, [valence, energy]);

    return (
        <div
            className="fixed inset-0 -z-10 transition-all duration-[2000ms] ease-in-out"
            style={{
                background:
                    gradient ||
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
        >
            {/* Animated blur circles */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-white/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-white/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
        </div>
    );
}
