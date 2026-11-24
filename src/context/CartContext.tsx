import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clampQuantityToStock, computeEffectivePrice, mergeGuestCartRows } from '../lib/pricing';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { CartEntry, Product } from '../types/database';
import { useAuth } from './AuthContext';

const GUEST_CART_KEY = 'shmx_guest_cart_v1';

interface CartContextValue {
  items: CartEntry[];
  wishlistIds: Set<string>;
  wishlistProducts: Product[];
  loading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  itemCount: number;
  subtotal: number;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  toggleWishlist: (productId: string, onRequireAuth?: () => void) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readGuestCart(): { product_id: string; quantity: number }[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r) => r && typeof r.product_id === 'string' && typeof r.quantity === 'number' && r.quantity > 0
    );
  } catch {
    return [];
  }
}

function writeGuestCart(rows: { product_id: string; quantity: number }[]) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(rows));
  } catch {
    // ignore storage quota failures
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartEntry[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const mergedForUserRef = useRef<string | null>(null);

  const hydrateProductsForRows = useCallback(
    async (rows: { product_id: string; quantity: number }[]): Promise<CartEntry[]> => {
      if (rows.length === 0) return [];
      if (!isSupabaseConfigured || !supabase) return [];
      const ids = rows.map((r) => r.product_id);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', ids)
        .eq('is_active', true);

      if (error || !data) return [];
      const map = new Map<string, Product>();
      for (const p of data as Product[]) {
        map.set(p.id, {
          ...p,
          price: Number(p.price),
          discount_percent: Number(p.discount_percent),
          images: Array.isArray(p.images) ? p.images : [],
        });
      }
      const entries: CartEntry[] = [];
      for (const r of rows) {
        const product = map.get(r.product_id);
        if (!product) continue;
        const clamped = clampQuantityToStock(r.quantity, product.stock_quantity);
        if (clamped > 0) {
          entries.push({ product_id: r.product_id, quantity: clamped, product });
        }
      }
      return entries;
    },
    []
  );

  const refreshCart = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      if (!user) {
        const guest = readGuestCart();
        const hydrated = await hydrateProductsForRows(guest);
        setItems(hydrated);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity, products(*)')
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);

      const serverRows = (data ?? []) as unknown as Array<{
        product_id: string;
        quantity: number;
        products: Product | null;
      }>;

      // Merge guest cart once on login
      const guestRows = readGuestCart();
      if (guestRows.length > 0 && mergedForUserRef.current !== user.id) {
        mergedForUserRef.current = user.id;
        const allIds = Array.from(
          new Set([...guestRows.map((g) => g.product_id), ...serverRows.map((s) => s.product_id)])
        );
        const { data: prodData } = await supabase
          .from('products')
          .select('id, stock_quantity, is_active')
          .in('id', allIds);

        const stockMap: Record<string, number> = {};
        for (const p of prodData ?? []) {
          stockMap[p.id] = p.is_active ? p.stock_quantity : 0;
        }

        const merged = mergeGuestCartRows(
          guestRows,
          serverRows.map((s) => ({ product_id: s.product_id, quantity: s.quantity })),
          stockMap
        );

        for (const row of merged) {
          await supabase.from('cart_items').upsert(
            { user_id: user.id, product_id: row.product_id, quantity: row.quantity },
            { onConflict: 'user_id,product_id' }
          );
        }
        writeGuestCart([]);

        const { data: refreshed } = await supabase
          .from('cart_items')
          .select('product_id, quantity, products(*)')
          .eq('user_id', user.id);

        const entries = ((refreshed ?? []) as unknown as Array<{ product_id: string; quantity: number; products: Product | null }>)
          .filter((r) => r.products && r.products.is_active)
          .map((r) => ({
            product_id: r.product_id,
            quantity: r.quantity,
            product: {
              ...(r.products as Product),
              price: Number(r.products!.price),
              discount_percent: Number(r.products!.discount_percent),
              images: Array.isArray(r.products!.images) ? r.products!.images : [],
            },
          }));
        setItems(entries);
        return;
      }

      const entries = serverRows
        .filter((r) => r.products && r.products.is_active)
        .map((r) => ({
          product_id: r.product_id,
          quantity: r.quantity,
          product: {
            ...(r.products as Product),
            price: Number(r.products!.price),
            discount_percent: Number(r.products!.discount_percent),
            images: Array.isArray(r.products!.images) ? r.products!.images : [],
          },
        }));
      setItems(entries);
    } finally {
      setLoading(false);
    }
  }, [hydrateProductsForRows, user]);

  const refreshWishlist = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) {
      setWishlistProducts([]);
      return;
    }
    const { data } = await supabase
      .from('wishlist')
      .select('products(*)')
      .eq('user_id', user.id);

    const prods = ((data ?? []) as unknown as Array<{ products: Product | null }>)
      .map((r) => r.products)
      .filter((p): p is Product => Boolean(p && p.is_active))
      .map((p) => ({
        ...p,
        price: Number(p.price),
        discount_percent: Number(p.discount_percent),
        images: Array.isArray(p.images) ? p.images : [],
      }));
    setWishlistProducts(prods);
  }, [user]);

  useEffect(() => {
    refreshCart();
    refreshWishlist();
  }, [refreshCart, refreshWishlist]);

  const addToCart = async (product: Product, quantity = 1) => {
    if (product.stock_quantity <= 0) {
      throw new Error('This component is currently out of stock.');
    }
    const existing = items.find((i) => i.product_id === product.id);
    const nextQty = clampQuantityToStock((existing?.quantity ?? 0) + quantity, product.stock_quantity);

    if (!user) {
      const guest = readGuestCart().filter((g) => g.product_id !== product.id);
      guest.push({ product_id: product.id, quantity: nextQty });
      writeGuestCart(guest);
      setItems((prev) => {
        const rest = prev.filter((i) => i.product_id !== product.id);
        return [...rest, { product_id: product.id, quantity: nextQty, product }];
      });
      return;
    }

    if (!supabase) return;
    const { error } = await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: product.id, quantity: nextQty },
      { onConflict: 'user_id,product_id' }
    );
    if (error) throw new Error(error.message);
    await refreshCart();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    const entry = items.find((i) => i.product_id === productId);
    const maxStock = entry?.product?.stock_quantity ?? 99;
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    const clamped = clampQuantityToStock(quantity, maxStock);

    if (!user) {
      const guest = readGuestCart().map((g) =>
        g.product_id === productId ? { ...g, quantity: clamped } : g
      );
      writeGuestCart(guest);
      setItems((prev) =>
        prev.map((i) => (i.product_id === productId ? { ...i, quantity: clamped } : i))
      );
      return;
    }

    if (!supabase) return;
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: clamped })
      .eq('user_id', user.id)
      .eq('product_id', productId);
    if (error) throw new Error(error.message);
    await refreshCart();
  };

  const removeFromCart = async (productId: string) => {
    if (!user) {
      const guest = readGuestCart().filter((g) => g.product_id !== productId);
      writeGuestCart(guest);
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
      return;
    }
    if (!supabase) return;
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);
    if (error) throw new Error(error.message);
    await refreshCart();
  };

  const toggleWishlist = async (productId: string, onRequireAuth?: () => void) => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!supabase) return;
    const exists = wishlistProducts.some((p) => p.id === productId);
    if (exists) {
      await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', productId);
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, product_id: productId });
    }
    await refreshWishlist();
  };

  const wishlistIds = useMemo(() => new Set(wishlistProducts.map((p) => p.id)), [wishlistProducts]);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, i) => {
        if (!i.product) return sum;
        const unit = computeEffectivePrice(i.product.price, i.product.discount_percent);
        return sum + unit * i.quantity;
      }, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        wishlistIds,
        wishlistProducts,
        loading,
        isCartOpen,
        setIsCartOpen,
        itemCount,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart,
        toggleWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
