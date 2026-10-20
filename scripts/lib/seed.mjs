import { randomUUID } from 'node:crypto';
import { hashPassword } from './password.mjs';

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'thizcoffee123';

const PRODUCTS = [
  {
    id: 'prod-kopi-aren',
    sku: 'THIZ-KGA-250',
    name: 'Kopi Gula Aren',
    categoryId: 'cat-classic',
    volume: 250,
    price: 15000,
    cost: 6500,
    stock: 420,
    min: 10,
  },
  {
    id: 'prod-caramel',
    sku: 'THIZ-CLT-250',
    name: 'Caramel Latte',
    categoryId: 'cat-classic',
    volume: 250,
    price: 15000,
    cost: 7000,
    stock: 360,
    min: 10,
  },
  {
    id: 'prod-vanilla',
    sku: 'THIZ-VNC-250',
    name: 'Vanilla Coffee',
    categoryId: 'cat-signature',
    volume: 250,
    price: 20000,
    cost: 8500,
    stock: 300,
    min: 10,
  },
  {
    id: 'prod-matcha',
    sku: 'THIZ-MTC-250',
    name: 'Matcha Coffee',
    categoryId: 'cat-seasonal',
    volume: 250,
    price: 24000,
    cost: 10000,
    stock: 6,
    min: 10,
  },
];

const INGREDIENTS = [
  {
    id: 'ing-arabika',
    sku: 'BB-ARB-001',
    name: 'Arabika Toraja',
    category: 'COFFEE',
    unit: 'g',
    stock: 9000,
    min: 1000,
    cost: 220,
    supplierId: 'sup-toraja',
  },
  {
    id: 'ing-robusta',
    sku: 'BB-ROB-001',
    name: 'Robusta Kalosi',
    category: 'COFFEE',
    unit: 'g',
    stock: 7000,
    min: 1000,
    cost: 160,
    supplierId: 'sup-toraja',
  },
  {
    id: 'ing-aren',
    sku: 'BB-ARN-001',
    name: 'Gula Aren Cair',
    category: 'SWEETENER',
    unit: 'g',
    stock: 12000,
    min: 2000,
    cost: 25,
    supplierId: 'sup-makassar',
  },
  {
    id: 'ing-susu',
    sku: 'BB-SUS-001',
    name: 'Susu Segar',
    category: 'DAIRY',
    unit: 'ml',
    stock: 60000,
    min: 8000,
    cost: 18,
    supplierId: 'sup-makassar',
  },
  {
    id: 'ing-botol',
    sku: 'PK-BTL-250',
    name: 'Botol PET 250ml',
    category: 'PACKAGING',
    unit: 'pcs',
    stock: 600,
    min: 100,
    cost: 1800,
    supplierId: 'sup-kemasan',
  },
  {
    id: 'ing-tutup',
    sku: 'PK-TTP-001',
    name: 'Tutup Botol',
    category: 'PACKAGING',
    unit: 'pcs',
    stock: 580,
    min: 100,
    cost: 500,
    supplierId: 'sup-kemasan',
  },
  {
    id: 'ing-label',
    sku: 'PK-LBL-001',
    name: 'Label Thiz Coffee',
    category: 'PACKAGING',
    unit: 'pcs',
    stock: 450,
    min: 100,
    cost: 350,
    supplierId: 'sup-kemasan',
  },
  {
    id: 'ing-matcha',
    sku: 'BB-MTC-001',
    name: 'Matcha Powder',
    category: 'COFFEE',
    unit: 'g',
    stock: 80,
    min: 200,
    cost: 900,
    supplierId: 'sup-makassar',
  },
];

const RECIPES = {
  'prod-kopi-aren': [
    ['ing-arabika', 12],
    ['ing-robusta', 8],
    ['ing-aren', 25],
    ['ing-susu', 120],
    ['ing-botol', 1],
    ['ing-tutup', 1],
    ['ing-label', 1],
  ],
  'prod-caramel': [
    ['ing-arabika', 15],
    ['ing-aren', 15],
    ['ing-susu', 150],
    ['ing-botol', 1],
    ['ing-tutup', 1],
    ['ing-label', 1],
  ],
  'prod-vanilla': [
    ['ing-arabika', 14],
    ['ing-aren', 18],
    ['ing-susu', 140],
    ['ing-botol', 1],
    ['ing-tutup', 1],
    ['ing-label', 1],
  ],
  'prod-matcha': [
    ['ing-matcha', 10],
    ['ing-aren', 10],
    ['ing-susu', 130],
    ['ing-botol', 1],
    ['ing-tutup', 1],
    ['ing-label', 1],
  ],
};

