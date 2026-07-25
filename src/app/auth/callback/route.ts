import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth/approved-users";
import { resolveSafeRedirect } from "@/lib/auth/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveSafeRedirect(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const email = normalizeEmail(data.user.email);

  let approved = false;
  try {
    const admin = createAdminClient();
    const { data: row, error: lookupError } = await admin
      .from("approved_users")
      .select("id, is_active")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("[hisab] approved_users lookup failed:", lookupError.message);
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    approved = Boolean(row?.is_active);
  } catch (lookupError) {
    console.error("[hisab] approved_users lookup unavailable:", lookupError);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  if (!approved) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=private_workspace`);
  }

  const { error: profileError } = await supabase.rpc("ensure_profile_for_auth_user");
  if (profileError) {
    console.warn(
      "[hisab] ensure_profile_for_auth_user failed — apply Phase 1 migration:",
      profileError.message
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
