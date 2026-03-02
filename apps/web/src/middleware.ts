import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── CORS for public widget API (/api/v1/*) ───────────────────────────────
  // The JS widget is embedded on customer sites (external origins).
  // Bearer token auth is used — no cookies — so wildcard CORS is safe here.
  if (pathname.startsWith('/api/v1/')) {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // Pass through, but attach CORS headers to the response
    const res = NextResponse.next();
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      res.headers.set(key, value);
    }
    return res;
  }

  // ── Auth guard for dashboard ─────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    const sessionToken =
      req.cookies.get('__Secure-next-auth.session-token')?.value ??
      req.cookies.get('next-auth.session-token')?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/v1/:path*'],
};
