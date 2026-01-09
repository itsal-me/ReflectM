"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { DynamicAura } from "./DynamicAura";
import { WeatherBadge } from "./WeatherBadge";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
    Music,
    Sparkles,
    History,
    LogOut,
    TrendingUp,
    User as UserIcon,
} from "lucide-react";
import { getTimeOfDay } from "@/lib/context/weather";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DashboardClientProps {
    user: User;
    spotifyConnected: boolean;
}

interface Track {
    song: string;
    artist: string;
}

interface PlaylistResult {
    playlist_name: string;
    tracks: Track[];
    narrative: string;
    valence: number;
    energy: number;
    spotify_url?: string;
}

export function DashboardClient({
    user,
    spotifyConnected,
}: DashboardClientProps) {
    const [prompt, setPrompt] = useState("");
    const [discoveryMode, setDiscoveryMode] = useState(false);
    const [weatherSync, setWeatherSync] = useState(true);
    const [weather, setWeather] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PlaylistResult | null>(null);
    const [reflections, setReflections] = useState<any[]>([]);
    const [topTracks, setTopTracks] = useState<any>(null);
    const [vibeAnalysis, setVibeAnalysis] = useState<any>(null);
    const [vibeHistory, setVibeHistory] = useState<any[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(false);
    const [loadingVibe, setLoadingVibe] = useState(false);
    const [showSessionExpired, setShowSessionExpired] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Load vibe analysis on mount
    useEffect(() => {
        if (spotifyConnected && !showSessionExpired) {
            loadVibeAnalysis();
        }
    }, [spotifyConnected, showSessionExpired]);

    const handleConnectSpotify = async () => {
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            toast.error("Spotify credentials not configured");
            return;
        }

        // Clear stored Spotify tokens before reconnecting to force fresh auth
        try {
            await fetch("/api/logout", {
                method: "POST",
            });
            console.log("Cleared Spotify tokens before reconnect");
        } catch (error) {
            console.error("Failed to clear tokens:", error);
            // Continue anyway
        }

        const scopes = [
            "playlist-modify-public",
            "playlist-modify-private",
            "user-top-read",
            "user-read-private",
            "user-read-email",
            "user-read-recently-played",
            "user-library-read",
        ].join(" ");

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            redirect_uri: redirectUri,
            scope: scopes,
            show_dialog: "true",
            // Add timestamp to force new auth flow and bypass Spotify's permission cache
            state: Date.now().toString(),
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    };

    const handleLogout = async () => {
        try {
            // Call server-side logout API to clear all cookies and tokens
            const response = await fetch("/api/logout", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Logout failed");
            }

            // Also clear client-side session
            await supabase.auth.signOut();

            toast.success("Logged out successfully");
            router.push("/");
        } catch (error) {
            console.error("Logout error:", error);
            // Still try to sign out client-side even if API fails
            await supabase.auth.signOut();
            toast.error("Logout completed, but some data may remain cached");
            router.push("/");
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a mood description");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Generating your playlist...");

        try {
            // Call the generate API
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    discoveryMode,
                    weather: weatherSync ? weather : null,
                    timeOfDay: getTimeOfDay(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to generate playlist"
                );
            }

            const data = await response.json();

            // Store in session storage for confirmation page
            sessionStorage.setItem("pending_playlist", JSON.stringify(data));

            toast.success("Playlist generated! Review and confirm.", {
                id: toastId,
            });

            // Redirect to confirmation page
            router.push("/confirm-playlist");
        } catch (error) {
            console.error("Generation error:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to generate playlist. Please try again.",
                { id: toastId }
            );
        } finally {
            setLoading(false);
        }
    };

    const loadReflections = async () => {
        try {
            const response = await fetch("/api/reflections");
            const body = await response.json();

            if (!response.ok) {
                throw new Error(body.error || "Failed to fetch reflections");
            }

            setReflections(body.data || []);
        } catch (error) {
            console.error("Error loading reflections:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Could not load your reflections"
            );
        }
    };

    const loadTopTracks = async (forceRefresh = false) => {
        setLoadingTracks(true);
        try {
            const url = forceRefresh
                ? "/api/top-tracks?refresh=true"
                : "/api/top-tracks";
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(
                    "Top tracks API error:",
                    response.status,
                    errorData
                );

                // Check if it's a permissions error (403 or token expired)
                if (response.status === 403 || response.status === 401) {
                    setShowSessionExpired(true);
                    toast.error(
                        "Spotify permission denied. Logout and login again.",
                        { duration: 10000 }
                    );
                    throw new Error("Spotify permissions expired");
                }

                throw new Error(
                    errorData.error || "Failed to fetch top tracks"
                );
            }
            const data = await response.json();
            console.log("Top tracks loaded:", data);
            setTopTracks(data);

            // After analysis, refresh vibe data from database
            if (forceRefresh) {
                await loadVibeAnalysis();
                toast.success("Vibe analysis updated!");
            }
        } catch (error) {
            console.error("Error loading top tracks:", error);
            if (!(error as Error).message.includes("permissions expired")) {
                toast.error("Failed to load your listening history");
            }
        } finally {
            setLoadingTracks(false);
        }
    };

    const loadVibeAnalysis = async () => {
        setLoadingVibe(true);
        try {
            // Fetch latest vibe analysis
            const { data, error } = await supabase
                .from("vibe_analysis")
                .select("*")
                .eq("user_id", user.id)
                .order("analyzed_at", { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    // No analysis yet
                    console.log("No vibe analysis found yet");
                    setVibeAnalysis(null);
                } else {
                    throw error;
                }
            } else {
                console.log("✓ Loaded latest vibe analysis:", data);
                setVibeAnalysis(data);
            }

            // Fetch analysis history (last 10)
            const { data: historyData } = await supabase
                .from("vibe_analysis")
                .select("*")
                .eq("user_id", user.id)
                .order("analyzed_at", { ascending: false })
                .limit(10);

            if (historyData) {
                console.log(`✓ Loaded ${historyData.length} analysis records`);
                setVibeHistory(historyData);
            }
        } catch (error) {
            console.error("Error loading vibe analysis:", error);
        } finally {
            setLoadingVibe(false);
        }
    };

    return (
        <>
            <DynamicAura
                valence={result?.valence || 0.5}
                energy={result?.energy || 0.5}
            />

            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-4 md:p-8">
                {/* Session Expiry Warning Banner */}
                {showSessionExpired && (
                    <div className="max-w-6xl mx-auto mb-4 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-xl border-2 border-red-500/50 rounded-xl p-4 shadow-lg shadow-red-500/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center border border-red-500/50 flex-shrink-0">
                                <svg
                                    className="w-5 h-5 text-red-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm md:text-base">
                                    🔄 Spotify Connection Required
                                </p>
                                <p className="text-white/80 text-xs md:text-sm">
                                    Please connect or reconnect your Spotify
                                    account to continue using ReflectM features.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="max-w-6xl mx-auto">
                    {/* Enhanced Profile Info Section */}
                    <div className="relative group mb-8">
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-cyan-500/20 rounded-[1.5rem] blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 bg-gradient-to-br from-zinc-900/95 to-black/90 backdrop-blur-2xl border border-zinc-700/70 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
                            <div className="flex items-start gap-6 flex-1">
                                {/* Profile Image or Icon */}
                                {user.user_metadata?.avatar_url ? (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-zinc-700 ring-2 ring-zinc-800 shadow-xl">
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt={
                                                user.user_metadata
                                                    ?.display_name || "Profile"
                                            }
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.log(
                                                    "Image load error, falling back to icon"
                                                );
                                                e.currentTarget.style.display =
                                                    "none";
                                                if (
                                                    e.currentTarget
                                                        .parentElement
                                                ) {
                                                    e.currentTarget.parentElement.innerHTML =
                                                        '<div class="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700"><svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';
                                                }
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                                        <Music className="w-8 h-8 text-gray-400" />
                                    </div>
                                )}

                                {/* User Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent tracking-tight">
                                            ReflectM
                                        </h1>
                                        {spotifyConnected &&
                                            !showSessionExpired && (
                                                <div className="px-2.5 py-1 bg-gradient-to-r from-[#1DB954]/20 to-emerald-500/20 border border-[#1DB954]/40 rounded-full flex items-center gap-1.5 shrink-0">
                                                    <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse"></div>
                                                    <span className="text-xs font-semibold text-[#1DB954] whitespace-nowrap">
                                                        Connected
                                                    </span>
                                                </div>
                                            )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xl font-bold text-white">
                                            Welcome back,{" "}
                                            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                                                {user.user_metadata
                                                    ?.display_name ||
                                                    user.email?.split("@")[0] ||
                                                    "User"}
                                            </span>
                                            !
                                        </p>

                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/30 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-purple-500/20 transition-all">
                                            <svg
                                                className="w-4 h-4 text-purple-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                />
                                            </svg>
                                            <span className="text-sm text-gray-300 font-medium">
                                                {user.email}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 lg:flex-col lg:items-stretch w-full lg:w-auto">
                                {(!spotifyConnected || showSessionExpired) && (
                                    <Button
                                        onClick={handleConnectSpotify}
                                        className="flex-1 lg:flex-initial bg-gradient-to-r from-[#1DB954] to-emerald-500 hover:from-[#1ed760] hover:to-emerald-400 text-black font-bold shadow-xl hover:shadow-green-500/40 transition-all duration-300 border border-[#1DB954]/20"
                                    >
                                        <Music className="w-4 h-4 mr-2" />
                                        {spotifyConnected
                                            ? "Reconnect"
                                            : "Connect"}{" "}
                                        Spotify
                                    </Button>
                                )}
                                <Button
                                    onClick={handleLogout}
                                    variant="outline"
                                    className="flex-1 lg:flex-initial text-white bg-zinc-900/50 hover:bg-red-500/20 border-zinc-700 hover:border-red-500/50 transition-all shadow-lg font-semibold"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="generate" className="space-y-6">
                        <TabsList className="bg-gradient-to-br from-zinc-900/90 to-black/70 backdrop-blur-2xl border border-zinc-700/50 p-1.5 shadow-xl">
                            <TabsTrigger
                                value="generate"
                                className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-600/40 data-[state=active]:to-emerald-600/30 data-[state=active]:border data-[state=active]:border-green-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/20 font-medium"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/40 data-[state=active]:to-violet-600/30 data-[state=active]:border data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 font-medium"
                                onClick={loadReflections}
                            >
                                <History className="w-4 h-4 mr-2" />
                                Reflections
                            </TabsTrigger>
                            <TabsTrigger
                                value="personality"
                                className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600/40 data-[state=active]:to-cyan-600/30 data-[state=active]:border data-[state=active]:border-blue-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20 font-medium"
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Your Vibe
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="generate" className="space-y-6">
                            {/* Main Input Card - Enhanced Glassmorphism */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-600/30 rounded-[1.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <Card className="relative bg-gradient-to-br from-zinc-900/95 to-black/90 backdrop-blur-2xl border-zinc-700/70 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
                                    <CardHeader>
                                        <CardTitle className="text-white text-2xl flex items-center gap-3 font-semibold">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600/40 to-emerald-600/30 flex items-center justify-center border border-green-500/50 shadow-lg shadow-green-500/20">
                                                <Sparkles className="w-5 h-5 text-green-300" />
                                            </div>
                                            Describe Your Mood
                                        </CardTitle>
                                        <CardDescription className="text-gray-300 ml-13 text-base">
                                            Tell me how you're feeling, and I'll
                                            create the perfect soundtrack
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Textarea
                                            placeholder="e.g., Rainy Sunday morning, feeling nostalgic and contemplative..."
                                            value={prompt}
                                            onChange={(e) =>
                                                setPrompt(e.target.value)
                                            }
                                            className="min-h-[120px] bg-zinc-900/60 backdrop-blur-sm border-zinc-700/60 text-white placeholder:text-gray-400 focus:border-green-500/70 focus:bg-zinc-900/80 transition-all resize-none shadow-inner"
                                        />

                                        {/* Controls with enhanced toggle buttons - responsive */}
                                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center justify-between">
                                            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 w-full sm:w-auto">
                                                <div className="group flex items-center space-x-3 px-4 py-2.5 bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 backdrop-blur-sm border-2 border-zinc-700/60 rounded-xl hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 w-full xs:w-auto">
                                                    <Switch
                                                        id="discovery"
                                                        checked={discoveryMode}
                                                        onCheckedChange={
                                                            setDiscoveryMode
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="discovery"
                                                        className="text-gray-100 text-sm font-semibold cursor-pointer select-none flex items-center gap-2 group-hover:text-white transition-colors whitespace-nowrap"
                                                    >
                                                        <span className="text-base">
                                                            {discoveryMode
                                                                ? "🔍"
                                                                : "💚"}
                                                        </span>
                                                        <span className="hidden xs:inline">
                                                            {discoveryMode
                                                                ? "Discovery Mode"
                                                                : "Comfort Zone"}
                                                        </span>
                                                        <span className="xs:hidden">
                                                            {discoveryMode
                                                                ? "Discovery"
                                                                : "Comfort"}
                                                        </span>
                                                    </label>
                                                </div>

                                                <div className="group flex items-center space-x-3 px-4 py-2.5 bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 backdrop-blur-sm border-2 border-zinc-700/60 rounded-xl hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 w-full xs:w-auto">
                                                    <Switch
                                                        id="weather"
                                                        checked={weatherSync}
                                                        onCheckedChange={
                                                            setWeatherSync
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="weather"
                                                        className="text-gray-100 text-sm font-semibold cursor-pointer select-none flex items-center gap-2 group-hover:text-white transition-colors whitespace-nowrap"
                                                    >
                                                        <span className="text-base">
                                                            🌤️
                                                        </span>
                                                        Weather Sync
                                                    </label>
                                                </div>
                                            </div>

                                            <WeatherBadge
                                                enabled={weatherSync}
                                                onWeatherUpdate={setWeather}
                                            />
                                        </div>

                                        <Button
                                            onClick={handleGenerate}
                                            disabled={loading || !prompt.trim()}
                                            className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-400 hover:via-emerald-400 hover:to-green-500 text-black font-bold text-lg h-14 rounded-xl shadow-[0_8px_30px_rgb(34,197,94,0.3)] hover:shadow-[0_8px_40px_rgb(34,197,94,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-3"></div>
                                                    Generating Magic...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5 mr-2" />
                                                    Generate Playlist
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Loading State */}
                            {loading && (
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-[1.5rem] blur-xl opacity-75 animate-pulse"></div>
                                    <Card className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                        <CardContent className="p-8 space-y-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center animate-pulse">
                                                    <Sparkles className="w-6 h-6 text-purple-300 animate-spin" />
                                                </div>
                                                <Skeleton className="h-10 flex-1 bg-white/10" />
                                            </div>
                                            <Skeleton className="h-24 w-full bg-white/10" />
                                            <div className="space-y-3">
                                                {[...Array(5)].map((_, i) => (
                                                    <Skeleton
                                                        key={i}
                                                        className="h-16 w-full bg-white/10"
                                                        style={{
                                                            animationDelay: `${
                                                                i * 100
                                                            }ms`,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Result */}
                            {result && !loading && (
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-600/30 rounded-[1.5rem] blur-2xl opacity-75"></div>
                                    <Card className="relative bg-gradient-to-br from-zinc-900/95 to-black/90 backdrop-blur-2xl border-zinc-700/70 overflow-hidden shadow-2xl">
                                        {/* Top accent bar */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-400 to-green-500"></div>

                                        <CardHeader className="pb-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-600/40 to-emerald-600/30 flex items-center justify-center border border-green-500/50 shrink-0 shadow-lg shadow-green-500/20">
                                                    <Music className="w-7 h-7 text-green-300" />
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-white text-3xl mb-3 leading-tight font-bold">
                                                        {result.playlist_name}
                                                    </CardTitle>
                                                    <CardDescription className="text-gray-200 text-base italic leading-relaxed bg-zinc-900/70 backdrop-blur-sm border border-zinc-700/60 rounded-xl p-4 shadow-inner">
                                                        <span className="text-2xl text-green-300 mr-2">
                                                            "
                                                        </span>
                                                        {result.narrative}
                                                        <span className="text-2xl text-green-300 ml-2">
                                                            "
                                                        </span>
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[400px] pr-4">
                                                <div className="space-y-3">
                                                    {result.tracks.map(
                                                        (track, index) => (
                                                            <div
                                                                key={index}
                                                                className="group/track relative bg-zinc-900/60 backdrop-blur-sm hover:bg-zinc-800/80 rounded-xl p-5 border border-zinc-700/50 hover:border-green-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-green-500/20"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600/40 to-emerald-600/30 flex items-center justify-center border border-green-500/50 font-bold text-green-300 shrink-0 shadow-md">
                                                                        {index +
                                                                            1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-semibold text-white text-lg group-hover/track:text-green-300 transition-colors truncate">
                                                                            {
                                                                                track.song
                                                                            }
                                                                        </div>
                                                                        <div className="text-gray-300 text-sm mt-1 truncate">
                                                                            {
                                                                                track.artist
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </ScrollArea>

                                            {result.spotify_url && (
                                                <Button
                                                    onClick={() =>
                                                        window.open(
                                                            result.spotify_url,
                                                            "_blank"
                                                        )
                                                    }
                                                    className="w-full mt-6 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-400 hover:via-emerald-400 hover:to-green-500 text-black font-bold text-lg h-14 rounded-xl shadow-[0_8px_30px_rgb(34,197,94,0.3)] hover:shadow-[0_8px_40px_rgb(34,197,94,0.5)] transition-all duration-300"
                                                >
                                                    <Music className="w-5 h-5 mr-2" />
                                                    Open in Spotify
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history">
                            <div className="space-y-4">
                                {reflections.length === 0 ? (
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-[1.5rem] blur-xl"></div>
                                        <Card className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                            <CardContent className="p-16 text-center">
                                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center border border-purple-500/20">
                                                    <History className="w-10 h-10 text-purple-400" />
                                                </div>
                                                <p className="text-white/70 text-lg mb-2">
                                                    No reflections yet
                                                </p>
                                                <p className="text-white/50 text-sm">
                                                    Generate your first playlist
                                                    to start your musical
                                                    journey
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    reflections.map((reflection) => (
                                        <div
                                            key={reflection.id}
                                            className="relative group"
                                        >
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                                            <Card className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20 hover:bg-white/[0.12] hover:border-white/30 transition-all">
                                                <CardHeader>
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                                                            <Music className="w-6 h-6 text-purple-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <CardTitle className="text-white text-xl mb-2">
                                                                {
                                                                    reflection.playlist_name
                                                                }
                                                            </CardTitle>
                                                            <CardDescription className="text-white/70 italic text-sm leading-relaxed mb-3">
                                                                "
                                                                {
                                                                    reflection.narrative
                                                                }
                                                                "
                                                            </CardDescription>
                                                            <div className="flex items-center justify-between gap-3 mt-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                                                    <p className="text-white/50 text-xs">
                                                                        {new Date(
                                                                            reflection.created_at
                                                                        ).toLocaleDateString(
                                                                            "en-US",
                                                                            {
                                                                                month: "long",
                                                                                day: "numeric",
                                                                                year: "numeric",
                                                                            }
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                {reflection.spotify_playlist_url && (
                                                                    <Button
                                                                        onClick={() =>
                                                                            window.open(
                                                                                reflection.spotify_playlist_url,
                                                                                "_blank"
                                                                            )
                                                                        }
                                                                        className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold text-xs shadow-md hover:shadow-green-500/30 transition-all h-8 px-3"
                                                                    >
                                                                        <Music className="w-3 h-3 mr-1" />
                                                                        Open in
                                                                        Spotify
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="personality">
                            {loadingTracks || loadingVibe ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <Card
                                            key={i}
                                            className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20"
                                        >
                                            <CardContent className="p-8">
                                                <Skeleton className="h-8 w-3/4 bg-white/10 mb-4" />
                                                <Skeleton className="h-24 w-full bg-white/10" />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : vibeAnalysis ? (
                                <div className="space-y-6">
                                    {/* Reanalyze Button */}
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={() => loadTopTracks(true)}
                                            disabled={loadingTracks}
                                            variant="outline"
                                            className="text-white bg-zinc-900/50 border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-500 font-semibold"
                                        >
                                            {loadingTracks ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <TrendingUp className="w-4 h-4 mr-2" />
                                                    Reanalyze My Vibe
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Personality Type Card */}
                                    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-2xl border-blue-500/30">
                                        <CardHeader>
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                                    <UserIcon className="w-7 h-7 text-blue-400" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-white text-2xl">
                                                        {
                                                            vibeAnalysis.personality_type
                                                        }
                                                    </CardTitle>
                                                    <CardDescription className="text-white/70">
                                                        Your Musical Personality
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex flex-wrap gap-2">
                                                {vibeAnalysis.personality_traits.map(
                                                    (
                                                        trait: string,
                                                        i: number
                                                    ) => (
                                                        <span
                                                            key={i}
                                                            className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-medium"
                                                        >
                                                            {trait}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed">
                                                {
                                                    vibeAnalysis.personality_description
                                                }
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Metrics Card */}
                                    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                        <CardHeader>
                                            <CardTitle className="text-white">
                                                Your Listening Insights
                                            </CardTitle>
                                            <CardDescription className="text-white/70">
                                                Based on your vibe analysis
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {[
                                                {
                                                    key: "valence",
                                                    label: "Positivity",
                                                },
                                                {
                                                    key: "energy",
                                                    label: "Energy",
                                                },
                                                {
                                                    key: "danceability",
                                                    label: "Danceability",
                                                },
                                                {
                                                    key: "acousticness",
                                                    label: "Acousticness",
                                                },
                                                {
                                                    key: "instrumentalness",
                                                    label: "Instrumentalness",
                                                },
                                            ].map(({ key, label }) => {
                                                const value = vibeAnalysis[
                                                    key as keyof typeof vibeAnalysis
                                                ] as number;
                                                return (
                                                    <div key={key}>
                                                        <div className="flex justify-between mb-2">
                                                            <span className="text-white/80">
                                                                {label}
                                                            </span>
                                                            <span className="text-[#1DB954] font-bold">
                                                                {Math.round(
                                                                    value
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] transition-all duration-500"
                                                                style={{
                                                                    width: `${Math.round(
                                                                        value
                                                                    )}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>

                                    {/* Top Tracks Card */}
                                    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                        <CardHeader>
                                            <CardTitle className="text-white">
                                                Analyzed Tracks
                                            </CardTitle>
                                            <CardDescription className="text-white/70">
                                                From your vibe analysis
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[400px] pr-4">
                                                <div className="space-y-3">
                                                    {vibeAnalysis.tracks
                                                        .slice(0, 20)
                                                        .map(
                                                            (
                                                                track: any,
                                                                index: number
                                                            ) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex items-center gap-4 p-3 bg-white/[0.05] hover:bg-white/[0.12] rounded-xl transition-colors"
                                                                >
                                                                    <div className="w-10 h-10 rounded bg-[#1DB954]/20 flex items-center justify-center font-bold text-[#1DB954] text-sm">
                                                                        {index +
                                                                            1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-semibold text-white truncate">
                                                                            {
                                                                                track.name
                                                                            }
                                                                        </div>
                                                                        <div className="text-sm text-gray-400 truncate">
                                                                            {
                                                                                track.artist
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>

                                    {/* Vibe History */}
                                    {vibeHistory.length > 1 && (
                                        <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                            <CardHeader>
                                                <CardTitle className="text-white text-lg md:text-xl">
                                                    Vibe Analysis History
                                                </CardTitle>
                                                <CardDescription className="text-white/70 text-sm">
                                                    Your last 5 analyses
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 md:space-y-3">
                                                    {vibeHistory
                                                        .slice(1, 6)
                                                        .map(
                                                            (
                                                                analysis: any,
                                                                index: number
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        analysis.id
                                                                    }
                                                                    onClick={() => {
                                                                        setVibeAnalysis(
                                                                            analysis
                                                                        );
                                                                        window.scrollTo(
                                                                            {
                                                                                top: 0,
                                                                                behavior:
                                                                                    "smooth",
                                                                            }
                                                                        );
                                                                    }}
                                                                    className="group/analysis cursor-pointer p-3 md:p-4 bg-white/[0.05] hover:bg-blue-500/20 active:bg-blue-500/30 rounded-xl transition-all duration-300 border border-white/10 hover:border-blue-500/50 active:scale-[0.98]"
                                                                >
                                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center border border-blue-500/30 shrink-0">
                                                                                <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="font-semibold text-white text-sm sm:text-base group-hover/analysis:text-blue-300 transition-colors truncate">
                                                                                    {
                                                                                        analysis.personality_type
                                                                                    }
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                                                                                    <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                                                                                        {new Date(
                                                                                            analysis.analyzed_at
                                                                                        ).toLocaleDateString(
                                                                                            "en-US",
                                                                                            {
                                                                                                month: "short",
                                                                                                day: "numeric",
                                                                                                year: "numeric",
                                                                                            }
                                                                                        )}
                                                                                    </span>
                                                                                    <span className="text-[10px] sm:text-xs text-gray-500">
                                                                                        •
                                                                                    </span>
                                                                                    <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                                                                                        {
                                                                                            analysis
                                                                                                .tracks
                                                                                                .length
                                                                                        }{" "}
                                                                                        tracks
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:shrink-0 ml-[52px] sm:ml-0">
                                                                            {analysis.personality_traits
                                                                                .slice(
                                                                                    0,
                                                                                    2
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        trait: string,
                                                                                        i: number
                                                                                    ) => (
                                                                                        <span
                                                                                            key={
                                                                                                i
                                                                                            }
                                                                                            className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-[10px] sm:text-xs font-medium whitespace-nowrap"
                                                                                        >
                                                                                            {
                                                                                                trait
                                                                                            }
                                                                                        </span>
                                                                                    )
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            ) : (
                                <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                    <CardContent className="p-16 text-center">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center border border-blue-500/20">
                                            <TrendingUp className="w-10 h-10 text-blue-400" />
                                        </div>
                                        <p className="text-white/70 text-lg mb-4 font-semibold">
                                            Discover Your Musical Personality
                                        </p>
                                        <p className="text-white/50 text-sm mb-6">
                                            Analyze your Spotify listening
                                            habits to uncover your unique
                                            musical vibe
                                        </p>
                                        <Button
                                            onClick={() => loadTopTracks()}
                                            disabled={loadingTracks}
                                            className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-400 hover:via-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
                                        >
                                            {loadingTracks ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <TrendingUp className="w-5 h-5 mr-2" />
                                                    Analyze My Vibe
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    );
}
