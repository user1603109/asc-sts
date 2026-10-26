import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'asc-asts-super-secret-key-2026-secure';
const encodedKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Exclude public assets, static files, and explicit login endpoints
  if (
    pathname === '/admin/login' ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('asc_session_token')?.value;

  // 2. Protect ALL /admin/* routes (e.g. /admin/settings, /admin/dashboard, etc.)
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, encodedKey, {
        algorithms: ['HS256'],
      });

      // Role authorization: only admin accounts can access /admin routes
      if (payload.role !== 'admin') {
        const redirectUrl = new URL('/judge/dashboard', req.url);
        return NextResponse.redirect(redirectUrl);
      }

      return NextResponse.next();
    } catch (err) {
      // Invalid, expired, or tampered token: clear cookie and redirect
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('asc_session_token');
      return response;
    }
  }

  // 3. Protect ALL /judge/* routes (e.g. /judge/score, /judge/dashboard, etc.)
  if (pathname.startsWith('/judge')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, encodedKey, {
        algorithms: ['HS256'],
      });

      // Role authorization: judges and admins can access /judge routes
      if (payload.role !== 'judge' && payload.role !== 'admin') {
        const loginUrl = new URL('/login', req.url);
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    } catch (err) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('asc_session_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/judge/:path*'],
};
