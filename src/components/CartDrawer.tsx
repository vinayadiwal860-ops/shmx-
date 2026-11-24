import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { calculateShippingCharge, computeEffectivePrice, formatINR } from '../lib/pricing';
import type { StoreSettings } from '../types/database';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  settings: StoreSettings;
  onCheckout: () => void;
  onRequireAuth: () => void;
  onNavigateProduct: (slug: string) => void;
}

export function CartDrawer({
  settings,
  onCheckout,
  onRequireAuth,
  onNavigateProduct,
}: CartDrawerProps) {
  const { user } = useAuth();
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    subtotal,
    updateQuantity,
    removeFromCart,
  } = useCart();

  if (!isCartOpen) return null;

  const shipping = calculateShippingCharge(subtotal, settings);
  const amountToFree = Math.max(0, settings.free_shipping_threshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-[#0B1F3A]/40 backdrop-blur-[1px]"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">Your Cart</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart drawer"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <ShoppingBag className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-[#0B1F3A]">
                Your cart is empty
              </h3>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Browse ICs, development boards, sensors, and lab kits to add components here.
              </p>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="mt-5 rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#16335B]"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {subtotal > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                  {amountToFree === 0 ? (
                    <span className="font-medium text-emerald-700">
                      Unlocked free shipping (orders above {formatINR(settings.free_shipping_threshold)}).
                    </span>
                  ) : (
                    <span>
                      Add <strong className="tabular-nums">{formatINR(amountToFree)}</strong> more for
                      free shipping (standard shipping {formatINR(settings.shipping_flat_rate)}).
                    </span>
                  )}
                </div>
              )}

              <ul className="divide-y divide-slate-100">
                {items.map((entry) => {
                  const p = entry.product;
                  if (!p) return null;
                  const unitPrice = computeEffectivePrice(p.price, p.discount_percent);
                  return (
                    <li key={entry.product_id} className="flex gap-3.5 py-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCartOpen(false);
                          onNavigateProduct(p.slug);
                        }}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200"
                      >
                        <ProductImage src={p.images?.[0]} alt={p.name} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCartOpen(false);
                              onNavigateProduct(p.slug);
                            }}
                            className="text-left font-display text-sm font-semibold text-[#0B1F3A] hover:text-[#F97316] line-clamp-2"
                          >
                            {p.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(entry.product_id)}
                            aria-label={`Remove ${p.name} from cart`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>

                        <p className="mt-0.5 font-mono text-xs text-slate-500">{p.model_number}</p>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-lg border border-slate-200">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${p.name}`}
                              onClick={() => updateQuantity(entry.product_id, entry.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50"
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums">
                              {entry.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={entry.quantity >= p.stock_quantity}
                              aria-label={`Increase quantity of ${p.name}`}
                              onClick={() => updateQuantity(entry.product_id, entry.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>

                          <span className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                            {formatINR(unitPrice * entry.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-[#0B1F3A] tabular-nums">
                  {formatINR(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Shipping</span>
                <span className="font-mono font-semibold text-[#0B1F3A] tabular-nums">
                  {shipping === 0 ? 'Free' : formatINR(shipping)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                if (!user) {
                  onRequireAuth();
                } else {
                  onCheckout();
                }
              }}
              className="w-full rounded-lg bg-[#F97316] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
            >
              {user ? 'Proceed to Checkout' : 'Login to Checkout'}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
