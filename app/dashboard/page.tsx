import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    // Check if Spotify is connected
    const { data: preferences } = await supabase
        .from("user_preferences")
        .select("spotify_access_token")
        .eq("user_id", user.id)
        .single();

    const spotifyConnected = !!preferences?.spotify_access_token;

    return <DashboardClient user={user} spotifyConnected={spotifyConnected} />;
}
