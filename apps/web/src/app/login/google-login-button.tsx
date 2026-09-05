"use client";

import {
    useState
} from "react";

import {
    createClient
} from "@/lib/supabase/client";


export function GoogleLoginButton() {
    const [
        loading,
        setLoading,
    ] = useState(false);

    async function login() {
        setLoading(true);

        const supabase = createClient();

        const { error ,} = await supabase.auth.signInWithOAuth({
            provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, }
        });

        if (error) {
            console.error("Google login failed", error.code, );
        }

        setLoading(false);
    }

    return (
        <button
            type="button"
            onClick={login}
            disabled={loading}
            className="w-full rounded-md border px-4 py-3 font-medium"
        >
            { loading ? "Googleへ移動中..." : "Googleでログイン" }
        </button>
    )
}