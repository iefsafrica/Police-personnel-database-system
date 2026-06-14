import { NextRequest, NextResponse } from 'next/server';
import { withCors, handleOptions } from '@/lib/cors';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRATION = '1h';

export const dynamic = 'force-dynamic';

type LoginRequest = {
  username?: string;
  email?: string;
  password: string;
};

type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
};

function isAllowedAdminRole(role: string) {
  const normalizedRole = role.replace(/\s+/g, '').toLowerCase();
  return ['admin', 'superadmin'].includes(normalizedRole);
}

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginRequest;
    const { username, email, password } = body;

    if ((!username && !email) || !password) {
      return withCors(req, { success: false, message: 'Username/email and password are required' }, 400);
    }

    const userResult = await sql`
      SELECT id, username, email, password_hash, role
      FROM admin_users
      WHERE username = ${username ?? ''} OR email = ${email ?? ''}
      LIMIT 1
    `;

    const user = userResult[0] as AdminUserRow | undefined;

    if (!user) {
      return withCors(req, { success: false, message: 'User not found' }, 401);
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return withCors(req, { success: false, message: 'Invalid password' }, 401);
    }

    if (!isAllowedAdminRole(user.role)) {
      return withCors(req, { success: false, message: 'Access denied: Admin privileges required' }, 403);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    return withCors(req, {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return withCors(req, {
      success: false,
      message: 'Something went wrong during login',
      errorCode: error?.code ?? error?.name ?? 'Unknown',
      errorDetail: error?.message ?? String(error),
    }, 500);
  }
}

export async function GET(req: NextRequest) {
  return withCors(req, {
    endpoint: '/api/admin/auth/login',
    status: 'active',
    message: 'Admin Auth API is running',
    timestamp: new Date().toISOString(),
  });
}
