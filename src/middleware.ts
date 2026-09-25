import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Middleware: refresca la sesión de Supabase y protege las rutas del panel
 * (/app).
 *
 * Next 16 lo renombró a "proxy" y lo corre en Node, pero en Cloudflare
 * (OpenNext) ese modo es experimental, sin soporte oficial, y casi duplica el
 * Worker (2,9 MB frente a 1,7 MB comprimido). Como middleware.ts corre en el
 * runtime edge, que OpenNext sí soporta. Next avisa que está en desuso:
 * revisar al actualizar Next.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/registro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export default middleware;

export const config = {
  matcher: ["/app/:path*", "/login", "/registro"],
};
