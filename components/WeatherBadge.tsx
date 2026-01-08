"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle } from "lucide-react";
import { getClientLocation } from "@/lib/context/weather";

interface WeatherBadgeProps {
    onWeatherUpdate?: (weather: string) => void;
    enabled: boolean;
}

export function WeatherBadge({ onWeatherUpdate, enabled }: WeatherBadgeProps) {
    const [weather, setWeather] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setWeather(null);
            return;
        }

        async function fetchWeather() {
            setLoading(true);
            try {
                const position = await getClientLocation();
                if (!position) {
                    setWeather(null);
                    return;
                }

                const response = await fetch(
                    `/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
                );

                if (response.ok) {
                    const data = await response.json();
                    setWeather(data.weather);
                    if (onWeatherUpdate) {
                        onWeatherUpdate(data.weather);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch weather:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchWeather();
    }, [enabled, onWeatherUpdate]);

    if (!enabled || !weather) {
        return null;
    }

    const weatherLower = weather.toLowerCase();
    let Icon = Cloud;

    if (weatherLower.includes("rain")) {
        Icon = CloudRain;
    } else if (weatherLower.includes("drizzle")) {
        Icon = CloudDrizzle;
    } else if (weatherLower.includes("snow")) {
        Icon = CloudSnow;
    } else if (weatherLower.includes("clear") || weatherLower.includes("sun")) {
        Icon = Sun;
    }

    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm">
            <Icon className="w-4 h-4" />
            <span>{weather}</span>
        </div>
    );
}
