import { NextResponse } from "next/server";

/**
 * Route protection lives in pages/API via `isAuthor` / `requireAuthor`.
 * When Clerk keys are present and DEV_BYPASS_AUTH is not true, those helpers
 * enforce Veronika-only writes. A full clerkMiddleware can replace this later.
 */
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/write/:path*", "/api/:path*"],
};
