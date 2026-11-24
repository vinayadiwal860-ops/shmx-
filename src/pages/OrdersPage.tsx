import { useCallback, useEffect, useState } from 'react';
import { Package, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../lib/pricing';
import { isSupabaseConfigured } from '../lib/supabase';
import { cancelOrder, fetchUserOrders } from '../services/orderService';
import type { Order } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';

interface OrdersPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
}

export function OrdersPage({ onNavigate, onOpenAuth }: OrdersPageProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUserOrders(user.id);
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    setError(null);
    try {
      await cancelOrder(orderId, 'Cancelled by customer');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-[#0B1F3A]">My Orders</h1>
        <NotConfiguredNotice service="Supabase" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <Package className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0B1F3A]">
          Sign in to view your orders
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Track component shipments, view invoices, and manage order cancellations.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-6 rounded-lg bg-[#F97316] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-[#0B1F3A] sm:text-3xl">My Orders</h1>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-[#0B1F3A]">No orders placed yet</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Explore our ECE components and lab kits to place your first order.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/catalog')}
            className="mt-5 rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white"
          >
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {orders.map((order) => {
            const canCancel = order.order_status === 'placed' || order.order_status === 'packed';
            return (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div>
                    <div className="font-mono text-sm font-bold text-[#0B1F3A]">
                      {order.order_number}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString('en-IN')} ·{' '}
                      {order.payment_method === 'razorpay' ? 'Razorpay' : 'COD'} ({order.payment_status})
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold capitalize text-[#0B1F3A]">
                      Status: {order.order_status}
                    </span>
                    <span className="font-mono text-base font-bold text-[#0B1F3A] tabular-nums">
                      {formatINR(order.total_amount)}
                    </span>
                  </div>
                </div>

                <ul className="divide-y divide-slate-100 py-2 text-sm">
                  {(order.order_items ?? []).map((item) => (
                    <li key={item.id} className="flex justify-between gap-4 py-2">
                      <div>
                        <span className="font-medium text-[#0B1F3A]">{item.product_name}</span>
                        <span className="ml-2 font-mono text-xs text-slate-500">
                          ({item.model_number}) × {item.quantity}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums">
                        {formatINR(item.line_total)}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.refund_notes && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Refund Note: {order.refund_notes}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/order-confirmed/${order.id}`)}
                    className="text-xs font-semibold text-[#F97316] hover:underline"
                  >
                    View Full Receipt
                  </button>

                  {canCancel && (
                    <button
                      type="button"
                      disabled={cancellingId === order.id}
                      onClick={() => handleCancel(order.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
