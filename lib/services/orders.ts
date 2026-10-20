import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import type { DbExecutor } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { toNumber } from '@/lib/format';
import { makassarToday } from '@/lib/dates';
import type { OrderStatus, SessionUser } from '@/lib/types';
import { ApiError } from '@/lib/api';

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  idempotencyKey: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  channel: string;
  status: Exclude<OrderStatus, 'CANCELLED'>;
  items: CreateOrderItemInput[];
  discount: number;
  deliveryFee: number;
  paymentAmount: number;
  paymentMethod: string;
  paymentReference?: string | null;
  notes?: string | null;
}

interface ProductRow extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  price: unknown;
  cost: unknown;
  stock: number;
  active: boolean;
}

function paymentStatus(amountPaid: number, total: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (amountPaid <= 0) return 'UNPAID';
  if (amountPaid >= total) return 'PAID';
  return 'PARTIAL';
}

function orderNumber(seq: number) {
  return `TRX-${makassarToday().replaceAll('-', '')}-${String(seq).padStart(4, '0')}`;
}

async function nextOrderNumber(tx: DbExecutor) {
  const rows = await tx.query<{ seq: unknown }>(
    "SELECT nextval('order_number_seq') AS seq"
  );
  return orderNumber(toNumber(rows[0]?.seq));
}

async function deductStock(
  tx: DbExecutor,
  product: ProductRow,
  quantity: number,
  orderId: string,
  actorId: string
) {
  const updated = await tx.query<{ stock: number }>(
    `UPDATE products SET stock = stock - $1, updated_at = now()
     WHERE id = $2 AND stock >= $1 RETURNING stock`,
    [quantity, product.id]
  );
  if (!updated.length) {
    throw new ApiError(
      409,
      `Stok ${product.name} tidak mencukupi. Sisa stok saat ini tidak cukup untuk ${quantity} unit.`
    );
  }
  await tx.query(
    `INSERT INTO stock_movements
      (id, product_id, type, quantity, unit_cost, reason, reference_type, reference_id,
       dedupe_key, created_by, created_at)
     VALUES ($1, $2, 'SALE', $3, $4, $5, 'ORDER', $6, $7, $8, now())`,
    [
      randomUUID(),
      product.id,
      -quantity,
      toNumber(product.cost),
      `Penjualan ${orderId}`,
      orderId,
      `order-${orderId}-product-${product.id}`,
      actorId,
    ]
  );
}

async function deductRecipeIngredients(
  tx: DbExecutor,
  product: ProductRow,
  quantity: number,
  orderId: string,
  actorId: string
) {
  const recipeRows = await tx.query<{ ingredient_id: string; quantity: unknown; name: string }>(
    `SELECT r.ingredient_id, r.quantity, i.name
     FROM recipe_items r JOIN ingredients i ON i.id = r.ingredient_id
     WHERE r.product_id = $1 ORDER BY r.ingredient_id`,
    [product.id]
  );
  for (const recipe of recipeRows) {
    const usage = toNumber(recipe.quantity) * quantity;
    const updated = await tx.query<{ stock: unknown }>(
      `UPDATE ingredients SET stock = stock - $1, updated_at = now()
       WHERE id = $2 AND stock >= $1 RETURNING stock`,
      [usage, recipe.ingredient_id]
    );
    if (!updated.length) {
      throw new ApiError(
        409,
        `Bahan ${recipe.name} tidak mencukupi untuk membuat ${product.name} (${quantity} unit).`
      );
    }
    await tx.query(
      `INSERT INTO stock_movements
        (id, ingredient_id, type, quantity, reason, reference_type, reference_id,
         dedupe_key, created_by, created_at)
       VALUES ($1, $2, 'SALE', $3, $4, 'ORDER', $5, $6, $7, now())`,
      [
        randomUUID(),
        recipe.ingredient_id,
        -usage,
        `Pemakaian resep untuk ${orderId}`,
        orderId,
        `order-${orderId}-ingredient-${recipe.ingredient_id}`,
        actorId,
      ]
    );
  }
}

