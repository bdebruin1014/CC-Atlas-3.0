import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure a profile record exists for SSO users
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single()

      if (!existingProfile) {
        const metadata = data.user.user_metadata
        await supabase.from("profiles").insert({
          id: data.user.id,
          first_name:
            metadata?.first_name ||
            metadata?.full_name?.split(" ")[0] ||
            null,
          last_name:
            metadata?.last_name ||
            metadata?.full_name?.split(" ").slice(1).join(" ") ||
            null,
          email: data.user.email,
          role: "team_member",
        })
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Auth code exchange failed - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
