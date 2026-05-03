import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"
import { rateLimit, profileForPath } from "@/lib/rate-limit"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith("/api")
  const isAuthApi = pathname.startsWith("/api/auth")

  // Rate limit everything except NextAuth internals (which manage their own flow).
  if (!isAuthApi) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anon"
    const userId = (req.auth?.user as any)?.id
    const key = userId ? `u:${userId}` : `ip:${ip}`
    const profile = profileForPath(pathname, req.method)
    const result = rateLimit(key, profile)
    if (!result.ok) {
      const body = isApi
        ? JSON.stringify({ error: "Too Many Requests" })
        : "Too Many Requests"
      return new NextResponse(body, {
        status: 429,
        headers: {
          "Content-Type": isApi ? "application/json" : "text/plain",
          "Retry-After": String(result.retryAfterSec),
        },
      })
    }
  }

  // Auth gate.
  if (!req.auth) {
    if (pathname.startsWith("/login")) return NextResponse.next()
    if (isAuthApi) return NextResponse.next()
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (req.auth && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
