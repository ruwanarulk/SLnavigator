import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap gate for signed-in areas: no cookie means straight to sign-in. The
 * API still authorises every request; this only avoids a flash of empty pages.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sln_session")) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/trips/:path*", "/account/:path*", "/admin/:path*"],
};
