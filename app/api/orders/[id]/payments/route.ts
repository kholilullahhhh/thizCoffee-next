import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, handleApiError, readJson, requireSameOrigin } from '@/lib/api';
import { addOrderPayment } from '@/lib/services/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  amount: z.number().int().positive().max(1_000_000_000),
  method: z.string().trim().min(1).max(40),
  reference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  idempotencyKey: z.string().min(8).max(120),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'STAFF']);
    const body = schema.parse(await readJson(request));
    const result = await addOrderPayment({ ...body, orderId: params.id }, user);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
