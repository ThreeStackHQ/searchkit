import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    // Check for NextAuth session cookie
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
  matcher: ['/dashboard/:path*'],
};
