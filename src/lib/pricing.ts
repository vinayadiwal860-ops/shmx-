import type { Coupon, StoreSettings } from '../types/database';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export function computeEffectivePrice(price: number, discountPercent: number): number {
  const safePrice = Math.max(0, Number(price) || 0);
  const safeDiscount = Math.min(95, Math.max(0, Number(discountPercent) || 0));
  return Math.round(safePrice * (1 - safeDiscount / 100) * 100) / 100;
}

export function formatINR(amount: number): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

export function getStockStatus(stockQuantity: number, lowStockThreshold = 10): StockStatus {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

export function getStockLabel(status: StockStatus): string {
  switch (status) {
    case 'out_of_stock':
      return 'Out of Stock';
    case 'low_stock':
      return 'Low Stock';
    case 'in_stock':
      return 'In Stock';
  }
}

export function calculateShippingCharge(
  subtotal: number,
  settings: Pick<StoreSettings, 'shipping_flat_rate' | 'free_shipping_threshold'>
): number {
  if (subtotal <= 0) return 0;
  if (subtotal >= settings.free_shipping_threshold) return 0;
  return Math.max(0, Number(settings.shipping_flat_rate) || 0);
}

export interface CouponResult {
  valid: boolean;
  discountAmount: number;
  error?: string;
}

export function evaluateCoupon(
  coupon: Coupon | null,
  subtotal: number,
  now = new Date()
): CouponResult {
  if (!coupon) {
    return { valid: false, discountAmount: 0, error: 'Coupon code not found.' };
  }
  if (!coupon.is_active) {
    return { valid: false, discountAmount: 0, error: 'This coupon is no longer active.' };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now.getTime()) {
    return { valid: false, discountAmount: 0, error: 'This coupon has expired.' };
  }
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, discountAmount: 0, error: 'This coupon has reached its usage limit.' };
  }
  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum order of ${formatINR(coupon.min_order_amount)} required for ${coupon.code}.`,
    };
  }

  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = Math.round(subtotal * (coupon.discount_value / 100) * 100) / 100;
    if (coupon.max_discount_amount !== null && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }
  } else {
    discount = Math.min(subtotal, coupon.discount_value);
  }

  return { valid: true, discountAmount: Math.max(0, discount) };
}

export function clampQuantityToStock(requestedQty: number, stockQuantity: number): number {
  if (stockQuantity <= 0) return 0;
  return Math.max(1, Math.min(Math.floor(requestedQty), stockQuantity));
}

export interface SimpleCartRow {
  product_id: string;
  quantity: number;
}

export function mergeGuestCartRows(
  guestRows: SimpleCartRow[],
  serverRows: SimpleCartRow[],
  stockMap: Record<string, number>
): SimpleCartRow[] {
  const merged = new Map<string, number>();
  for (const row of serverRows) {
    if (row.quantity > 0) {
      merged.set(row.product_id, row.quantity);
    }
  }
  for (const row of guestRows) {
    if (row.quantity > 0) {
      const existing = merged.get(row.product_id) ?? 0;
      const maxStock = stockMap[row.product_id] ?? Number.MAX_SAFE_INTEGER;
      const combined = Math.min(existing + row.quantity, maxStock);
      if (combined > 0) {
        merged.set(row.product_id, combined);
      }
    }
  }
  return Array.from(merged.entries()).map(([product_id, quantity]) => ({ product_id, quantity }));
}
