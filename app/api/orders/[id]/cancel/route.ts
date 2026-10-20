import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, handleApiError, readJson, requireSameOrigin } from '@/lib/api';
import { cancelOrder } from '@/lib/services/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  reason: z.string().trim().min(4, 'Alasan pembatalan minimal 4 karakter.').max(500),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'STAFF']);
    const body = schema.parse(await readJson(request));
    const result = await cancelOrder(params.id, body.reason, user);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
