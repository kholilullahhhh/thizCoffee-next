-- THIZ COFFEE business dashboard schema.
-- PostgreSQL 14+ and PGlite compatible. The script is idempotent so it can be
-- applied on every deploy, but destructive changes must ship as new statements.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'STAFF',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('OWNER', 'STAFF', 'INVENTORY'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS business_settings (
  id                   TEXT PRIMARY KEY DEFAULT 'default',
  business_name        TEXT NOT NULL DEFAULT 'THIZ COFFEE',
  phone                TEXT NOT NULL DEFAULT '+62 888 4257 606',
  email                TEXT NOT NULL DEFAULT 'thiz.coffee@gmail.com',
  address              TEXT NOT NULL DEFAULT 'Keliling Makassar, South Sulawesi',
  timezone             TEXT NOT NULL DEFAULT 'Asia/Makassar',
  currency             TEXT NOT NULL DEFAULT 'IDR',
  daily_target         BIGINT NOT NULL DEFAULT 300000 CHECK (daily_target >= 0),
  default_delivery_fee BIGINT NOT NULL DEFAULT 0 CHECK (default_delivery_fee >= 0),
  receipt_note         TEXT NOT NULL DEFAULT 'Terima kasih sudah ngopi bareng Thiz Coffee!',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO business_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS suppliers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  contact    TEXT,
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  notes      TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  description TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  sku          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category_id  TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
  volume_ml    INTEGER CHECK (volume_ml IS NULL OR volume_ml > 0),
  price        BIGINT NOT NULL CHECK (price >= 0),
  cost         BIGINT NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock    INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_active_idx ON products (active);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);

CREATE TABLE IF NOT EXISTS ingredients (
  id          TEXT PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'OTHER',
  unit        TEXT NOT NULL DEFAULT 'pcs',
  stock       NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock   NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  unit_cost   NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ingredients_category_check CHECK (category IN ('COFFEE', 'DAIRY', 'SWEETENER', 'PACKAGING', 'OTHER'))
);
CREATE INDEX IF NOT EXISTS ingredients_active_idx ON ingredients (active);
CREATE INDEX IF NOT EXISTS ingredients_supplier_idx ON ingredients (supplier_id);

CREATE TABLE IF NOT EXISTS recipe_items (
  id            TEXT PRIMARY KEY,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity      NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recipe_items_unique UNIQUE (product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  notes      TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers (lower(name));

CREATE TABLE IF NOT EXISTS payment_methods (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_channels (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS financial_categories (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  kind      TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_categories_unique UNIQUE (name, kind)
);
-- CAPITAL represents owner funding/opening cash. It is cash in but not revenue
-- or other income, so it must never be included in profit calculations.
ALTER TABLE financial_categories DROP CONSTRAINT IF EXISTS financial_categories_kind_check;
ALTER TABLE financial_categories ADD CONSTRAINT financial_categories_kind_check
  CHECK (kind IN ('SALES', 'OTHER_INCOME', 'OPERATING_EXPENSE', 'INVENTORY_PURCHASE', 'REFUND', 'CAPITAL'));

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  order_number    TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  customer_id     TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  channel         TEXT NOT NULL DEFAULT 'DIRECT',
  status          TEXT NOT NULL DEFAULT 'NEW',
  payment_status  TEXT NOT NULL DEFAULT 'UNPAID',
  subtotal        BIGINT NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount        BIGINT NOT NULL DEFAULT 0 CHECK (discount >= 0),
  delivery_fee    BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total           BIGINT NOT NULL DEFAULT 0 CHECK (total >= 0),
  amount_paid     BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  refunded_amount BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  notes           TEXT,
  created_by      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  CONSTRAINT orders_status_check CHECK (status IN ('NEW', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')),
  CONSTRAINT orders_channel_check CHECK (channel IN ('WHATSAPP', 'DIRECT', 'OTHER')),
  CONSTRAINT orders_total_consistency_check CHECK (total = subtotal - discount + delivery_fee),
  CONSTRAINT orders_payment_amounts_check CHECK (amount_paid <= total AND refunded_amount <= amount_paid)
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
-- Channels are configurable via business_settings UI. Older schema versions
-- restricted the column to three fixed codes; remove that check so newly
-- configured channels can be used. Existing seed codes remain valid.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_channel_check;

CREATE TABLE IF NOT EXISTS order_items (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku          TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   BIGINT NOT NULL CHECK (unit_price >= 0),
  unit_cost    BIGINT NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  line_total   BIGINT NOT NULL CHECK (line_total >= 0),
  CONSTRAINT order_items_line_total_consistency_check CHECK (line_total = quantity * unit_price)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);

CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount          BIGINT NOT NULL CHECK (amount > 0),
  method          TEXT NOT NULL,
  reference       TEXT,
  notes           TEXT,
  idempotency_key TEXT UNIQUE,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id);
CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON payments (paid_at);

CREATE TABLE IF NOT EXISTS financial_entries (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES financial_categories(id) ON DELETE RESTRICT,
  amount      BIGINT NOT NULL CHECK (amount > 0),
  method      TEXT NOT NULL DEFAULT 'CASH',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  notes       TEXT,
  order_id    TEXT REFERENCES orders(id) ON DELETE SET NULL,
  payment_id  TEXT UNIQUE REFERENCES payments(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  dedupe_key  TEXT NOT NULL UNIQUE,
  is_voided   BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at   TIMESTAMPTZ,
  voided_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  void_reason TEXT,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_entries_type_check CHECK (type IN ('INCOME', 'EXPENSE')),
  CONSTRAINT financial_entries_void_check CHECK (
    (is_voided = FALSE AND voided_at IS NULL) OR
    (is_voided = TRUE AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS financial_entries_occurred_idx ON financial_entries (occurred_at);
CREATE INDEX IF NOT EXISTS financial_entries_type_idx ON financial_entries (type);
CREATE INDEX IF NOT EXISTS financial_entries_category_idx ON financial_entries (category_id);
CREATE INDEX IF NOT EXISTS financial_entries_order_idx ON financial_entries (order_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id             TEXT PRIMARY KEY,
  adjustment_no  TEXT NOT NULL UNIQUE,
  type           TEXT NOT NULL,
  reason         TEXT NOT NULL,
  notes          TEXT,
  supplier_id    TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  total_cost     BIGINT NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  created_by     TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_adjustments_type_check CHECK (type IN ('PURCHASE', 'ADJUSTMENT', 'WASTAGE', 'RETURN'))
);
CREATE INDEX IF NOT EXISTS stock_adjustments_created_idx ON stock_adjustments (created_at);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id            TEXT PRIMARY KEY,
  adjustment_id TEXT NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id    TEXT REFERENCES products(id) ON DELETE SET NULL,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,
  quantity      NUMERIC(14, 3) NOT NULL,
  unit_cost     NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  line_cost     BIGINT NOT NULL DEFAULT 0 CHECK (line_cost >= 0),
  CONSTRAINT stock_adjustment_items_one_item CHECK (num_nonnulls(product_id, ingredient_id) = 1),
  CONSTRAINT stock_adjustment_items_quantity_check CHECK (quantity <> 0)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id            TEXT PRIMARY KEY,
  product_id    TEXT REFERENCES products(id) ON DELETE SET NULL,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  quantity      NUMERIC(14, 3) NOT NULL,
  unit_cost     NUMERIC(14, 4),
  reason        TEXT NOT NULL,
  reference_type TEXT,
  reference_id  TEXT,
  adjustment_id TEXT REFERENCES stock_adjustments(id) ON DELETE SET NULL,
  dedupe_key    TEXT UNIQUE,
  created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_type_check CHECK (type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'WASTAGE', 'RETURN', 'PRODUCTION')),
  CONSTRAINT stock_movements_one_item CHECK (num_nonnulls(product_id, ingredient_id) = 1),
  CONSTRAINT stock_movements_quantity_check CHECK (quantity <> 0)
);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx ON stock_movements (created_at);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS stock_movements_ingredient_idx ON stock_movements (ingredient_id);
CREATE INDEX IF NOT EXISTS stock_movements_reference_idx ON stock_movements (reference_type, reference_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  summary     TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS adjustment_number_seq START 1;

INSERT INTO payment_methods (id, code, name, sort_order) VALUES
  ('pm-cash', 'CASH', 'Tunai', 10),
  ('pm-transfer', 'TRANSFER', 'Transfer Bank', 20),
  ('pm-qris', 'QRIS', 'QRIS', 30),
  ('pm-ewallet', 'EWALLET', 'E-Wallet', 40),
  ('pm-other', 'OTHER', 'Lainnya', 90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_channels (id, code, name, sort_order) VALUES
  ('ch-whatsapp', 'WHATSAPP', 'WhatsApp', 10),
  ('ch-direct', 'DIRECT', 'Penjualan Langsung', 20),
  ('ch-other', 'OTHER', 'Lainnya', 90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO financial_categories (id, name, kind, is_system) VALUES
  ('fcat-sales', 'Penjualan', 'SALES', TRUE),
  ('fcat-other-income', 'Pemasukan Lain', 'OTHER_INCOME', TRUE),
  ('fcat-inventory', 'Bahan Baku & Kemasan', 'INVENTORY_PURCHASE', TRUE),
  ('fcat-operating', 'Operasional', 'OPERATING_EXPENSE', TRUE),
  ('fcat-salary', 'Gaji & Tenaga Kerja', 'OPERATING_EXPENSE', TRUE),
  ('fcat-marketing', 'Marketing & Promosi', 'OPERATING_EXPENSE', TRUE),
  ('fcat-rent', 'Sewa', 'OPERATING_EXPENSE', TRUE),
  ('fcat-delivery', 'Pengiriman', 'OPERATING_EXPENSE', TRUE),
  ('fcat-other-expense', 'Pengeluaran Lain', 'OPERATING_EXPENSE', TRUE),
  ('fcat-refund', 'Refund Penjualan', 'REFUND', TRUE),
  ('fcat-capital', 'Modal & Saldo Awal', 'CAPITAL', TRUE)
ON CONFLICT (id) DO NOTHING;
