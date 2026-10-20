import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export const DUMMY_HASH =
  'scrypt$16384$8$1$094792e0aeb11caeb4a73c0b3376fd0b$90da56767c0071461a2da5ab29ff86bf06998245492daaf67b8c77baba1856f33fc8fc139d20dadc21c773c4a58d2934023ed36dfc287a940c161207059558f5';

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  try {
    const [scheme, n, r, p, saltHex, hashHex] = encoded.split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}
