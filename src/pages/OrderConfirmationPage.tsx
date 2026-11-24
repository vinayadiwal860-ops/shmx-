import { useEffect, useState } from 'react';
import { CheckCircle2, Package } from 'lucide-react';
import { formatINR } from '../lib/pricing';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchOrderById } from '../services/orderService';
import type { Order } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';

interface OrderConfirmationPageProps {
  orderId: string;
  onNavigate: (path: string) => void;
}

export function OrderConfirmationPage({ orderId, onNavigate }: OrderConfirmationPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    fetchOrderById(orderId)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load order.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <NotConfiguredNotice service="Supabase" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">Order Not Found</h1>
        <p className="mt-2 text-sm text-slate-600">{error || 'Unable to retrieve order summary.'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/orders')}
          className="mt-6 rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white"
        >
          View My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-emerald-700">Order Confirmed</p>
            <h1 className="mt-0.5 font-display text-2xl font-bold text-[#0B1F3A]">
              Order {order.order_number}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Placed on {new Date(order.created_at).toLocaleString('en-IN')} · Status:{' '}
              <span className="font-semibold capitalize text-[#0B1F3A]">{order.order_status}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-500">Shipping Address</div>
            <div className="mt-1 font-semibold text-[#0B1F3A]">{order.address_snapshot.full_name}</div>
            <div className="text-xs text-slate-600">
              {order.address_snapshot.line1}
              {order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}
            </div>
            <div className="text-xs text-slate-600">
              {order.address_snapshot.city}, {order.address_snapshot.state} —{' '}
              {order.address_snapshot.postal_code}
            </div>
            <div className="mt-1 font-mono text-xs text-slate-500">{order.address_snapshot.phone}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">Payment Summary</div>
            <div className="mt-1 text-xs text-slate-700">
              Method:{' '}
              <span className="font-semibold uppercase">
                {order.payment_method === 'razorpay' ? 'Razorpay Online' : 'Cash on Delivery'}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-slate-700">
              Payment Status:{' '}
              <span className="font-semibold capitalize text-[#0B1F3A]">
                {order.payment_status}
              </span>
            </div>
            <div className="mt-2 font-mono text-lg font-bold text-[#0B1F3A] tabular-nums">
              Total: {formatINR(order.total_amount)}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-[#0B1F3A]">Items Ordered</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {(order.order_items ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="font-medium text-[#0B1F3A]">{item.product_name}</div>
                  <div className="font-mono text-xs text-slate-500">
                    {item.model_number} · Qty {item.quantity} × {formatINR(item.unit_price)}
                  </div>
                </div>
                <span className="font-mono font-semibold text-[#0B1F3A] tabular-nums">
                  {formatINR(item.line_total)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => onNavigate('/orders')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#16335B]"
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            View My Orders
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/catalog')}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
