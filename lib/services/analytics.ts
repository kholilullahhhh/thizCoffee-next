import type { DbExecutor } from '@/lib/db';
import { toNumber } from '@/lib/format';

export interface PeriodSummary {
  revenue: number;
  orders: number;
  units: number;
  discounts: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  otherIncome: number;
  netProfit: number;
  paymentsReceived: number;
  receivables: number;
  cashIn: number;
  cashOut: number;
  netCash: number;
  refunds: number;
  inventoryPurchases: number;
  averageOrder: number;
}

export async function getPeriodSummary(
  db: DbExecutor,
  start: Date,
  end: Date
): Promise<PeriodSummary> {
  const rows = await db.query<Record<string, unknown>>(
    `SELECT
       (SELECT COALESCE(SUM(o.total), 0)
          FROM orders o
         WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2) AS revenue,
       (SELECT COUNT(*) FROM orders o
         WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2) AS orders_count,
       (SELECT COALESCE(SUM(oi.quantity), 0)
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2) AS units,
       (SELECT COALESCE(SUM(o.discount), 0)
          FROM orders o
         WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2) AS discounts,
       (SELECT COALESCE(SUM(oi.quantity * oi.unit_cost), 0)
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2) AS cogs,
       (SELECT COALESCE(SUM(f.amount), 0)
          FROM financial_entries f JOIN financial_categories c ON c.id = f.category_id
         WHERE f.is_voided = FALSE AND c.kind = 'OPERATING_EXPENSE'
           AND f.occurred_at >= $1 AND f.occurred_at < $2) AS operating_expenses,
       (SELECT COALESCE(SUM(f.amount), 0)
          FROM financial_entries f JOIN financial_categories c ON c.id = f.category_id
         WHERE f.is_voided = FALSE AND c.kind = 'OTHER_INCOME'
           AND f.occurred_at >= $1 AND f.occurred_at < $2) AS other_income,
       (SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p JOIN orders o ON o.id = p.order_id
         WHERE o.status <> 'CANCELLED' AND p.paid_at >= $1 AND p.paid_at < $2) AS payments_received,
       (SELECT COALESCE(SUM(o.total - o.amount_paid), 0)
          FROM orders o
         WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2) AS receivables,
       (SELECT COALESCE(SUM(f.amount), 0)
          FROM financial_entries f
         WHERE f.is_voided = FALSE AND f.type = 'INCOME'
           AND f.occurred_at >= $1 AND f.occurred_at < $2) AS cash_in,
       (SELECT COALESCE(SUM(f.amount), 0)
          FROM financial_entries f
         WHERE f.is_voided = FALSE AND f.type = 'EXPENSE'
           AND f.occurred_at >= $1 AND f.occurred_at < $2) AS cash_out,
       (SELECT COALESCE(SUM(f.amount), 0)
          FROM financial_entries f JOIN financial_categories c ON c.id = f.category_id
         WHERE f.is_voided = FALSE AND c.kind = 'REFUND'
           AND f.occurred_at >= $1 AND f.occurred_at < $2) AS refunds,
       (SELECT COALESCE(SUM(f.amount), 0)
          FROM financial_entries f JOIN financial_categories c ON c.id = f.category_id
         WHERE f.is_voided = FALSE AND c.kind = 'INVENTORY_PURCHASE'
           AND f.occurred_at >= $1 AND f.occurred_at < $2) AS inventory_purchases`,
    [start.toISOString(), end.toISOString()]
  );

  const row = rows[0] || {};
  const revenue = toNumber(row.revenue);
  const cogs = toNumber(row.cogs);
  const operatingExpenses = toNumber(row.operating_expenses);
  const otherIncome = toNumber(row.other_income);
  const cashIn = toNumber(row.cash_in);
  const cashOut = toNumber(row.cash_out);
  const orders = toNumber(row.orders_count);

  return {
    revenue,
    orders,
    units: toNumber(row.units),
    discounts: toNumber(row.discounts),
    cogs,
    grossProfit: revenue - cogs,
    operatingExpenses,
    otherIncome,
    netProfit: revenue - cogs - operatingExpenses + otherIncome,
    paymentsReceived: toNumber(row.payments_received),
    receivables: toNumber(row.receivables),
    cashIn,
    cashOut,
    netCash: cashIn - cashOut,
    refunds: toNumber(row.refunds),
    inventoryPurchases: toNumber(row.inventory_purchases),
    averageOrder: orders > 0 ? Math.round(revenue / orders) : 0,
  };
}

export interface TrendPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  cashIn: number;
  cashOut: number;
}