const CUSTOMERS = [
  ['cust-rizky', 'Rizky A.', '6281200000101', 'Jl. Pettarani, Makassar'],
  ['cust-sasha', 'Sasha W.', '6281200000102', 'Jl. Perintis Kemerdekaan, Makassar'],
  ['cust-dani', 'Dani P.', '6281200000103', 'Jl. Panakkukang, Makassar'],
  ['cust-mia', 'Mia K.', '6281200000104', 'Jl. Metro Tanjung Bunga, Makassar'],
  ['cust-tio', 'Tio R.', '6281200000105', 'Jl. Sultan Alauddin, Makassar'],
  ['cust-clara', 'Clara N.', '6281200000106', 'Jl. Ratulangi, Makassar'],
];

const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'QRIS', 'EWALLET'];
const CHANNELS = ['WHATSAPP', 'DIRECT', 'OTHER'];

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makassarDateParts(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  };
}

function makassarDateString(offsetDays = 0) {
  const { year, month, day } = makassarDateParts(offsetDays);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateAt(offsetDays, hour, minute = 0) {
  const { year, month, day } = makassarDateParts(offsetDays);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0));
}

function nowMakassar() {
  return new Date(Date.now());
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

function orderNumber(date, sequence) {
  return `TRX-${date.replaceAll('-', '')}-${String(sequence).padStart(4, '0')}`;
}

async function insertAudit(tx, actorId, action, entityType, entityId, summary) {
  await tx.query(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, summary)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), actorId, action, entityType, entityId, summary]
  );
}

