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

  // 2. Protect ALL /admin/* routes (e.g. /admin/settings, /admin/dashboard, etc.)
  if (pathname.startsWith('/admin')) {
    // Check role-specific admin token first, fallback to general session token
    const adminToken = req.cookies.get('asc_admin_token')?.value || req.cookies.get('asc_session_token')?.value;

    if (!adminToken) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(adminToken, encodedKey, {
        algorithms: ['HS256'],
      });

      // Role authorization: only admin accounts can access /admin routes
      if (payload.role !== 'admin') {
        const loginUrl = new URL('/admin/login', req.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    } catch (err) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('asc_admin_token');
      return response;
    }
  }

  // 3. Protect ALL /judge/* routes (e.g. /judge/score, /judge/dashboard, etc.)
  if (pathname.startsWith('/judge')) {
    // Check role-specific judge token first, fallback to session token, then admin preview token
    const judgeToken =
      req.cookies.get('asc_judge_token')?.value ||
      req.cookies.get('asc_session_token')?.value ||
      req.cookies.get('asc_admin_token')?.value;

    if (!judgeToken) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(judgeToken, encodedKey, {
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
      response.cookies.delete('asc_judge_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/judge/:path*'],
};
