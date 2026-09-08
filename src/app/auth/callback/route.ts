import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Destino del enlace de confirmación de correo / magic link. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appUrl = await getAppUrl();
  const next = searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  const supabase = await createClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${appUrl}${safeNext}`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${appUrl}${safeNext}`);
  }

  return NextResponse.redirect(`${appUrl}/login?error=enlace-invalido`);
}
