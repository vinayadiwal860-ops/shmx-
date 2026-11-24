import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, MapPin, Plus, Tag, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { calculateShippingCharge, computeEffectivePrice, formatINR } from '../lib/pricing';
import { isRazorpayConfigured, isSupabaseConfigured } from '../lib/supabase';
import { isValidPostalCode } from '../lib/validators';
import {
  createAddress,
  createRazorpayOrder,
  fetchUserAddresses,
  placeCodOrder,
  validateCoupon,
  verifyRazorpayPayment,
} from '../services/orderService';
import type { Address, Coupon, PaymentMethod, StoreSettings } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';

interface CheckoutPageProps {
  settings: StoreSettings;
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (resp: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutPage({ settings, onNavigate, onOpenAuth }: CheckoutPageProps) {
  const { user, profile } = useAuth();
  const { items, subtotal, refreshCart } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddress, setShowNewAddress] = useState(false);

  // New Address Form
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPin, setAddrPin] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isRazorpayConfigured ? 'razorpay' : 'cod'
  );
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    fetchUserAddresses(user.id)
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) setSelectedAddressId(def.id);
        if (list.length === 0) setShowNewAddress(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load addresses.'));
  }, [user]);

  useEffect(() => {
    if (profile?.full_name && !addrName) setAddrName(profile.full_name);
    if (profile?.phone && !addrPhone) setAddrPhone(profile.phone);
  }, [profile, addrName, addrPhone]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-[#0B1F3A]">Checkout</h1>
        <NotConfiguredNotice service="Supabase" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">Sign in to Checkout</h1>
        <p className="mt-2 text-sm text-slate-600">
          Login or create an account to select a delivery address and complete your component order.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-6 rounded-lg bg-[#F97316] px-6 py-3 text-sm font-semibold text-white hover:bg-[#EA580C]"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">Your cart is empty</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add ECE components to your cart before proceeding to checkout.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/catalog')}
          className="mt-6 rounded-lg bg-[#0B1F3A] px-6 py-3 text-sm font-semibold text-white"
        >
          Browse Components
        </button>
      </div>
    );
  }

  const shippingCharge = calculateShippingCharge(subtotal, settings);
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCharge);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidPostalCode(addrPin)) {
      setError('Enter a valid 6-digit Indian PIN code.');
      return;
    }
    setSavingAddr(true);
    try {
      const saved = await createAddress(user.id, {
        full_name: addrName.trim(),
        phone: addrPhone.trim(),
        line1: addrLine1.trim(),
        line2: addrLine2.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        postal_code: addrPin.trim(),
        is_default: addresses.length === 0,
      });
      setAddresses((prev) => [saved, ...prev]);
      setSelectedAddressId(saved.id);
      setShowNewAddress(false);
      setAddrLine1('');
      setAddrLine2('');
      setAddrCity('');
      setAddrState('');
      setAddrPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save address.');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError(null);
    setCouponBusy(true);
    try {
      const res = await validateCoupon(couponInput, subtotal);
      setAppliedCoupon(res);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon.');
    } finally {
      setCouponBusy(false);
    }
  };

  const handlePlaceOrder = async () => {
    setError(null);
    if (!selectedAddressId) {
      setError('Please select or add a delivery address.');
      return;
    }

    setPlacingOrder(true);
    try {
      if (paymentMethod === 'cod') {
        if (!settings.cod_enabled) {
          throw new Error('Cash on Delivery is disabled by the store administrator.');
        }
        const order = await placeCodOrder(selectedAddressId, appliedCoupon?.coupon.code);
        await refreshCart();
        onNavigate(`/order-confirmed/${order.id}`);
        return;
      }

      // Razorpay Flow
      if (!isRazorpayConfigured) {
        throw new Error('Razorpay payment gateway is not configured.');
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay Checkout SDK. Check your internet connection.');
      }

      const rzpInit = await createRazorpayOrder(selectedAddressId, appliedCoupon?.coupon.code);

      const rzp = new window.Razorpay({
        key: rzpInit.key_id,
        amount: rzpInit.amount_paise,
        currency: rzpInit.currency,
        name: 'SHMX Electronics',
        description: `Order ${rzpInit.order_number}`,
        order_id: rzpInit.razorpay_order_id,
        prefill: {
          name: profile?.full_name || '',
          email: user.email || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#0B1F3A' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifiedOrder = await verifyRazorpayPayment({
              order_id: rzpInit.order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refreshCart();
            onNavigate(`/order-confirmed/${verifiedOrder.id}`);
          } catch (verifyErr) {
            setError(
              verifyErr instanceof Error
                ? verifyErr.message
                : 'Payment verification failed. Contact support.'
            );
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
          },
        },
      });

      rzp.on('payment.failed', (resp) => {
        setError(resp?.error?.description || 'Payment failed in Razorpay checkout.');
        setPlacingOrder(false);
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
      setPlacingOrder(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-[#0B1F3A] sm:text-3xl">Checkout</h1>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* 1. Delivery Address */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-[#0B1F3A] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
                1. Delivery Address
              </h2>
              <button
                type="button"
                onClick={() => setShowNewAddress((s) => !s)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F97316] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {showNewAddress ? 'Cancel' : 'Add New Address'}
              </button>
            </div>

            {addresses.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-[#0B1F3A] bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery-address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-[#F97316]"
                    />
                    <div className="text-sm">
                      <div className="font-semibold text-[#0B1F3A]">{addr.full_name}</div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ''}
                      </div>
                      <div className="text-xs text-slate-600">
                        {addr.city}, {addr.state} — {addr.postal_code}
                      </div>
                      <div className="mt-1 font-mono text-xs text-slate-500">{addr.phone}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {showNewAddress && (
              <form onSubmit={handleSaveAddress} className="mt-5 grid grid-cols-1 gap-3.5 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="addr-name" className="block text-xs font-medium text-slate-700">
                    Recipient Name
                  </label>
                  <input
                    id="addr-name"
                    type="text"
                    required
                    value={addrName}
                    onChange={(e) => setAddrName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="addr-phone" className="block text-xs font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    id="addr-phone"
                    type="tel"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="addr-line1" className="block text-xs font-medium text-slate-700">
                    Address Line 1 (Lab / Hostel / Street)
                  </label>
                  <input
                    id="addr-line1"
                    type="text"
                    required
                    value={addrLine1}
                    onChange={(e) => setAddrLine1(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="addr-line2" className="block text-xs font-medium text-slate-700">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    id="addr-line2"
                    type="text"
                    value={addrLine2}
                    onChange={(e) => setAddrLine2(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="addr-city" className="block text-xs font-medium text-slate-700">
                    City
                  </label>
                  <input
                    id="addr-city"
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="addr-state" className="block text-xs font-medium text-slate-700">
                    State
                  </label>
                  <input
                    id="addr-state"
                    type="text"
                    required
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="addr-pin" className="block text-xs font-medium text-slate-700">
                    PIN Code
                  </label>
                  <input
                    id="addr-pin"
                    type="text"
                    required
                    maxLength={6}
                    value={addrPin}
                    onChange={(e) => setAddrPin(e.target.value)}
                    placeholder="560001"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={savingAddr}
                    className="h-10 w-full rounded-lg bg-[#0B1F3A] text-xs font-semibold text-white hover:bg-[#16335B]"
                  >
                    {savingAddr ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* 2. Payment Method */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-[#0B1F3A] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
              2. Payment Method
            </h2>

            <div className="mt-4 space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                  paymentMethod === 'razorpay' ? 'border-[#0B1F3A] bg-slate-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1 accent-[#F97316]"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#0B1F3A]">
                    Razorpay Online Payment (UPI, Cards, Netbanking)
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Order creation and HMAC signature verification run on Supabase Edge Functions.
                  </p>
                  {!isRazorpayConfigured && paymentMethod === 'razorpay' && (
                    <div className="mt-3">
                      <NotConfiguredNotice service="Razorpay" />
                    </div>
                  )}
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  !settings.cod_enabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                    : paymentMethod === 'cod'
                      ? 'cursor-pointer border-[#0B1F3A] bg-slate-50'
                      : 'cursor-pointer border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  disabled={!settings.cod_enabled}
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 accent-[#F97316]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#0B1F3A] flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    Cash on Delivery (COD)
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {settings.cod_enabled
                      ? 'Pay in cash or UPI upon delivery. Stock is reserved immediately on confirmation.'
                      : 'Cash on Delivery is currently disabled by store administration.'}
                  </p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-[#0B1F3A]">Order Summary</h2>

          <ul className="divide-y divide-slate-200 text-sm">
            {items.map((entry) => {
              if (!entry.product) return null;
              const unit = computeEffectivePrice(entry.product.price, entry.product.discount_percent);
              return (
                <li key={entry.product_id} className="flex justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-medium text-[#0B1F3A] truncate">{entry.product.name}</div>
                    <div className="font-mono text-xs text-slate-500">
                      {entry.product.model_number} × {entry.quantity}
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-[#0B1F3A] tabular-nums shrink-0">
                    {formatINR(unit * entry.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Coupon Input */}
          <div className="border-t border-slate-200 pt-4">
            <label htmlFor="checkout-coupon" className="block text-xs font-semibold text-slate-700">
              Coupon Code
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="checkout-coupon"
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="ECE10"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 font-mono text-xs uppercase"
                />
              </div>
              <button
                type="button"
                disabled={couponBusy}
                onClick={handleApplyCoupon}
                className="h-9 rounded-lg bg-[#0B1F3A] px-3.5 text-xs font-semibold text-white hover:bg-[#16335B]"
              >
                {couponBusy ? '...' : 'Apply'}
              </button>
            </div>
            {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
            {appliedCoupon && (
              <div className="mt-2 flex items-center justify-between text-xs text-emerald-700">
                <span className="inline-flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {appliedCoupon.coupon.code} applied (-{formatINR(appliedCoupon.discountAmount)})
                </span>
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  className="text-slate-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t border-slate-200 pt-4 text-sm tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium text-[#0B1F3A]">{formatINR(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Coupon Discount</span>
                <span className="font-mono font-medium">-{formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="font-mono font-medium text-[#0B1F3A]">
                {shippingCharge === 0 ? 'Free' : formatINR(shippingCharge)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-[#0B1F3A]">
              <span>Total</span>
              <span className="font-mono">{formatINR(finalTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={
              placingOrder ||
              !selectedAddressId ||
              (paymentMethod === 'razorpay' && !isRazorpayConfigured) ||
              (paymentMethod === 'cod' && !settings.cod_enabled)
            }
            onClick={handlePlaceOrder}
            className="w-full rounded-lg bg-[#F97316] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {placingOrder
              ? 'Processing Order...'
              : paymentMethod === 'razorpay'
                ? `Pay ${formatINR(finalTotal)} with Razorpay`
                : `Confirm COD Order (${formatINR(finalTotal)})`}
          </button>
        </aside>
      </div>
    </div>
  );
}
