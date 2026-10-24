import { NextResponse } from "next/server";
import { isRegistrationOpen } from "@/lib/registration-open";
import { createServerClient } from "@supabase/ssr";
import { isAdminClaims } from "@/lib/admin-access";

// /admin needs a login; the registration switch below never applies to it.
// This is only the first gate: pages, route handlers and actions check again.
const OPEN_ADMIN_PATHS = new Set(["/admin/belepes", "/admin/auth/callback"]);

async function adminGate(request, pathname) {
  if (OPEN_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  // Also refreshes an expiring Supabase session (Server Components cannot write cookies).
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  if (isAdminClaims(data?.claims)) return response;

  if (request.headers.has("next-action")) return new NextResponse("Ehhez nincs jogosultsága.", { status: 401 });
  return NextResponse.redirect(new URL("/admin/belepes", request.url));
}

// While registration is closed, the public site is the static teaser
// (public/elozetes/).
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminGate(request, pathname);

  if (isRegistrationOpen()) return NextResponse.next();

  // Block server actions (the registration submit) outright.
  if (request.headers.has("next-action")) {
    return new NextResponse("A jelentkezés még nem nyílt meg. Köszönjük türelmét!", { status: 403 });
  }

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/elozetes/index.html", request.url));
  }
  if (pathname === "/jegyarak") {
    return NextResponse.rewrite(new URL("/elozetes/jegyarak/index.html", request.url));
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|elozetes|images|fonts|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?|pdf)$).*)",
  ],
};
