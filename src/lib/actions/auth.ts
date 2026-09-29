"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ipDelCliente, TEXTO_TURNSTILE, verificarTurnstile } from "@/lib/turnstile";
import type { ActionState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Aún no confirmaste tu correo. Revisa tu bandeja de entrada.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos.";
  return message;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app");

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Ingresa un correo válido y tu contraseña." };
  }
  // Frena a los bots que prueban contraseñas.
  if (!(await verificarTurnstile(formData, ipDelCliente(await headers())))) return { error: TEXTO_TURNSTILE };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateAuthError(error.message) };

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "Ingresa un correo válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const supabase = await createClient();
  const appUrl = await getAppUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appUrl}/auth/callback?next=/app/nuevo` },
  });
  if (error) return { error: translateAuthError(error.message) };

  // Si la confirmación por correo está desactivada, ya hay sesión.
  if (data.session) redirect("/app/nuevo");

  return {
    success:
      "Te enviamos un correo para confirmar tu cuenta. Ábrelo y haz clic en el enlace para continuar (revisa también la carpeta de spam).",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
