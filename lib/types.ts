export type Role = 'OWNER' | 'STAFF' | 'INVENTORY';
export type OrderStatus = 'NEW' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type OrderChannel = 'WHATSAPP' | 'DIRECT' | 'OTHER';
export type FinanceType = 'INCOME' | 'EXPENSE';
export type FinanceKind =
  | 'SALES'
  | 'OTHER_INCOME'
  | 'OPERATING_EXPENSE'
  | 'INVENTORY_PURCHASE'
  | 'REFUND';
export type StockAdjustmentType = 'PURCHASE' | 'ADJUSTMENT' | 'WASTAGE' | 'RETURN';
export type IngredientCategory =
  | 'COFFEE'
  | 'DAIRY'
  | 'SWEETENER'
  | 'PACKAGING'
  | 'OTHER';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  categoryName: string | null;
}

export interface ActiveOption {
  id: string;
  code: string;
  name: string;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
  currency: string;
  dailyTarget: number;
  defaultDeliveryFee: number;
  receiptNote: string;
}
