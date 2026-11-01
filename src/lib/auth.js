import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const USER_COOKIE = 'mahall_session';
const CHITTY_COOKIE = 'mahall_chitty';
const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('AUTH_SECRET is missing or too short');
  return new TextEncoder().encode(s);
};
const opts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 };

async function read(name) {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, key())).payload; } catch { return null; }
}
async function write(name, payload) {
  const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(key());
  (await cookies()).set(name, token, opts);
}

export const getUserSession = () => read(USER_COOKIE); // { userId }
export const setUserSession = (userId) => write(USER_COOKIE, { userId });
export const clearUserSession = async () => (await cookies()).delete(USER_COOKIE);

export const getChittySession = () => read(CHITTY_COOKIE); // { memberId }
export const setChittySession = (memberId) => write(CHITTY_COOKIE, { memberId });
export const clearChittySession = async () => (await cookies()).delete(CHITTY_COOKIE);

const SUPER_COOKIE = 'mahall_super';
export const getSuperSession = () => read(SUPER_COOKIE); // { username }
export const setSuperSession = (username) => write(SUPER_COOKIE, { username });
export const clearSuperSession = async () => (await cookies()).delete(SUPER_COOKIE);
