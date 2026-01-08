"use client";

import { useState } from "react";
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
    const [loadingTracks, setLoadingTracks] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleConnectSpotify = () => {
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            toast.error("Spotify credentials not configured");
            return;
        }

        const scopes = [
            "playlist-modify-public",
            "playlist-modify-private",
            "user-top-read",
            "user-read-private",
            "user-read-email",
        ].join(" ");

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            redirect_uri: redirectUri,
            scope: scopes,
            show_dialog: "true",
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Logged out successfully");
        router.push("/");
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
        const { data } = await supabase
            .from("reflections")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) {
            setReflections(data);
        }
    };

    const loadTopTracks = async () => {
        setLoadingTracks(true);
        try {
            const response = await fetch("/api/top-tracks");
            if (!response.ok) {
                throw new Error("Failed to fetch top tracks");
            }
            const data = await response.json();
            setTopTracks(data);
        } catch (error) {
            console.error("Error loading top tracks:", error);
            toast.error("Failed to load your listening history");
        } finally {
            setLoadingTracks(false);
        }
    };

    return (
        <>
            <DynamicAura
                valence={result?.valence || 0.5}
                energy={result?.energy || 0.5}
            />

            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header with enhanced contrast */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 p-6 bg-gradient-to-br from-zinc-900/80 to-black/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1DB954] to-[#1ed760] flex items-center justify-center shadow-lg shadow-green-500/30">
                                <Music className="w-8 h-8 text-black" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                    ReflectM
                                </h1>
                                <p className="text-gray-300 text-sm font-medium">
                                    AI-Powered Playlist Generator
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="text-white bg-zinc-900/50 hover:bg-[#1DB954] hover:text-black border-zinc-700 hover:border-[#1DB954] transition-all shadow-lg hover:shadow-green-500/30 font-medium"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
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
                                onClick={loadTopTracks}
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

                                        {/* Controls with enhanced toggle buttons */}
                                        <div className="flex flex-wrap gap-4 items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="group flex items-center space-x-3 px-5 py-3 bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 backdrop-blur-sm border-2 border-zinc-700/60 rounded-xl hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300">
                                                    <Switch
                                                        id="discovery"
                                                        checked={discoveryMode}
                                                        onCheckedChange={
                                                            setDiscoveryMode
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="discovery"
                                                        className="text-gray-100 text-sm font-semibold cursor-pointer select-none flex items-center gap-2 group-hover:text-white transition-colors"
                                                    >
                                                        <span className="text-lg">
                                                            {discoveryMode
                                                                ? "🔍"
                                                                : "💚"}
                                                        </span>
                                                        {discoveryMode
                                                            ? "Discovery Mode"
                                                            : "Comfort Zone"}
                                                    </label>
                                                </div>

                                                <div className="group flex items-center space-x-3 px-5 py-3 bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 backdrop-blur-sm border-2 border-zinc-700/60 rounded-xl hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
                                                    <Switch
                                                        id="weather"
                                                        checked={weatherSync}
                                                        onCheckedChange={
                                                            setWeatherSync
                                                        }
                                                    />
                                                    <label
                                                        htmlFor="weather"
                                                        className="text-gray-100 text-sm font-semibold cursor-pointer select-none flex items-center gap-2 group-hover:text-white transition-colors"
                                                    >
                                                        <span className="text-lg">
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
                                            <Card className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20 hover:bg-white/[0.12] hover:border-white/30 transition-all cursor-pointer">
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
                                                            <CardDescription className="text-white/70 italic text-sm leading-relaxed">
                                                                "
                                                                {
                                                                    reflection.narrative
                                                                }
                                                                "
                                                            </CardDescription>
                                                            <div className="flex items-center gap-2 mt-3">
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
                            {loadingTracks ? (
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
                            ) : topTracks ? (
                                <div className="space-y-6">
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
                                                            topTracks
                                                                .personality
                                                                .type
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
                                                {topTracks.personality.traits.map(
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
                                            <div className="space-y-2">
                                                {topTracks.personality.description.map(
                                                    (
                                                        desc: string,
                                                        i: number
                                                    ) => (
                                                        <p
                                                            key={i}
                                                            className="text-white/80 text-sm"
                                                        >
                                                            • {desc}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Metrics Card */}
                                    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                        <CardHeader>
                                            <CardTitle className="text-white">
                                                Your Listening Patterns
                                            </CardTitle>
                                            <CardDescription className="text-white/70">
                                                Based on your top tracks from
                                                the last month
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {Object.entries(
                                                topTracks.metrics
                                            ).map(
                                                ([key, value]: [
                                                    string,
                                                    any
                                                ]) => (
                                                    <div key={key}>
                                                        <div className="flex justify-between mb-2">
                                                            <span className="text-white/80 capitalize">
                                                                {key}
                                                            </span>
                                                            <span className="text-[#1DB954] font-bold">
                                                                {value}%
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] transition-all duration-500"
                                                                style={{
                                                                    width: `${value}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Top Tracks Card */}
                                    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                        <CardHeader>
                                            <CardTitle className="text-white">
                                                Your Top Tracks
                                            </CardTitle>
                                            <CardDescription className="text-white/70">
                                                Last 4 weeks
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[400px] pr-4">
                                                <div className="space-y-3">
                                                    {topTracks.tracks
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
                                </div>
                            ) : (
                                <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-white/20">
                                    <CardContent className="p-16 text-center">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center border border-blue-500/20">
                                            <TrendingUp className="w-10 h-10 text-blue-400" />
                                        </div>
                                        <p className="text-white/70 text-lg mb-2">
                                            No listening data yet
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            Start listening to music on Spotify
                                            to see your personality analysis
                                        </p>
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
