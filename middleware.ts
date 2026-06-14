import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'ippis_A00120044';

const allowedOrigins = [
  "http://localhost:3000",
  "https://ippis-frontend.vercel.app",
  "https://staff-management-and-identity-verif.vercel.app",
  "https://nigeria-police-personnel-database.vercel.app"
];

function getCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-registration-id",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : "";
  const corsHeaders = getCorsHeaders(allowedOrigin);

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const { pathname } = request.nextUrl;

  // Define excluded routes
  const isExcludedRoute = 
    pathname.startsWith('/api/admin/auth/login') ||
    pathname === '/api/admin/auth/logout' ||
    pathname === '/api/admin/init' ||
    pathname === '/api/admin/setup-db';

  if (pathname.startsWith('/api/admin') && !isExcludedRoute) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Authorization token is missing.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyJWT(token, JWT_SECRET);

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired authorization token.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Role-based access check
    const isSuperAdminRoute = pathname.includes('/superadmin') || pathname === '/api/admin/superadmin-dashboard';
    if (isSuperAdminRoute && decoded.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, message: 'Access denied: Super Admin privilege required.' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Inject user details into downstream request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(decoded.id));
    requestHeaders.set('x-user-username', decoded.username);
    requestHeaders.set('x-user-role', decoded.role);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, val]) => {
      response.headers.set(key, val);
    });

    return response;
  }

  const response = NextResponse.next();
  if (allowedOrigin) {
    Object.entries(corsHeaders).forEach(([key, val]) => {
      response.headers.set(key, val);
    });
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
