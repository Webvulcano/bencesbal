import { NextResponse } from "next/server";

// No login yet: the admin exposes personal data, so it must never be reachable on a deployed build.
export function proxy() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
