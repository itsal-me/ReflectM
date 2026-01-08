"use client";

import Image from "next/image";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
    Music,
    Sparkles,
    Brain,
    Palette,
    Globe,
    CheckCircle2,
    ArrowRight,
    Play,
} from "lucide-react";

import Logo from "@/logo.png";

function HomeContent() {
    const searchParams = useSearchParams();

    useEffect(() => {
        // Check for error messages from redirects
        const error = searchParams.get("error");
        if (error) {
            switch (error) {
                case "auth_failed":
                    toast.error("Authentication failed. Please try again.");
                    break;
                case "no_code":
                    toast.error("No authorization code received from Spotify.");
                    break;
                default:
                    toast.error("An error occurred. Please try again.");
            }
        }
    }, [searchParams]);

    const handleSpotifyLogin = () => {
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            toast.error("Spotify is not configured. Please contact support.");
            return;
        }

        const scopes = [
            "playlist-modify-public",
            "playlist-modify-private",
            "user-top-read",
            "user-read-private",
            "user-read-email",
            "user-read-recently-played",
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

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Gradient background */}
            <div className="fixed inset-0 bg-gradient-to-b from-[#1DB954]/10 via-black to-black pointer-events-none" />

            {/* Content */}
            <div className="relative">
                {/* Hero Section */}
                <section className="min-h-screen flex items-center justify-center px-4 py-20">
                    <div className="max-w-6xl w-full mx-auto">
                        <div className="text-center space-y-8 animate-fade-in">
                            {/* Logo */}
                            <div className="inline-flex items-center justify-center gap-2 mb-4">
                                <Music className="w-8 h-8 text-[#1DB954] mr-2" />
                                <span className="text-3xl font-bold">
                                    ReflectM
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
                                Turn Your Mood Into
                                <span className="block text-[#1DB954]">
                                    Spotify Playlists
                                </span>
                            </h1>

                            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                                AI-powered playlist generator that creates
                                personalized music selections with cinematic
                                narratives based on your emotions, weather, and
                                time of day.
                            </p>

                            {/* CTA */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <button
                                    onClick={handleSpotifyLogin}
                                    className="group relative px-8 py-4 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-lg rounded-full transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-[#1DB954]/50 hover:shadow-2xl"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                    Connect with Spotify
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white font-semibold text-lg rounded-full transition-all duration-300 flex items-center gap-2">
                                    <Play className="w-5 h-5" />
                                    Watch Demo
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-[#1DB954]" />
                                    <span>No credit card required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-[#1DB954]" />
                                    <span>Free to use</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-[#1DB954]" />
                                    <span>Instant playlists</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 px-4 border-t border-white/10">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">
                                Powered by Advanced AI
                            </h2>
                            <p className="text-xl text-gray-400">
                                Experience music curation like never before
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Feature 1 */}
                            <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-[#1DB954]/50 transition-all duration-300">
                                <div className="w-14 h-14 rounded-xl bg-[#1DB954]/10 flex items-center justify-center mb-6 group-hover:bg-[#1DB954]/20 transition-colors">
                                    <Brain className="w-7 h-7 text-[#1DB954]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">
                                    AI-Powered Intelligence
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Gemma 3 27B model analyzes your mood
                                    description to curate 15-20 perfectly
                                    matched tracks that resonate with your
                                    emotional state.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-[#1DB954]/50 transition-all duration-300">
                                <div className="w-14 h-14 rounded-xl bg-[#1DB954]/10 flex items-center justify-center mb-6 group-hover:bg-[#1DB954]/20 transition-colors">
                                    <Globe className="w-7 h-7 text-[#1DB954]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">
                                    Context-Aware
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Considers your local weather conditions and
                                    time of day to enhance playlist
                                    recommendations with environmental context.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-[#1DB954]/50 transition-all duration-300">
                                <div className="w-14 h-14 rounded-xl bg-[#1DB954]/10 flex items-center justify-center mb-6 group-hover:bg-[#1DB954]/20 transition-colors">
                                    <Palette className="w-7 h-7 text-[#1DB954]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">
                                    Cinematic Narratives
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Each playlist comes with a unique 2-sentence
                                    story that paints a vivid scene matching the
                                    emotional journey of your music.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="py-20 px-4 border-t border-white/10">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">
                                How It Works
                            </h2>
                            <p className="text-xl text-gray-400">
                                From mood to music in three simple steps
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12">
                            {/* Step 1 */}
                            <div className="text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1DB954]/10 border-2 border-[#1DB954] text-[#1DB954] text-2xl font-bold mb-4">
                                    1
                                </div>
                                <h3 className="text-2xl font-bold">
                                    Connect Spotify
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Securely link your Spotify account with one
                                    click. No password needed, OAuth protected.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1DB954]/10 border-2 border-[#1DB954] text-[#1DB954] text-2xl font-bold mb-4">
                                    2
                                </div>
                                <h3 className="text-2xl font-bold">
                                    Describe Your Mood
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Tell us how you're feeling in your own
                                    words. Be as specific or abstract as you
                                    like.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1DB954]/10 border-2 border-[#1DB954] text-[#1DB954] text-2xl font-bold mb-4">
                                    3
                                </div>
                                <h3 className="text-2xl font-bold">
                                    Get Your Playlist
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Receive a perfectly curated playlist with a
                                    cinematic story, ready to play on Spotify.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Advanced Features */}
                <section className="py-20 px-4 border-t border-white/10">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                    Intelligent Features
                                </h2>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center mt-1">
                                            <CheckCircle2 className="w-4 h-4 text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">
                                                Discovery Mode
                                            </h3>
                                            <p className="text-gray-400">
                                                Toggle between familiar
                                                favorites and new artist
                                                discoveries to match your
                                                exploration mood.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center mt-1">
                                            <CheckCircle2 className="w-4 h-4 text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">
                                                Weather Integration
                                            </h3>
                                            <p className="text-gray-400">
                                                Automatic weather detection
                                                using Open-Meteo enhances AI
                                                understanding of your
                                                environment.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center mt-1">
                                            <CheckCircle2 className="w-4 h-4 text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">
                                                History & Reflections
                                            </h3>
                                            <p className="text-gray-400">
                                                All your generated playlists are
                                                saved, creating a musical
                                                journal of your emotional
                                                journey.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center mt-1">
                                            <CheckCircle2 className="w-4 h-4 text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">
                                                Dynamic Backgrounds
                                            </h3>
                                            <p className="text-gray-400">
                                                Visual auras that shift colors
                                                based on your playlist's mood
                                                and energy levels.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#1DB954]/20 to-purple-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                                    <Sparkles className="w-32 h-32 text-[#1DB954] opacity-50" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 px-4 border-t border-white/10">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <h2 className="text-4xl md:text-6xl font-bold">
                            Ready to Transform Your Mood?
                        </h2>
                        <p className="text-xl text-gray-400">
                            Join thousands of music lovers creating personalized
                            playlists with AI
                        </p>
                        <button
                            onClick={handleSpotifyLogin}
                            className="group relative px-12 py-5 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xl rounded-full transition-all duration-300 flex items-center gap-3 mx-auto shadow-lg hover:shadow-[#1DB954]/50 hover:shadow-2xl"
                        >
                            <svg
                                className="w-7 h-7"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            Get Started for Free
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-4 border-t border-white/10">
                    <div className="max-w-6xl mx-auto text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                            <Music className="w-6 h-6 text-[#1DB954]" />
                            ReflectM
                        </div>
                        <p className="text-gray-400">
                            Transforming moods into music with AI
                        </p>
                        <div className="flex items-center justify-center gap-8 text-sm text-gray-500 pt-4">
                            <span>© 2026 ReflectM</span>
                            <span>•</span>
                            <span>Powered by Gemma 3 27B</span>
                            <span>•</span>
                            <span>Built with Next.js</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="text-center">
                        <Music className="w-12 h-12 text-[#1DB954] animate-pulse mx-auto mb-4" />
                        <p className="text-gray-400">Loading...</p>
                    </div>
                </div>
            }
        >
            <HomeContent />
        </Suspense>
    );
}
