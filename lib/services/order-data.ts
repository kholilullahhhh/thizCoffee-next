import { getDb } from '@/lib/db';
import { toNumber } from '@/lib/format';

export async function getOrderFormOptions() {
  const db = await getDb();
  const [products, customers, methods, channels, settings] = await Promise.all([
    db.query<{
      id: string;
      name: string;
      sku: string;
      price: unknown;
      stock: unknown;
      category_name: string | null;
      volume_ml: number | null;
    }>(
      `SELECT p.id, p.name, p.sku, p.price, p.stock, p.volume_ml, c.name AS category_name
       FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE p.active = TRUE ORDER BY c.name, p.name`
    ),
    db.query<{ id: string; name: string; phone: string | null }>(
      'SELECT id, name, phone FROM customers WHERE active = TRUE ORDER BY name'
    ),
    db.query<{ code: string; name: string }>(
      'SELECT code, name FROM payment_methods WHERE active = TRUE ORDER BY sort_order, name'
    ),
    db.query<{ code: string; name: string }>(
      'SELECT code, name FROM order_channels WHERE active = TRUE ORDER BY sort_order, name'
    ),
    db.query<{ default_delivery_fee: unknown }>(
      "SELECT default_delivery_fee FROM business_settings WHERE id = 'default'"
    ),
  ]);

  return {
    products: products.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      price: toNumber(row.price),
      stock: toNumber(row.stock),
      categoryName: row.category_name,
      volumeMl: row.volume_ml,
    })),
    customers,
    methods,
    channels,
    defaultDeliveryFee: toNumber(settings[0]?.default_delivery_fee),
  };
}