export async function getDailyTrend(
  db: DbExecutor,
  start: Date,
  end: Date,
  days: string[],
  labels: string[]
): Promise<TrendPoint[]> {
  const sales = await db.query<{ day: string; revenue: unknown; orders: unknown }>(
    `SELECT to_char((o.created_at AT TIME ZONE 'Asia/Makassar')::date, 'YYYY-MM-DD') AS day,
            COALESCE(SUM(o.total), 0) AS revenue,
            COUNT(*) AS orders
       FROM orders o
      WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2
      GROUP BY 1`,
    [start.toISOString(), end.toISOString()]
  );
  const cash = await db.query<{ day: string; cash_in: unknown; cash_out: unknown }>(
    `SELECT to_char((f.occurred_at AT TIME ZONE 'Asia/Makassar')::date, 'YYYY-MM-DD') AS day,
            COALESCE(SUM(CASE WHEN f.type = 'INCOME' THEN f.amount ELSE 0 END), 0) AS cash_in,
            COALESCE(SUM(CASE WHEN f.type = 'EXPENSE' THEN f.amount ELSE 0 END), 0) AS cash_out
       FROM financial_entries f
      WHERE f.is_voided = FALSE AND f.occurred_at >= $1 AND f.occurred_at < $2
      GROUP BY 1`,
    [start.toISOString(), end.toISOString()]
  );

  const salesMap = new Map(sales.map((row) => [row.day, row]));
  const cashMap = new Map(cash.map((row) => [row.day, row]));

  return days.map((date, index) => ({
    date,
    label: labels[index] || date,
    revenue: toNumber(salesMap.get(date)?.revenue),
    orders: toNumber(salesMap.get(date)?.orders),
    cashIn: toNumber(cashMap.get(date)?.cash_in),
    cashOut: toNumber(cashMap.get(date)?.cash_out),
  }));
}

export async function getProductPerformance(db: DbExecutor, start: Date, end: Date) {
  return db.query<{
    product_id: string;
    name: string;
    sku: string;
    quantity: unknown;
    revenue: unknown;
    cogs: unknown;
    margin: unknown;
  }>(
    `SELECT oi.product_id, MAX(oi.product_name) AS name, MAX(oi.sku) AS sku,
            SUM(oi.quantity) AS quantity,
            SUM(oi.line_total) AS revenue,
            SUM(oi.quantity * oi.unit_cost) AS cogs,
            SUM(oi.line_total - oi.quantity * oi.unit_cost) AS margin
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2
      GROUP BY oi.product_id
      ORDER BY quantity DESC, revenue DESC
      LIMIT 10`,
    [start.toISOString(), end.toISOString()]
  );
}

export async function getPaymentBreakdown(db: DbExecutor, start: Date, end: Date) {
  return db.query<{ method: string; name: string | null; amount: unknown; count: unknown }>(
    `SELECT p.method, pm.name, SUM(p.amount) AS amount, COUNT(*) AS count
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       LEFT JOIN payment_methods pm ON pm.code = p.method
      WHERE o.status <> 'CANCELLED' AND p.paid_at >= $1 AND p.paid_at < $2
      GROUP BY p.method, pm.name
      ORDER BY amount DESC`,
    [start.toISOString(), end.toISOString()]
  );
}

export async function getHourlySales(db: DbExecutor, start: Date, end: Date) {
  return db.query<{ hour: string; revenue: unknown; orders: unknown }>(
    `SELECT to_char(o.created_at AT TIME ZONE 'Asia/Makassar', 'HH24') AS hour,
            COALESCE(SUM(o.total), 0) AS revenue,
            COUNT(*) AS orders
       FROM orders o
      WHERE o.status <> 'CANCELLED' AND o.created_at >= $1 AND o.created_at < $2
      GROUP BY 1 ORDER BY 1`,
    [start.toISOString(), end.toISOString()]
  );
}

export async function getStatusCounts(db: DbExecutor, start: Date, end: Date) {
  const rows = await db.query<{ status: string; count: unknown }>(
    `SELECT status, COUNT(*) AS count FROM orders
      WHERE created_at >= $1 AND created_at < $2 GROUP BY status`,
    [start.toISOString(), end.toISOString()]
  );
  return Object.fromEntries(rows.map((row) => [row.status, toNumber(row.count)])) as Record<
    string,
    number
  >;
}

export async function getCumulativeCash(db: DbExecutor, until: Date) {
  const rows = await db.query<{ cash_in: unknown; cash_out: unknown }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS cash_in,
       COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS cash_out
     FROM financial_entries WHERE is_voided = FALSE AND occurred_at < $1`,
    [until.toISOString()]
  );
  return toNumber(rows[0]?.cash_in) - toNumber(rows[0]?.cash_out);
}