export async function seedDatabase(db, { force = false, allowProduction = false } = {}) {
  const existing = await db.query('SELECT COUNT(*)::int AS count FROM users');
  if ((existing[0]?.count ?? 0) > 0 && !force) {
    return { skipped: true, reason: 'Database sudah berisi data. Seed dilewati.' };
  }
  if (process.env.NODE_ENV === 'production' && !allowProduction) {
    return {
      skipped: true,
      reason:
        'Seed demo tidak dijalankan di production. Gunakan npm run db:create-admin untuk membuat akun admin.',
    };
  }

  const random = mulberry32(20261020);
  const now = nowMakassar();

  await db.transaction(async (tx) => {
    const ownerId = 'user-owner';
    const staffId = 'user-staff';
    const inventoryId = 'user-inventory';
    const password = hashPassword(DEMO_PASSWORD);

    for (const user of [
      [ownerId, 'Owner Thiz Coffee', 'owner@thiz.coffee', 'OWNER'],
      [staffId, 'Staff Thiz Coffee', 'staff@thiz.coffee', 'STAFF'],
      [inventoryId, 'Inventory Thiz Coffee', 'inventory@thiz.coffee', 'INVENTORY'],
    ]) {
      await tx.query(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [user[0], user[1], user[2], password, user[3]]
      );
    }

    for (const category of [
      ['cat-classic', 'Classic Series', 'classic', 'Kopi susu klasik yang jadi favorit harian.'],
      ['cat-signature', 'Signature Series', 'signature', 'Racikan signature Thiz Coffee.'],
      ['cat-seasonal', 'Seasonal Series', 'seasonal', 'Menu terbatas dan eksperimen musiman.'],
    ]) {
      await tx.query(
        `INSERT INTO product_categories (id, name, slug, description) VALUES ($1, $2, $3, $4)`,
        category
      );
    }

    for (const supplier of [
      [
        'sup-toraja',
        'Koperasi Kopi Toraja',
        'Pak Yohan',
        '6281100000201',
        'toraja@example.test',
        'Toraja, Sulawesi Selatan',
        'Pemasok arabika dan robusta. Data contoh development.',
      ],
      [
        'sup-makassar',
        'CV Bahan Segar Makassar',
        'Ibu Nia',
        '6281100000202',
        'segar@example.test',
        'Jl. Toddopuli, Makassar',
        'Susu, gula aren, dan matcha. Data contoh development.',
      ],
      [
        'sup-kemasan',
        'Kemasan Nusantara',
        'Pak Andi',
        '6281100000203',
        'kemasan@example.test',
        'Jl. Kima, Makassar',
        'Botol, tutup, dan label. Data contoh development.',
      ],
    ]) {
      await tx.query(
        `INSERT INTO suppliers (id, name, contact, phone, email, address, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        supplier
      );
    }

    for (const product of PRODUCTS) {
      await tx.query(
        `INSERT INTO products
          (id, sku, name, category_id, volume_ml, price, cost, stock, min_stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          product.id,
          product.sku,
          product.name,
          product.categoryId,
          product.volume,
          product.price,
          product.cost,
          product.stock,
          product.min,
        ]
      );
    }

    for (const ingredient of INGREDIENTS) {
      await tx.query(
        `INSERT INTO ingredients
          (id, sku, name, category, unit, stock, min_stock, unit_cost, supplier_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          ingredient.id,
          ingredient.sku,
          ingredient.name,
          ingredient.category,
          ingredient.unit,
          ingredient.stock,
          ingredient.min,
          ingredient.cost,
          ingredient.supplierId,
        ]
      );
    }

    for (const [productId, items] of Object.entries(RECIPES)) {
      for (const [ingredientId, quantity] of items) {
        await tx.query(
          `INSERT INTO recipe_items (id, product_id, ingredient_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [randomUUID(), productId, ingredientId, quantity]
        );
      }
    }

    for (const [id, name, phone, address] of CUSTOMERS) {
      await tx.query(
        `INSERT INTO customers (id, name, phone, address, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, name, phone, address, 'Data contoh development.']
      );
    }

    await tx.query(
      `UPDATE business_settings
       SET daily_target = 500000, default_delivery_fee = 5000,
           receipt_note = 'Terima kasih sudah ngopi bareng Thiz Coffee! Simpan struk ini sebagai bukti pembayaran.',
           updated_at = now()
       WHERE id = 'default'`
    );

    // Opening inventory: stock in + a capitalized inventory purchase.
    const openingDate = dateAt(-40, 8, 30);
    const openingId = 'adj-opening';
    const openingNo = `ADJ-${makassarDateString(-40).replaceAll('-', '')}-001`;
    let openingTotal = 0;
    const openingItems = [];
    for (const product of PRODUCTS) {
      const line = product.stock * product.cost;
      openingTotal += line;
      openingItems.push({
        productId: product.id,
        ingredientId: null,
        quantity: product.stock,
        unitCost: product.cost,
        line,
      });
    }
    for (const ingredient of INGREDIENTS) {
      const line = Math.round(ingredient.stock * ingredient.cost);
      openingTotal += line;
      openingItems.push({
        productId: null,
        ingredientId: ingredient.id,
        quantity: ingredient.stock,
        unitCost: ingredient.cost,
        line,
      });
    }
    await tx.query(
      `INSERT INTO stock_adjustments
        (id, adjustment_no, type, reason, notes, total_cost, created_by, created_at)
       VALUES ($1, $2, 'PURCHASE', $3, $4, $5, $6, $7)`,
      [
        openingId,
        openingNo,
        'Stok awal dan pembelian persediaan',
        'Data contoh development.',
        openingTotal,
        ownerId,
        openingDate.toISOString(),
      ]
    );
    for (const item of openingItems) {
      await tx.query(
        `INSERT INTO stock_adjustment_items
          (id, adjustment_id, product_id, ingredient_id, quantity, unit_cost, line_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          openingId,
          item.productId,
          item.ingredientId,
          item.quantity,
          item.unitCost,
          item.line,
        ]
      );
      await tx.query(
        `INSERT INTO stock_movements
          (id, product_id, ingredient_id, type, quantity, unit_cost, reason,
           reference_type, reference_id, adjustment_id, dedupe_key, created_by, created_at)
         VALUES ($1, $2, $3, 'PURCHASE', $4, $5, $6, 'ADJUSTMENT', $7, $7, $8, $9, $10)`,
        [
          randomUUID(),
          item.productId,
          item.ingredientId,
          item.quantity,
          item.unitCost,
          'Stok awal / pembelian persediaan',
          openingId,
          `seed-opening-${item.productId || item.ingredientId}`,
          ownerId,
          openingDate.toISOString(),
        ]
      );
    }
    await tx.query(
      `INSERT INTO financial_entries
        (id, type, category_id, amount, method, occurred_at, description, notes,
         supplier_id, dedupe_key, created_by, created_at)
       VALUES ($1, 'EXPENSE', 'fcat-inventory', $2, 'TRANSFER', $3, $4, $5, $6, $7, $8, $9)`,
      [
        'fin-opening',
        openingTotal,
        openingDate.toISOString(),
        'Pembelian stok awal bahan baku & kemasan',
        'Data contoh development. Pembelian persediaan tidak mengurangi laba bersih (dihitung melalui HPP).',
        'sup-kemasan',
        'seed-fin-opening',
        ownerId,
        openingDate.toISOString(),
      ]
    );
    await tx.query(
      `INSERT INTO financial_entries
        (id, type, category_id, amount, method, occurred_at, description, notes,
         dedupe_key, created_by, created_at)
       VALUES ($1, 'INCOME', 'fcat-capital', $2, 'TRANSFER', $3, $4, $5, $6, $7, $8)`,
      [
        'fin-capital',
        25000000,
        openingDate.toISOString(),
        'Saldo awal kas dan modal pemilik',
        'Data contoh development. Modal bukan omzet dan tidak dihitung dalam laba bersih.',
        'seed-fin-capital',
        ownerId,
        openingDate.toISOString(),
      ]
    );

    const orderCounters = new Map();
    let orderSequence = 0;
    let lowProductSales = 0;
    const operatingExpenses = [
      [-30, 'fcat-rent', 1500000, 'TRANSFER', 'Sewa dapur produksi bulanan', 'seed-exp-rent-1'],
      [-25, 'fcat-salary', 2200000, 'TRANSFER', 'Gaji tim produksi & kurir', 'seed-exp-salary-1'],
      [-18, 'fcat-marketing', 500000, 'QRIS', 'Iklan Instagram dan konten', 'seed-exp-marketing-1'],
      [-12, 'fcat-operating', 350000, 'CASH', 'Listrik dan air', 'seed-exp-utility-1'],
      [-6, 'fcat-delivery', 250000, 'CASH', 'Bensin dan biaya kurir', 'seed-exp-delivery-1'],
      [
        -2,
        'fcat-operating',
        100000,
        'QRIS',
        'Perlengkapan kebersihan dapur',
        'seed-exp-supplies-1',
      ],
      [0, 'fcat-operating', 150000, 'CASH', 'Listrik dan internet hari ini', 'seed-exp-utility-today'],
    ];
    for (const [offset, categoryId, amount, method, description, dedupe] of operatingExpenses) {
      const occurred = offset === 0 ? dateAt(0, 7, 30) : dateAt(offset, 10, 0);
      await tx.query(
        `INSERT INTO financial_entries
          (id, type, category_id, amount, method, occurred_at, description, dedupe_key, created_by)
         VALUES ($1, 'EXPENSE', $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), categoryId, amount, method, occurred.toISOString(), description, dedupe, ownerId]
      );
    }
    await tx.query(
      `INSERT INTO financial_entries
        (id, type, category_id, amount, method, occurred_at, description, dedupe_key, created_by)
       VALUES ($1, 'INCOME', 'fcat-other-income', 1500000, 'TRANSFER', $2, $3, $4, $5)`,
      [
        randomUUID(),
        dateAt(-8, 14, 0).toISOString(),
        'Pesanan katering kantor (di luar penjualan harian)',
        'seed-other-income-1',
        ownerId,
      ]
    );

    for (let dayOffset = -29; dayOffset <= 0; dayOffset += 1) {
      const date = makassarDateString(dayOffset);
      const isWeekend = [0, 6].includes(new Date(`${date}T00:00:00+08:00`).getUTCDay());
      let orderTotal = isWeekend ? 7 + Math.floor(random() * 3) : 5 + Math.floor(random() * 3);
      if (dayOffset === 0) {
        const nowHour = Number(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Makassar',
            hour: '2-digit',
            hour12: false,
          }).format(now)
        );
        orderTotal = Math.max(1, Math.min(orderTotal, nowHour >= 12 ? 5 : 2));
      }

      for (let i = 0; i < orderTotal; i += 1) {
        orderSequence += 1;
        const counter = (orderCounters.get(date) || 0) + 1;
        orderCounters.set(date, counter);

        const created =
          dayOffset === 0
            ? new Date(
                Math.max(
                  dateAt(0, 0, 5).getTime(),
                  now.getTime() - (15 + Math.floor(random() * 180)) * 60000
                )
              )
            : dateAt(dayOffset, 9 + Math.floor(random() * 11), Math.floor(random() * 60));

        const customer =
          random() < 0.65 ? CUSTOMERS[Math.floor(random() * CUSTOMERS.length)] : null;
        const channel = pick(random, CHANNELS);
        const itemCount = 1 + Math.floor(random() * 2);
        const chosen = [];
        while (chosen.length < itemCount) {
          const product = PRODUCTS[Math.floor(random() * 3)];
          if (!chosen.some((entry) => entry.product.id === product.id)) {
            chosen.push({ product, qty: 1 + (random() < 0.35 ? 1 : 0) });
          }
        }

        const cancelled = random() < 0.04;
        const status =
          dayOffset === 0
            ? pick(random, ['NEW', 'PROCESSING', 'READY', 'COMPLETED'])
            : cancelled
              ? 'CANCELLED'
              : random() < 0.9
                ? 'COMPLETED'
                : pick(random, ['PROCESSING', 'READY']);

        const subtotal = chosen.reduce(
          (sum, entry) => sum + entry.product.price * entry.qty,
          0
        );
        const discount = random() < 0.15 ? 1000 : 0;
        const deliveryFee = channel === 'WHATSAPP' ? 5000 : 0;
        const total = subtotal - discount + deliveryFee;
        let amountPaid = 0;
        if (!cancelled) {
          if (status === 'COMPLETED' || status === 'READY') amountPaid = total;
          else if (status === 'PROCESSING') amountPaid = Math.floor(total / 2);
        }
        const paymentStatus =
          amountPaid >= total ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';
        const orderId = `seed-order-${orderSequence}`;
        const method = pick(random, PAYMENT_METHODS);

        await tx.query(
          `INSERT INTO orders
            (id, order_number, idempotency_key, customer_id, customer_name, customer_phone,
             channel, status, payment_status, subtotal, discount, delivery_fee, total,
             amount_paid, notes, created_by, created_at, updated_at, completed_at, cancelled_at,
             cancel_reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                   $16, $17, $18, $19, $20, $21)`,
          [
            orderId,
            orderNumber(date, counter),
            `seed-order-key-${orderSequence}`,
            customer?.[0] ?? null,
            customer?.[1] ?? pick(random, ['Walk-in Customer', 'Pelanggan WhatsApp', 'Anak Kampus']),
            customer?.[2] ?? null,
            channel,
            status,
            cancelled ? 'UNPAID' : paymentStatus,
            subtotal,
            discount,
            deliveryFee,
            total,
            amountPaid,
            'Data demo development.',
            ownerId,
            created.toISOString(),
            created.toISOString(),
            status === 'COMPLETED' ? created.toISOString() : null,
            cancelled ? created.toISOString() : null,
            cancelled ? 'Pesanan uji pembatalan (data demo).' : null,
          ]
        );

        const ingredientUsage = new Map();
        for (const entry of chosen) {
          const lineTotal = entry.product.price * entry.qty;
          await tx.query(
            `INSERT INTO order_items
              (id, order_id, product_id, product_name, sku, quantity, unit_price, unit_cost, line_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              randomUUID(),
              orderId,
              entry.product.id,
              entry.product.name,
              entry.product.sku,
              entry.qty,
              entry.product.price,
              entry.product.cost,
              lineTotal,
            ]
          );

          if (cancelled) continue;

          await tx.query(
            `UPDATE products SET stock = stock - $1, updated_at = now()
             WHERE id = $2 AND stock >= $1`,
            [entry.qty, entry.product.id]
          );
          await tx.query(
            `INSERT INTO stock_movements
              (id, product_id, type, quantity, unit_cost, reason, reference_type, reference_id,
               dedupe_key, created_by, created_at)
             VALUES ($1, $2, 'SALE', $3, $4, $5, 'ORDER', $6, $7, $8, $9)`,
            [
              randomUUID(),
              entry.product.id,
              -entry.qty,
              entry.product.cost,
              `Penjualan ${orderId}`,
              orderId,
              `seed-sale-${orderId}-product-${entry.product.id}`,
              ownerId,
              created.toISOString(),
            ]
          );

          for (const [ingredientId, quantity] of RECIPES[entry.product.id] || []) {
            ingredientUsage.set(
              ingredientId,
              (ingredientUsage.get(ingredientId) || 0) + quantity * entry.qty
            );
          }
          if (entry.product.id === 'prod-matcha') lowProductSales += entry.qty;
        }

        for (const [ingredientId, quantity] of ingredientUsage) {
          await tx.query(
            `UPDATE ingredients SET stock = stock - $1, updated_at = now()
             WHERE id = $2 AND stock >= $1`,
            [quantity, ingredientId]
          );
          await tx.query(
            `INSERT INTO stock_movements
              (id, ingredient_id, type, quantity, unit_cost, reason, reference_type, reference_id,
               dedupe_key, created_by, created_at)
             VALUES ($1, $2, 'SALE', $3, $4, $5, 'ORDER', $6, $7, $8, $9)`,
            [
              randomUUID(),
              ingredientId,
              -quantity,
              null,
              `Pemakaian resep untuk ${orderId}`,
              orderId,
              `seed-sale-${orderId}-ingredient-${ingredientId}`,
              ownerId,
              created.toISOString(),
            ]
          );
        }

        if (amountPaid > 0) {
          const paymentId = `seed-payment-${orderSequence}`;
          const paidAt = new Date(
            Math.min(created.getTime() + 15 * 60000, now.getTime())
          );
          await tx.query(
            `INSERT INTO payments
              (id, order_id, amount, method, reference, idempotency_key, paid_at, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              paymentId,
              orderId,
              amountPaid,
              method,
              `DEMO-${orderSequence}`,
              `seed-payment-key-${orderSequence}`,
              paidAt.toISOString(),
              ownerId,
            ]
          );
          await tx.query(
            `INSERT INTO financial_entries
              (id, type, category_id, amount, method, occurred_at, description, order_id,
               payment_id, dedupe_key, created_by, created_at)
             VALUES ($1, 'INCOME', 'fcat-sales', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              randomUUID(),
              amountPaid,
              method,
              paidAt.toISOString(),
              `Pembayaran ${orderNumber(date, counter)}`,
              orderId,
              paymentId,
              `seed-fin-payment-${orderSequence}`,
              ownerId,
              paidAt.toISOString(),
            ]
          );
        }

        if (orderSequence % 9 === 0 || cancelled) {
          await insertAudit(
            tx,
            ownerId,
            cancelled ? 'ORDER_CANCELLED' : 'ORDER_CREATED',
            'ORDER',
            orderId,
            cancelled
              ? `Pembatalan ${orderNumber(date, counter)} (data demo)`
              : `Pesanan ${orderNumber(date, counter)} dibuat (data demo)`
          );
        }
      }
    }

    await tx.query("SELECT setval('order_number_seq', $1, true)", [orderSequence + 50]);
    await tx.query("SELECT setval('adjustment_number_seq', 100, true)");

    await insertAudit(
      tx,
      ownerId,
      'SEED_DEMO',
      'SYSTEM',
      null,
      `Seed data development dijalankan (${orderSequence} pesanan, ${lowProductSales} unit matcha).`
    );
  });

  return {
    skipped: false,
    password: DEMO_PASSWORD,
    orders: 0,
    message: 'Seed development selesai.',
  };
}

export { DEMO_PASSWORD };
