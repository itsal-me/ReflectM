import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    // Log what cookies we actually have
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log(
        "Dashboard - Cookies received:",
        allCookies.map((c) => c.name)
    );

    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    console.log("Dashboard - User:", user?.email, "Error:", userError);

    if (!user) {
        console.log("No user found, redirecting to home");
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
