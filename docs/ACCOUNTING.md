# Accounting, Inventory, and Order Rules

All amounts are integer Indonesian rupiah (IDR). Reports use the business timezone
`Asia/Makassar` (WITA, UTC+8). Date ranges are converted to inclusive start and
exclusive next-day end boundaries in the database.

## Profit and cash are different views

| Metric | Rule |
| --- | --- |
| **Revenue (omzet)** | Sum of `orders.total` for orders whose status is not `CANCELLED`, by `created_at` |
| **COGS (HPP)** | Sum of `order_items.quantity × order_items.unit_cost`, using the product cost snapshot at sale time |
| **Gross profit** | Revenue − COGS |
| **Operating expenses** | Non-voided financial entries in categories of kind `OPERATING_EXPENSE` |
| **Other income** | Non-voided entries in categories of kind `OTHER_INCOME` |
| **Net profit** | Revenue − COGS − operating expenses + other income |
| **Payments received** | Actual payments on non-cancelled orders, by `paid_at` |
| **Receivables** | Sum of `total − amount_paid` for non-cancelled orders created in the period |
| **Cash in** | All non-voided `INCOME` financial entries, including sales payments and owner capital |
| **Cash out** | All non-voided `EXPENSE` financial entries, including inventory purchases and refunds |
| **Net cash** | Cash in − cash out |

Key consequences:

- Inventory purchases are **cash out** but are **not** an operating expense for
  net profit. Their cost reaches profit through COGS when products are sold.
- Owner capital/opening cash is recorded under the system category
  `Modal & Saldo Awal` (kind `CAPITAL`). It increases cash but is excluded from
  revenue, other income, and net profit.
- Revenue is recognized when a non-cancelled order is created, not only when cash
  is collected. Unpaid or partially paid orders therefore create receivables.
- A cancelled order is excluded from revenue, COGS, payments received, and
  receivables. Actual cash already collected and refunded still appears in the
  cash book.

## Order lifecycle

Statuses: `NEW → PROCESSING → READY → COMPLETED`, or `CANCELLED`.

Payment statuses: `UNPAID`, `PARTIAL`, `PAID`, `REFUNDED`.

- Sales are created atomically with line items, product stock deductions, recipe
  ingredient deductions, stock movements, an optional initial payment, and audit
  log entries in one transaction.
- Product and ingredient rows are updated with a non-negative stock guard. A sale
  or outgoing adjustment that would make stock negative is rejected.
- Overpayment is rejected. A payment cannot exceed the remaining order balance.
- Status changes are validated server-side and audited.
- The receipt shows the cost snapshot line for owners only.

### Cancellation and refund

Cancelling an order:

1. Marks the order `CANCELLED` with a mandatory reason.
2. Restores product and ingredient stock from the original `SALE` stock movements.
3. Records `RETURN` stock movements with cancellation dedupe keys.
4. If cash was paid, marks it refunded and records a `REFUND` expense.
5. Sets payment status to `REFUNDED` when money was actually refunded, otherwise
   leaves it `UNPAID`.
6. Keeps the original payment income entry. The refund is a separate cash-out
   entry, so cash nets to zero while the audit trail remains intact.
7. Cannot be cancelled twice.

## Inventory

- Products have their own stock; ingredients/packaging have separate stock.
- A product recipe is a set of ingredient quantities per unit sold. Recipe edits
  are transactional and validate active ingredients and duplicate rows.
- Stock adjustments support `PURCHASE`, `ADJUSTMENT`, `WASTAGE`, and `RETURN`.
- Positive quantities add stock; negative quantities remove stock. Zero is
  rejected, and outgoing changes cannot take stock below zero.
- A purchase can optionally record an inventory-purchase expense. The payment
  method must be active, and the expense is linked to the adjustment.
- Purchases and adjustments are idempotent through a caller-supplied idempotency
  key; a duplicate request returns the existing adjustment instead of applying it
  twice.
- Sales and stock movements carry dedupe keys to prevent duplicate inventory
  effects from retries.

## Manual finance entries

Owners can add manual entries only in these category kinds:

- `OTHER_INCOME`
- `OPERATING_EXPENSE`
- `INVENTORY_PURCHASE`

Sales, refunds, and stock-adjustment entries are system-generated. They cannot be
voided directly:

- A sales/payment entry must be reversed by cancelling the order.
- An inventory purchase entry must be reversed by the inventory workflow.
- Manual entries can be voided once with a mandatory reason. A second void is
  rejected.
- System financial categories (`SALES`, `REFUND`, `CAPITAL`) cannot be deactivated
  or edited from settings.

## Idempotency

The following operations require an idempotency key:

- Create sale
- Add payment
- Create stock adjustment
- Create a manual finance entry (the dashboard sends one automatically; API clients may omit it, in which case the server generates a unique key)

A retry with the same key returns the original result instead of creating a
duplicate order, payment, stock movement, or financial entry. Keys are stored
with database uniqueness constraints, so retries are safe even if two requests
arrive concurrently.

## Audit log

The audit log records authentication, order creation, status changes, payments,
cancellations/refunds, stock adjustments, product/customer/supplier changes,
configuration changes, user administration, settings changes, and finance voids.
Each record includes actor, action, entity, summary, optional metadata, and
timestamp. The log is visible to owners only under
`/dashboard/settings/audit`.
