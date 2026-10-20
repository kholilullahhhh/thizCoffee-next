import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser, handleApiError, readJson, requireSameOrigin } from '@/lib/api';
import { createStockAdjustment } from '@/lib/services/inventory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  type: z.enum(['PURCHASE', 'ADJUSTMENT', 'WASTAGE', 'RETURN']),
  reason: z.string().trim().min(4).max(500),
  notes: z.string().trim().max(1000).nullable().optional(),
  supplierId: z.string().nullable().optional(),
  recordExpense: z.boolean().default(false),
  method: z.string().trim().min(1).max(40).default('CASH'),
  items: z
    .array(
      z.object({
        productId: z.string().nullable().optional(),
        ingredientId: z.string().nullable().optional(),
        quantity: z.number().refine((value) => value !== 0, 'Kuantitas tidak boleh nol.'),
        unitCost: z.number().min(0).max(1_000_000_000).default(0),
      })
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'INVENTORY']);
    const body = schema.parse(await readJson(request));
    const result = await createStockAdjustment(body, user);
    return NextResponse.json(result, { status: result.alreadyExisted ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
