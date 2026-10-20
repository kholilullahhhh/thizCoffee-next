import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, handleApiError, readJson, requireSameOrigin } from '@/lib/api';
import { updateOrderStatus } from '@/lib/services/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  status: z.enum(['PROCESSING', 'READY', 'COMPLETED']),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'STAFF']);
    const body = schema.parse(await readJson(request));
    const result = await updateOrderStatus(params.id, body.status, user);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
