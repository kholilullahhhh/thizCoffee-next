import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, handleApiError, readJson, requireSameOrigin } from '@/lib/api';
import { createOrder } from '@/lib/services/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  idempotencyKey: z.string().min(8).max(120),
  customerId: z.string().max(120).nullable().optional(),
  customerName: z.string().trim().max(120).nullable().optional(),
  customerPhone: z.string().trim().max(40).nullable().optional(),
  channel: z.string().trim().min(1).max(40),
  status: z.enum(['NEW', 'PROCESSING', 'READY', 'COMPLETED']),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(120),
        quantity: z.number().int().positive().max(1000),
      })
    )
    .min(1)
    .max(50),
  discount: z.number().int().min(0).max(1_000_000_000).default(0),
  deliveryFee: z.number().int().min(0).max(1_000_000_000).default(0),
  paymentAmount: z.number().int().min(0).max(1_000_000_000).default(0),
  paymentMethod: z.string().trim().min(1).max(40),
  paymentReference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'STAFF']);
    const body = schema.parse(await readJson(request));
    const result = await createOrder(body, user);
    return NextResponse.json(result, { status: result.alreadyExisted ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
