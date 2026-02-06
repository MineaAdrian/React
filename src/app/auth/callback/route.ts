import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // Only allow relative paths to prevent open redirect
    const rawNext = searchParams.get("next") ?? "/week";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/week";

    if (code) {
        const supabase = await createClient();
        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
                return NextResponse.redirect(`${origin}${next}`);
            }
            console.error("Auth callback error:", error.message);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
        } catch (err: any) {
            console.error("Auth callback exception:", err);
            return NextResponse.redirect(`${origin}/login?error=Authentication%20error`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=Invalid%20auth%20code`);
}