export async function createOrder(
  input: CreateOrderInput,
  actor: SessionUser
): Promise<{ orderId: string; orderNumber: string; alreadyExisted: boolean }> {
  const db = await getDb();

  const existing = await db.query<{ id: string; order_number: string }>(
    'SELECT id, order_number FROM orders WHERE idempotency_key = $1',
    [input.idempotencyKey]
  );
  if (existing.length) {
    return { orderId: existing[0].id, orderNumber: existing[0].order_number, alreadyExisted: true };
  }

  const merged = new Map<string, number>();
  for (const item of input.items) {
    merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
  }
  const itemInputs = Array.from(merged.entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  if (!itemInputs.length) {
    throw new ApiError(422, 'Minimal satu produk harus dipilih.');
  }

  try {
    return await db.transaction(async (tx) => {
      const products: ProductRow[] = [];
      for (const item of itemInputs) {
        const rows = await tx.query<ProductRow>(
          `SELECT id, sku, name, price, cost, stock, active FROM products WHERE id = $1 FOR UPDATE`,
          [item.productId]
        );
        const product = rows[0];
        if (!product || !product.active) {
          throw new ApiError(422, 'Produk yang dipilih tidak ditemukan atau sudah nonaktif.');
        }
        products.push(product);
      }

      let customerName = input.customerName?.trim() || '';
      let customerPhone = input.customerPhone?.trim() || null;
      let customerId = input.customerId || null;
      if (customerId) {
        const customers = await tx.query<{ id: string; name: string; phone: string | null }>(
          'SELECT id, name, phone FROM customers WHERE id = $1 AND active = TRUE',
          [customerId]
        );
        if (!customers.length) {
          throw new ApiError(422, 'Pelanggan tidak ditemukan.');
        }
        customerName = customers[0].name;
        customerPhone = customerPhone || customers[0].phone;
      } else {
        customerId = null;
      }
      if (!customerName) customerName = 'Walk-in Customer';

      const subtotal = products.reduce(
        (sum, product, index) => sum + toNumber(product.price) * itemInputs[index].quantity,
        0
      );
      const discount = Math.min(Math.max(0, input.discount), subtotal);
      const deliveryFee = Math.max(0, input.deliveryFee);
      const total = subtotal - discount + deliveryFee;
      const paymentAmount = Math.max(0, input.paymentAmount);
      if (paymentAmount > total) {
        throw new ApiError(422, 'Jumlah pembayaran tidak boleh melebihi total transaksi.');
      }
      if (paymentAmount > 0 && !input.paymentMethod) {
        throw new ApiError(422, 'Metode pembayaran wajib diisi.');
      }
      const channelRows = await tx.query(
        'SELECT id FROM order_channels WHERE code = $1 AND active = TRUE',
        [input.channel.trim().toUpperCase()]
      );
      if (!channelRows.length) throw new ApiError(422, 'Kanal pesanan tidak valid.');
      if (paymentAmount > 0) {
        const methodRows = await tx.query(
          'SELECT id FROM payment_methods WHERE code = $1 AND active = TRUE',
          [input.paymentMethod.trim().toUpperCase()]
        );
        if (!methodRows.length) throw new ApiError(422, 'Metode pembayaran tidak valid.');
      }
      if (!['NEW', 'PROCESSING', 'READY', 'COMPLETED'].includes(input.status)) {
        throw new ApiError(422, 'Status awal pesanan tidak valid.');
      }

      const orderId = `ord-${randomUUID()}`;
      const number = await nextOrderNumber(tx);
      const createdAt = new Date();
      const paid = paymentStatus(paymentAmount, total);

      await tx.query(
        `INSERT INTO orders
          (id, order_number, idempotency_key, customer_id, customer_name, customer_phone,
           channel, status, payment_status, subtotal, discount, delivery_fee, total,
           amount_paid, notes, created_by, created_at, updated_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, $15, $16, $16, $17)`,
        [
          orderId,
          number,
          input.idempotencyKey,
          customerId,
          customerName,
          customerPhone,
          input.channel.trim().toUpperCase(),
          input.status,
          paid === 'PAID' ? 'UNPAID' : paid,
          subtotal,
          discount,
          deliveryFee,
          total,
          input.notes?.trim() || null,
          actor.id,
          createdAt.toISOString(),
          input.status === 'COMPLETED' ? createdAt.toISOString() : null,
        ]
      );

      for (let index = 0; index < products.length; index += 1) {
        const product = products[index];
        const quantity = itemInputs[index].quantity;
        const lineTotal = toNumber(product.price) * quantity;
        await tx.query(
          `INSERT INTO order_items
            (id, order_id, product_id, product_name, sku, quantity, unit_price, unit_cost, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            randomUUID(),
            orderId,
            product.id,
            product.name,
            product.sku,
            quantity,
            toNumber(product.price),
            toNumber(product.cost),
            lineTotal,
          ]
        );
        await deductStock(tx, product, quantity, orderId, actor.id);
        await deductRecipeIngredients(tx, product, quantity, orderId, actor.id);
      }

      if (paymentAmount > 0) {
        const paymentId = `pay-${randomUUID()}`;
        await tx.query(
          `INSERT INTO payments
            (id, order_id, amount, method, reference, idempotency_key, paid_at, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7)`,
          [
            paymentId,
            orderId,
            paymentAmount,
            input.paymentMethod.trim().toUpperCase(),
            input.paymentReference?.trim() || null,
            `initial:${input.idempotencyKey}`,
            createdAt.toISOString(),
            actor.id,
          ]
        );
        await tx.query(
          `INSERT INTO financial_entries
            (id, type, category_id, amount, method, occurred_at, description, order_id,
             payment_id, dedupe_key, created_by, created_at)
           VALUES ($1, 'INCOME', 'fcat-sales', $2, $3, $4, $5, $6, $7, $8, $9, $4)`,
          [
            `fin-${randomUUID()}`,
            paymentAmount,
            input.paymentMethod.trim().toUpperCase(),
            createdAt.toISOString(),
            `Pembayaran ${number}`,
            orderId,
            paymentId,
            `payment:${paymentId}`,
            actor.id,
          ]
        );
        await tx.query(
          `UPDATE orders SET amount_paid = $1, payment_status = $2, updated_at = now() WHERE id = $3`,
          [paymentAmount, paid, orderId]
        );
      }

      await recordAudit(tx, {
        actorId: actor.id,
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: orderId,
        summary: `Pesanan ${number} dibuat untuk ${customerName}.`,
        metadata: { total, paymentAmount, items: itemInputs.length },
      });

      return { orderId, orderNumber: number, alreadyExisted: false };
    });
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) {
      const rows = await db.query<{ id: string; order_number: string }>(
        'SELECT id, order_number FROM orders WHERE idempotency_key = $1',
        [input.idempotencyKey]
      );
      if (rows.length) {
        return { orderId: rows[0].id, orderNumber: rows[0].order_number, alreadyExisted: true };
      }
    }
    throw error;
  }
}

export async function addOrderPayment(
  input: {
    orderId: string;
    amount: number;
    method: string;
    reference?: string | null;
    notes?: string | null;
    idempotencyKey: string;
  },
  actor: SessionUser
) {
  const db = await getDb();
  const methodCode = input.method.trim().toUpperCase();
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM payments WHERE idempotency_key = $1',
    [input.idempotencyKey]
  );
  if (existing.length) {
    return { alreadyExisted: true };
  }

  return db.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string;
      order_number: string;
      status: string;
      payment_status: string;
      total: unknown;
      amount_paid: unknown;
      refunded_amount: unknown;
    }>(
      `SELECT id, order_number, status, payment_status, total, amount_paid, refunded_amount
       FROM orders WHERE id = $1 FOR UPDATE`,
      [input.orderId]
    );
    const order = rows[0];
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const duplicate = await tx.query('SELECT id FROM payments WHERE idempotency_key = $1', [
      input.idempotencyKey,
    ]);
    if (duplicate.length) return { alreadyExisted: true };
    if (order.status === 'CANCELLED' || order.payment_status === 'REFUNDED') {
      throw new ApiError(409, 'Pesanan batal atau sudah direfund tidak dapat menerima pembayaran.');
    }
    const total = toNumber(order.total);
    const paid = toNumber(order.amount_paid);
    const remaining = total - paid;
    if (remaining <= 0) throw new ApiError(409, 'Pesanan ini sudah lunas.');
    const amount = Math.floor(input.amount);
    if (amount <= 0) throw new ApiError(422, 'Nominal pembayaran harus lebih dari 0.');
    if (amount > remaining) {
      throw new ApiError(422, `Pembayaran melebihi sisa tagihan ${remaining.toLocaleString('id-ID')}.`);
    }
    const methodRows = await tx.query(
      'SELECT id FROM payment_methods WHERE code = $1 AND active = TRUE',
      [methodCode]
    );
    if (!methodRows.length) throw new ApiError(422, 'Metode pembayaran tidak valid.');

    const paymentId = `pay-${randomUUID()}`;
    const now = new Date().toISOString();
    const inserted = await tx.query<{ id: string }>(
      `INSERT INTO payments
        (id, order_id, amount, method, reference, notes, idempotency_key, paid_at, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $8)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [
        paymentId,
        input.orderId,
        amount,
        methodCode,
        input.reference?.trim() || null,
        input.notes?.trim() || null,
        input.idempotencyKey,
        now,
        actor.id,
      ]
    );
    if (!inserted.length) return { alreadyExisted: true };
    await tx.query(
      `INSERT INTO financial_entries
        (id, type, category_id, amount, method, occurred_at, description, order_id,
         payment_id, dedupe_key, created_by, created_at)
       VALUES ($1, 'INCOME', 'fcat-sales', $2, $3, $4, $5, $6, $7, $8, $9, $4)`,
      [
        `fin-${randomUUID()}`,
        amount,
        methodCode,
        now,
        `Pembayaran ${order.order_number}`,
        input.orderId,
        paymentId,
        `payment:${paymentId}`,
        actor.id,
      ]
    );
    const newPaid = paid + amount;
    const status = paymentStatus(newPaid, total);
    await tx.query(
      `UPDATE orders SET amount_paid = $1, payment_status = $2, updated_at = now() WHERE id = $3`,
      [newPaid, status, input.orderId]
    );
    await recordAudit(tx, {
      actorId: actor.id,
      action: 'PAYMENT_RECORDED',
      entityType: 'ORDER',
      entityId: input.orderId,
      summary: `Pembayaran ${amount.toLocaleString('id-ID')} dicatat untuk ${order.order_number}.`,
      metadata: { method: methodCode, newPaid, status },
    });
    return { alreadyExisted: false };
  });
}

const transitions: Record<string, string[]> = {
  NEW: ['PROCESSING'],
  PROCESSING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateOrderStatus(
  orderId: string,
  status: Exclude<OrderStatus, 'CANCELLED'>,
  actor: SessionUser
) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const rows = await tx.query<{ id: string; order_number: string; status: string }>(
      'SELECT id, order_number, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    const order = rows[0];
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    if (order.status === status) return { changed: false };
    if (!transitions[order.status]?.includes(status)) {
      throw new ApiError(
        409,
        `Status ${order.status} tidak dapat langsung diubah menjadi ${status}.`
      );
    }
    await tx.query(
      `UPDATE orders SET status = $1, updated_at = now(),
         completed_at = CASE WHEN $1 = 'COMPLETED' THEN now() ELSE completed_at END
       WHERE id = $2`,
      [status, orderId]
    );
    await recordAudit(tx, {
      actorId: actor.id,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: orderId,
      summary: `Status ${order.order_number}: ${order.status} → ${status}.`,
    });
    return { changed: true };
  });
}

export async function cancelOrder(
  orderId: string,
  reason: string,
  actor: SessionUser
) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 4) {
    throw new ApiError(422, 'Alasan pembatalan minimal 4 karakter.');
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string;
      order_number: string;
      status: string;
      total: unknown;
      amount_paid: unknown;
      refunded_amount: unknown;
    }>(
      `SELECT id, order_number, status, total, amount_paid, refunded_amount
       FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    const order = rows[0];
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    if (order.status === 'CANCELLED') {
      throw new ApiError(409, 'Pesanan sudah dibatalkan sebelumnya.');
    }

    const movements = await tx.query<{
      id: string;
      product_id: string | null;
      ingredient_id: string | null;
      quantity: unknown;
    }>(
      `SELECT id, product_id, ingredient_id, quantity FROM stock_movements
       WHERE reference_type = 'ORDER' AND reference_id = $1 AND type = 'SALE'`,
      [orderId]
    );
    for (const movement of movements) {
      const quantity = toNumber(movement.quantity);
      if (movement.product_id) {
        await tx.query(
          `UPDATE products SET stock = stock + $1::int, updated_at = now() WHERE id = $2`,
          [-quantity, movement.product_id]
        );
      }
      if (movement.ingredient_id) {
        await tx.query(
          `UPDATE ingredients SET stock = stock + $1, updated_at = now() WHERE id = $2`,
          [-quantity, movement.ingredient_id]
        );
      }
      await tx.query(
        `INSERT INTO stock_movements
          (id, product_id, ingredient_id, type, quantity, reason, reference_type, reference_id,
           dedupe_key, created_by, created_at)
         VALUES ($1, $2, $3, 'RETURN', $4, $5, 'ORDER_CANCEL', $6, $7, $8, now())
         ON CONFLICT (dedupe_key) DO NOTHING`,
        [
          randomUUID(),
          movement.product_id,
          movement.ingredient_id,
          -quantity,
          `Pengembalian stok pembatalan ${order.order_number}`,
          orderId,
          `cancel-${orderId}-movement-${movement.id}`,
          actor.id,
        ]
      );
    }

    const paid = toNumber(order.amount_paid);
    const alreadyRefunded = toNumber(order.refunded_amount);
    const refundAmount = Math.max(0, paid - alreadyRefunded);
    let refundMethod = 'CASH';
    if (refundAmount > 0) {
      const payments = await tx.query<{ method: string }>(
        `SELECT method FROM payments WHERE order_id = $1 ORDER BY paid_at DESC LIMIT 1`,
        [orderId]
      );
      refundMethod = payments[0]?.method || 'CASH';
      await tx.query(
        `INSERT INTO financial_entries
          (id, type, category_id, amount, method, occurred_at, description, order_id,
           dedupe_key, created_by, created_at)
         VALUES ($1, 'EXPENSE', 'fcat-refund', $2, $3, now(), $4, $5, $6, $7, now())
         ON CONFLICT (dedupe_key) DO NOTHING`,
        [
          `fin-${randomUUID()}`,
          refundAmount,
          refundMethod,
          `Refund pembatalan ${order.order_number}`,
          orderId,
          `refund:${orderId}`,
          actor.id,
        ]
      );
    }

    await tx.query(
      `UPDATE orders SET status = 'CANCELLED', cancelled_at = now(), cancel_reason = $1,
         refunded_amount = $2, payment_status = $3, updated_at = now()
       WHERE id = $4`,
      [
        trimmedReason,
        paid,
        paid > 0 ? 'REFUNDED' : 'UNPAID',
        orderId,
      ]
    );
    await recordAudit(tx, {
      actorId: actor.id,
      action: 'ORDER_CANCELLED',
      entityType: 'ORDER',
      entityId: orderId,
      summary: `Pesanan ${order.order_number} dibatalkan. ${refundAmount > 0 ? `Refund ${refundAmount.toLocaleString('id-ID')} dicatat sebagai kas keluar.` : 'Belum ada pembayaran untuk direfund.'}`,
      metadata: { reason: trimmedReason, refundAmount, refundMethod },
    });
    return { refundAmount };
  });
}
