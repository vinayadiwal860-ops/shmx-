import { evaluateCoupon } from '../lib/pricing';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Address, Coupon, Order } from '../types/database';

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.');
  }
  return supabase;
}

export async function fetchUserAddresses(userId: string): Promise<Address[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Address[];
}

export async function createAddress(
  userId: string,
  payload: Omit<Address, 'id' | 'user_id' | 'created_at'>
): Promise<Address> {
  const client = requireClient();
  if (payload.is_default) {
    await client.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }
  const { data, error } = await client
    .from('addresses')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to save address.');
  return data as Address;
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('addresses').delete().eq('id', addressId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function validateCoupon(code: string, subtotal: number): Promise<{ coupon: Coupon; discountAmount: number }> {
  const client = requireClient();
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) throw new Error('Enter a coupon code.');

  const { data, error } = await client
    .from('coupons')
    .select('*')
    .ilike('code', trimmed)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const coupon = data as Coupon | null;
  const result = evaluateCoupon(coupon, subtotal);
  if (!result.valid || !coupon) {
    throw new Error(result.error || 'Invalid coupon code.');
  }
  return { coupon, discountAmount: result.discountAmount };
}

export async function placeCodOrder(addressId: string, couponCode?: string): Promise<Order> {
  const client = requireClient();
  const { data, error } = await client.rpc('place_cod_order', {
    p_address_id: addressId,
    p_coupon_code: couponCode?.trim() || null,
  });
  if (error || !data) {
    throw new Error(error?.message || 'Unable to place Cash on Delivery order.');
  }
  return data as Order;
}

export interface RazorpayInitResponse {
  order_id: string;
  order_number: string;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
}

export async function createRazorpayOrder(addressId: string, couponCode?: string): Promise<RazorpayInitResponse> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('create-razorpay-order', {
    body: {
      address_id: addressId,
      coupon_code: couponCode?.trim() || null,
    },
  });

  if (error) {
    throw new Error(error.message || 'Razorpay order initialization failed.');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data as RazorpayInitResponse;
}

export async function verifyRazorpayPayment(payload: {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<Order> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('verify-razorpay-payment', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Payment signature verification failed.');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data.order as Order;
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Order | null) ?? null;
}

export async function cancelOrder(orderId: string, reason: string): Promise<Order> {
  const client = requireClient();
  const { data, error } = await client.rpc('cancel_order_and_restore_stock', {
    p_order_id: orderId,
    p_reason: reason.trim() || 'Cancelled by customer',
    p_refund_notes: null,
  });
  if (error || !data) throw new Error(error?.message || 'Unable to cancel order.');
  return data as Order;
}
