import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateShippingCharge,
  clampQuantityToStock,
  computeEffectivePrice,
  evaluateCoupon,
  getStockStatus,
  mergeGuestCartRows,
} from './pricing';
import type { Coupon } from '../types/database';

test('computeEffectivePrice applies discount accurately', () => {
  assert.equal(computeEffectivePrice(350, 10), 315);
  assert.equal(computeEffectivePrice(20, 0), 20);
  assert.equal(computeEffectivePrice(1000, 12.5), 875);
});

test('getStockStatus classifies in_stock, low_stock, and out_of_stock', () => {
  assert.equal(getStockStatus(0, 10), 'out_of_stock');
  assert.equal(getStockStatus(5, 10), 'low_stock');
  assert.equal(getStockStatus(10, 10), 'low_stock');
  assert.equal(getStockStatus(11, 10), 'in_stock');
});

test('calculateShippingCharge applies free threshold correctly', () => {
  const settings = { shipping_flat_rate: 60, free_shipping_threshold: 999 };
  assert.equal(calculateShippingCharge(0, settings), 0);
  assert.equal(calculateShippingCharge(500, settings), 60);
  assert.equal(calculateShippingCharge(999, settings), 0);
  assert.equal(calculateShippingCharge(1500, settings), 0);
});

test('evaluateCoupon enforces min order, expiry, usage limit, and max discount cap', () => {
  const percentCoupon: Coupon = {
    id: '1',
    code: 'ECE10',
    discount_type: 'percent',
    discount_value: 10,
    min_order_amount: 500,
    max_discount_amount: 250,
    expires_at: '2099-01-01T00:00:00Z',
    usage_limit: 100,
    used_count: 10,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  assert.equal(evaluateCoupon(percentCoupon, 400).valid, false);
  assert.deepEqual(evaluateCoupon(percentCoupon, 1000), { valid: true, discountAmount: 100 });
  assert.deepEqual(evaluateCoupon(percentCoupon, 5000), { valid: true, discountAmount: 250 });

  const expiredCoupon: Coupon = { ...percentCoupon, expires_at: '2020-01-01T00:00:00Z' };
  assert.equal(evaluateCoupon(expiredCoupon, 1000).valid, false);

  const maxedCoupon: Coupon = { ...percentCoupon, used_count: 100 };
  assert.equal(evaluateCoupon(maxedCoupon, 1000).valid, false);
});

test('clampQuantityToStock and mergeGuestCartRows cap quantities at available stock', () => {
  assert.equal(clampQuantityToStock(5, 0), 0);
  assert.equal(clampQuantityToStock(5, 3), 3);
  assert.equal(clampQuantityToStock(0, 3), 1);

  const merged = mergeGuestCartRows(
    [
      { product_id: 'p1', quantity: 4 },
      { product_id: 'p2', quantity: 2 },
    ],
    [{ product_id: 'p1', quantity: 3 }],
    { p1: 5, p2: 10 }
  );
  assert.deepEqual(merged, [
    { product_id: 'p1', quantity: 5 },
    { product_id: 'p2', quantity: 2 },
  ]);
});
