import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentUser, canAccess } from '@/lib/auth/session';
import type { Role, SessionUser } from '@/lib/types';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  try {
    if (new URL(origin).host !== host) {
      throw new ApiError(403, 'Permintaan lintas situs ditolak.');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, 'Origin permintaan tidak valid.');
  }
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(415, 'Content-Type harus application/json.');
  }
  const raw = await request.text();
  if (raw.length > 1_000_000) {
    throw new ApiError(413, 'Payload terlalu besar.');
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError(400, 'Body JSON tidak valid.');
  }
}

export async function requireApiUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'Sesi berakhir. Silakan masuk kembali.');
  if (!canAccess(user.role, roles)) {
    throw new ApiError(403, 'Anda tidak memiliki izin untuk tindakan ini.');
  }
  return user;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details ?? null },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Data tidak valid.',
        details: error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga.';
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const isDatabaseError =
    /DATABASE_URL is required|password authentication failed|database .* does not exist|relation .* does not exist|column .* does not exist/i.test(
      message
    ) ||
    [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      '28P01',
      '3D000',
      '42P01',
      '42703',
      '53300',
      '57P03',
      '08001',
      '08003',
      '08006',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'SELF_SIGNED_CERT_IN_CHAIN',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'ERR_TLS_CERT_ALTNAME_INVALID',
    ].includes(code);
  if (isDatabaseError) {
    console.error('[api] database error', error);
    return NextResponse.json(
      {
        error:
          'Layanan database tidak tersedia. Periksa konfigurasi database pada environment hosting.',
        code: code || undefined,
      },
      { status: 503 }
    );
  }
  const isDbConflict = /duplicate key|unique constraint/i.test(message);
  if (isDbConflict) {
    console.error('[api] database conflict', error);
    return NextResponse.json(
      { error: 'Data bertentangan dengan data yang sudah ada (duplikat).' },
      { status: 409 }
    );
  }
  console.error('[api]', error);
  return NextResponse.json(
    {
      error:
        process.env.NODE_ENV === 'production'
          ? 'Terjadi kesalahan pada server.'
          : message,
    },
    { status: 500 }
  );
}

export function parsePageNumber(value: unknown, fallback = 1): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
