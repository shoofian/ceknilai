import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'ceknilai-super-secret-jwt-key-2026';
const key = new TextEncoder().encode(JWT_SECRET);

const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];

export async function signToken(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Berlaku 1 hari
    .sign(key);
  return token;
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  
  if (!session || !session.value) return null;

  // Coba verifikasi sebagai JWT terlebih dahulu
  const payload = await verifyToken(session.value);
  if (payload && payload.username) {
    return payload.username;
  }

  return null;
}

export async function checkSuperadminAuth() {
  const username = await checkAuth();
  if (!username) return null;
  
  return SUPERADMIN_USERNAMES.includes(username);
}
