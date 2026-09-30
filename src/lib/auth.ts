import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { User, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'asc-sts-super-secret-key-2026-secure';
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

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('asc_session_token')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
