import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { User, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'asc-asts-super-secret-key-2026-secure';
const encodedKey = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: number;
  username: string;
  fullName: string;
  role: UserRole;
  approvalStatus: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Support both bcrypt hashes and fallback check
  try {
    const isMatch = await bcrypt.compare(password, hash);
    if (isMatch) return true;
  } catch (e) {
    // If not a valid bcrypt hash, check direct equality
  }
  return password === hash;
}

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    approvalStatus: user.approval_status,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedKey);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(rolePreference?: 'admin' | 'judge'): Promise<TokenPayload | null> {
  const cookieStore = cookies();

  // If no role preference is explicitly passed, deduce from referer header
  if (!rolePreference) {
    try {
      const referer = headers().get('referer') || '';
      if (referer.includes('/admin')) rolePreference = 'admin';
      else if (referer.includes('/judge')) rolePreference = 'judge';
    } catch {
      // In isolated test/build environments headers() may not be available
    }
  }

  // 1. Direct role-preference lookup
  if (rolePreference === 'admin') {
    const adminToken = cookieStore.get('asc_admin_token')?.value;
    if (adminToken) {
      const payload = await verifySessionToken(adminToken);
      if (payload && payload.role === 'admin') return payload;
    }
  }

  if (rolePreference === 'judge') {
    const judgeToken = cookieStore.get('asc_judge_token')?.value;
    if (judgeToken) {
      const payload = await verifySessionToken(judgeToken);
      if (payload && payload.role === 'judge') return payload;
    }
  }

  // 2. Fallback cascade based on role preference
  const tokenNames = rolePreference === 'admin'
    ? ['asc_admin_token', 'asc_session_token', 'asc_judge_token']
    : rolePreference === 'judge'
    ? ['asc_judge_token', 'asc_session_token', 'asc_admin_token']
    : ['asc_admin_token', 'asc_judge_token', 'asc_session_token'];

  for (const name of tokenNames) {
    const token = cookieStore.get(name)?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) {
        if (!rolePreference || payload.role === rolePreference) {
          return payload;
        }
      }
    }
  }

  // 3. Ultimate fallback: any valid verified session
  for (const name of ['asc_session_token', 'asc_admin_token', 'asc_judge_token']) {
    const token = cookieStore.get(name)?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) return payload;
    }
  }

  return null;
}
