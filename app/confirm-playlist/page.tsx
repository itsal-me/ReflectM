"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Track {
    song: string;
    artist: string;
}

interface PlaylistData {
    playlist_name: string;
    tracks: Track[];
    narrative: string;
    valence: number;
    energy: number;
}

interface SpotifyTrackInfo {
    name: string;
    artist: string;
    album: string;
    image: string;
    uri: string;
}

export default function ConfirmPlaylistPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
    const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrackInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        // Get playlist data from session storage
        const data = sessionStorage.getItem("pending_playlist");
        if (data) {
            const parsed = JSON.parse(data);
            setPlaylistData(parsed);
            fetchSpotifyInfo(parsed.tracks);
        } else {
            toast.error("No playlist data found");
            router.push("/dashboard");
        }
    }, [router]);

    const fetchSpotifyInfo = async (tracks: Track[]) => {
        setLoading(true);
        try {
            const trackInfoPromises = tracks.map(async (track) => {
                const response = await fetch(
                    `/api/spotify-search?song=${encodeURIComponent(
                        track.song
                    )}&artist=${encodeURIComponent(track.artist)}`
                );
                if (response.ok) {
                    return await response.json();
                }
                return null;
            });

            const results = await Promise.all(trackInfoPromises);
            setSpotifyTracks(results.filter((r) => r !== null));
        } catch (error) {
            console.error("Error fetching Spotify info:", error);
            toast.error("Failed to fetch track details");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!playlistData) return;

        setAdding(true);
        const toastId = toast.loading("Adding playlist to your Spotify...");

        try {
            const response = await fetch("/api/confirm-playlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(playlistData),
            });

            if (!response.ok) {
                throw new Error("Failed to create playlist");
            }

            const result = await response.json();
            toast.success("Playlist added to Spotify!", { id: toastId });
            sessionStorage.removeItem("pending_playlist");
            router.push(`/dashboard?playlist=${result.spotify_url}`);
        } catch (error) {
            console.error("Error creating playlist:", error);
            toast.error("Failed to add playlist to Spotify", { id: toastId });
        } finally {
            setAdding(false);
        }
    };

    const handleCancel = () => {
        sessionStorage.removeItem("pending_playlist");
        router.push("/dashboard");
    };

    if (!playlistData) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        onClick={handleCancel}
                        variant="ghost"
                        className="text-gray-400 hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#1DB954] flex items-center justify-center">
                            <Music className="w-8 h-8 text-black" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold">
                                {playlistData.playlist_name}
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {playlistData.tracks.length} tracks
                            </p>
                        </div>
                    </div>
                    <p className="text-gray-300 italic bg-gray-900 p-4 rounded-xl border border-gray-800">
                        "{playlistData.narrative}"
                    </p>
                </div>

                {/* Track List */}
                <Card className="bg-gray-900 border-gray-800 mb-6">
                    <CardHeader>
                        <CardTitle className="text-white">
                            Preview Tracks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {playlistData.tracks.map((_, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg animate-pulse"
                                    >
                                        <div className="w-14 h-14 bg-gray-700 rounded"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {spotifyTracks.map((track, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
                                    >
                                        <div className="relative w-14 h-14 rounded bg-gray-700 flex-shrink-0">
                                            {track.image ? (
                                                <Image
                                                    src={track.image}
                                                    alt={track.album}
                                                    fill
                                                    className="object-cover rounded"
                                                />
                                            ) : (
                                                <Music className="w-6 h-6 text-gray-500 absolute inset-0 m-auto" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white truncate">
                                                {track.name}
                                            </div>
                                            <div className="text-sm text-gray-400 truncate">
                                                {track.artist} · {track.album}
                                            </div>
                                        </div>
                                        <div className="text-gray-500 text-sm">
                                            {index + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="flex-1 h-14 text-white border-gray-700 hover:bg-gray-800"
                        disabled={adding}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="flex-1 h-14 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold"
                        disabled={adding || loading}
                    >
                        {adding ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Adding to Spotify...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5 mr-2" />
                                Add to Spotify
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
