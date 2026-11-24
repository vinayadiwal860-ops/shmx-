import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Edit3,
  Package,
  Plus,
  Settings,
  ShieldAlert,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { formatINR, getStockLabel, getStockStatus } from '../lib/pricing';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  adminDeleteCoupon,
  adminDeleteProduct,
  adminFetchAllProducts,
  adminFetchCategories,
  adminFetchCoupons,
  adminFetchDashboardStats,
  adminFetchOrders,
  adminSaveCoupon,
  adminSaveProduct,
  adminUpdateOrderStatus,
  adminUpdateStoreSettings,
  adminUploadProductImage,
  type AdminDashboardStats,
} from '../services/adminService';
import { fetchStoreSettings } from '../services/catalogService';
import type { Category, Coupon, Order, OrderStatus, Product, StoreSettings } from '../types/database';
import { AdminProductEditor } from '../components/admin/AdminProductEditor';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';
import { ProductImage } from '../components/ProductImage';

interface AdminPageProps {
  onOpenAuth: () => void;
  onCatalogMutated: () => void;
}

type AdminTab = 'overview' | 'products' | 'inventory' | 'orders' | 'settings';

export function AdminPage({ onOpenAuth, onCatalogMutated }: AdminPageProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    id: 1,
    hero_image_url: null,
    shipping_flat_rate: 60,
    free_shipping_threshold: 999,
    cod_enabled: true,
  });

  const [productSearch, setProductSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'flat'>('percent');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinOrder, setCouponMinOrder] = useState('500');
  const [couponMaxDisc, setCouponMaxDisc] = useState('250');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, p, c, o, cp, st] = await Promise.all([
        adminFetchDashboardStats(),
        adminFetchAllProducts(),
        adminFetchCategories(),
        adminFetchOrders(),
        adminFetchCoupons(),
        fetchStoreSettings(),
      ]);
      setStats(s);
      setProducts(p);
      setCategories(c);
      setOrders(o);
      setCoupons(cp);
      setSettings(st);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading) {
      loadAll();
    }
  }, [authLoading, loadAll]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-[#0B1F3A]">Admin Dashboard</h1>
        <NotConfiguredNotice service="Supabase" />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <ShieldAlert className="mx-auto h-10 w-10 text-[#F97316]" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0B1F3A]">
          Admin Authentication Required
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with an administrator account to manage inventory, images, orders, and store settings.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-6 rounded-lg bg-[#0B1F3A] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-[#F97316]" aria-hidden="true" />
            <div>
              <h1 className="font-display text-xl font-bold text-[#0B1F3A]">
                Access Restricted — Admin Role Required
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Your signed-in account (<span className="font-mono">{user.email || user.phone}</span>)
                currently has the <span className="font-mono font-semibold">customer</span> role.
                Database RLS blocks non-admin writes.
              </p>
              <p className="mt-3 text-xs text-slate-600">
                To promote this account in Supabase SQL Editor, run:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0B1F3A] p-3 font-mono text-xs text-slate-100">
                {`UPDATE public.profiles SET role = 'admin' WHERE id = '${user.id}';`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.model_number.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    );
  });

  const handleQuickStockSave = async (p: Product, newStock: number) => {
    try {
      await adminSaveProduct(p.id, { ...p, stock_quantity: Math.max(0, newStock) });
      await loadAll();
      onCatalogMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stock update failed.');
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await adminSaveProduct(p.id, { ...p, is_active: !p.is_active });
      await loadAll();
      onCatalogMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    try {
      await adminDeleteProduct(p.id);
      await loadAll();
      onCatalogMutated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Cannot delete product referenced by existing orders; deactivate it instead.'
      );
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setError(null);
    try {
      await adminUpdateOrderStatus(orderId, newStatus);
      await loadAll();
      onCatalogMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status.');
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSavingSettings(true);
    try {
      const url = await adminUploadProductImage(file, 'hero');
      const updated = await adminUpdateStoreSettings({ ...settings, hero_image_url: url });
      setSettings(updated);
      onCatalogMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hero upload failed.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSaved(false);
    setError(null);
    try {
      const updated = await adminUpdateStoreSettings(settings);
      setSettings(updated);
      setSettingsSaved(true);
      onCatalogMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await adminSaveCoupon({
        code: couponCode,
        discount_type: couponType,
        discount_value: Number(couponValue),
        min_order_amount: Number(couponMinOrder),
        max_discount_amount: couponMaxDisc ? Number(couponMaxDisc) : null,
        is_active: true,
      });
      setCouponCode('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create coupon.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1F3A] sm:text-3xl">
            SHMX Store Administration
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage ECE catalog, Storage photos, stock levels, orders, coupons, and shipping rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingProduct(null);
            setEditorOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F97316] px-4 text-xs font-semibold text-white hover:bg-[#EA580C] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Component
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px no-scrollbar">
        {[
          { id: 'overview', label: 'Sales Overview', icon: BarChart3 },
          { id: 'products', label: 'Products & Images', icon: Package },
          { id: 'inventory', label: 'Inventory & Low Stock', icon: Boxes },
          { id: 'orders', label: 'Orders', icon: Tag },
          { id: 'settings', label: 'Coupons & Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as AdminTab)}
              className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                active
                  ? 'border-[#F97316] text-[#0B1F3A]'
                  : 'border-transparent text-slate-500 hover:text-[#0B1F3A]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && stats && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Total Revenue</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#0B1F3A] tabular-nums">
                    {formatINR(stats.totalRevenue)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Total Orders</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#0B1F3A] tabular-nums">
                    {stats.totalOrders}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Registered Customers</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#0B1F3A] tabular-nums">
                    {stats.totalCustomers}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Catalog Products</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#0B1F3A] tabular-nums">
                    {stats.totalProducts}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                    Monthly Sales Revenue (₹)
                  </h2>
                  <div className="mt-4 h-72 w-full">
                    {stats.monthlySales.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        No completed orders recorded yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthlySales}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                          <Tooltip
                            formatter={(value) => [formatINR(Number(value ?? 0)), 'Revenue']}
                            contentStyle={{ borderRadius: '8px', borderColor: '#E2E8F0' }}
                          />
                          <Bar dataKey="revenue" fill="#0B1F3A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="font-display text-base font-bold text-[#0B1F3A] flex items-center gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-[#F97316]" aria-hidden="true" />
                    Low Stock Alerts ({stats.lowStockProducts.length})
                  </h2>
                  <ul className="mt-4 divide-y divide-slate-100 text-sm">
                    {stats.lowStockProducts.length === 0 ? (
                      <li className="py-4 text-slate-500">All components are adequately stocked.</li>
                    ) : (
                      stats.lowStockProducts.slice(0, 8).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <div className="font-medium text-[#0B1F3A] truncate">{p.name}</div>
                            <div className="font-mono text-xs text-slate-500">{p.model_number}</div>
                          </div>
                          <span
                            className={`font-mono text-xs font-bold tabular-nums ${
                              p.stock_quantity === 0 ? 'text-red-600' : 'text-amber-700'
                            }`}
                          >
                            {p.stock_quantity} left
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                  Best-Selling Components
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs text-slate-500">
                      <tr>
                        <th className="py-2.5 pr-4">Component</th>
                        <th className="py-2.5 pr-4">Model</th>
                        <th className="py-2.5 pr-4 text-right">Units Sold</th>
                        <th className="py-2.5 pr-4 text-right">Stock</th>
                        <th className="py-2.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.bestSellingProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-4 font-medium text-[#0B1F3A]">{p.name}</td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                            {p.model_number}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                            {p.sales_count}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                            {p.stock_quantity}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold tabular-nums">
                            {formatINR(p.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PRODUCTS & IMAGES */}
          {tab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="search"
                  placeholder="Filter by component name, model number, or brand..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-10 w-full max-w-md rounded-lg border border-slate-300 px-3 text-sm"
                />
                <span className="text-xs text-slate-500 tabular-nums">
                  {filteredProducts.length} components
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="p-3.5">Component</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5 text-right">Price</th>
                      <th className="p-3.5 text-right">Stock</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                              <ProductImage src={p.images?.[0]} alt={p.name} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#0B1F3A] truncate max-w-xs">
                                {p.name}
                              </div>
                              <div className="font-mono text-xs text-slate-500">
                                {p.model_number} · {p.images?.length || 0} photo(s)
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-xs text-slate-600">{p.category_name}</td>
                        <td className="p-3.5 text-right font-mono font-semibold tabular-nums">
                          {formatINR(p.price)}
                          {p.discount_percent > 0 && (
                            <div className="text-[11px] text-[#F97316]">-{p.discount_percent}%</div>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono tabular-nums">{p.stock_quantity}</td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            className={`text-xs font-semibold ${
                              p.is_active ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {p.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(p);
                                setEditorOpen(true);
                              }}
                              aria-label={`Edit ${p.name}`}
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-[#0B1F3A]"
                            >
                              <Edit3 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p)}
                              aria-label={`Delete ${p.name}`}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY */}
          {tab === 'inventory' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="p-3.5">Model / Component</th>
                    <th className="p-3.5">Availability</th>
                    <th className="p-3.5 text-right">Stock Qty</th>
                    <th className="p-3.5 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const st = getStockStatus(p.stock_quantity, p.low_stock_threshold);
                    return (
                      <tr key={p.id}>
                        <td className="p-3.5">
                          <div className="font-medium text-[#0B1F3A]">{p.name}</div>
                          <div className="font-mono text-xs text-slate-500">{p.model_number}</div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-xs font-semibold ${
                              st === 'out_of_stock'
                                ? 'text-red-600'
                                : st === 'low_stock'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {getStockLabel(st)}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold tabular-nums">
                          {p.stock_quantity}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickStockSave(p, p.stock_quantity - 5)}
                              className="rounded border border-slate-200 px-2 py-1 font-mono text-xs hover:bg-slate-50"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockSave(p, p.stock_quantity + 10)}
                              className="rounded border border-slate-200 px-2 py-1 font-mono text-xs hover:bg-slate-50"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStockSave(p, 0)}
                              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            >
                              Set 0
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-600">
                  No customer orders placed yet.
                </div>
              ) : (
                orders.map((ord) => (
                  <div key={ord.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <div className="font-mono text-sm font-bold text-[#0B1F3A]">
                          {ord.order_number}
                        </div>
                        <div className="text-xs text-slate-500">
                          {ord.address_snapshot.full_name} ({ord.address_snapshot.phone}) ·{' '}
                          {ord.address_snapshot.city}, {ord.address_snapshot.state}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                          {formatINR(ord.total_amount)}
                        </span>
                        <span className="text-xs text-slate-600 uppercase">
                          {ord.payment_method} ({ord.payment_status})
                        </span>
                        <select
                          aria-label={`Order status for ${ord.order_number}`}
                          value={ord.order_status}
                          onChange={(e) =>
                            handleOrderStatusChange(ord.id, e.target.value as OrderStatus)
                          }
                          className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#0B1F3A]"
                        >
                          <option value="placed">Placed</option>
                          <option value="packed">Packed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled (Restores Stock)</option>
                        </select>
                      </div>
                    </div>
                    <ul className="mt-2 divide-y divide-slate-100 text-xs">
                      {(ord.order_items ?? []).map((it) => (
                        <li key={it.id} className="flex justify-between py-1.5 text-slate-700">
                          <span>
                            {it.product_name} <span className="font-mono">({it.model_number})</span> ×{' '}
                            {it.quantity}
                          </span>
                          <span className="font-mono tabular-nums">{formatINR(it.line_total)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: COUPONS & STORE SETTINGS */}
          {tab === 'settings' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Store Settings & Hero Image */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
                  Shipping, COD & Hero Banner
                </h2>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Homepage Hero Electronics Lab Photo
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white">
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        Upload Hero
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleHeroUpload}
                          className="sr-only"
                        />
                      </label>
                      {settings.hero_image_url && (
                        <button
                          type="button"
                          onClick={async () => {
                            const updated = await adminUpdateStoreSettings({
                              ...settings,
                              hero_image_url: null,
                            });
                            setSettings(updated);
                            onCatalogMutated();
                          }}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600"
                        >
                          Reset to Navy Gradient
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {settings.hero_image_url
                      ? 'Custom hero image active.'
                      : 'No hero image set — storefront displays the dark navy gradient fallback.'}
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Flat Shipping Rate (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={settings.shipping_flat_rate}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            shipping_flat_rate: Number(e.target.value),
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Free Shipping Above (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={settings.free_shipping_threshold}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            free_shipping_threshold: Number(e.target.value),
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-sm font-medium text-[#0B1F3A]">
                    <input
                      type="checkbox"
                      checked={settings.cod_enabled}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, cod_enabled: e.target.checked }))
                      }
                      className="h-4 w-4 accent-[#F97316]"
                    />
                    Enable Cash on Delivery (COD) at Checkout
                  </label>

                  {settingsSaved && (
                    <p className="text-xs font-medium text-emerald-700">Store settings updated.</p>
                  )}

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-lg bg-[#F97316] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#EA580C]"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </form>
              </section>

              {/* Coupons */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                <h2 className="font-display text-lg font-bold text-[#0B1F3A]">Promotional Coupons</h2>

                <form onSubmit={handleCreateCoupon} className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="CODE (e.g. ECE15)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="h-9 rounded-lg border border-slate-300 px-3 font-mono text-xs uppercase"
                  />
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as 'percent' | 'flat')}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Value"
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Min Order ₹"
                    value={couponMinOrder}
                    onChange={(e) => setCouponMinOrder(e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Max Discount Cap ₹"
                    value={couponMaxDisc}
                    onChange={(e) => setCouponMaxDisc(e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                  />
                  <button
                    type="submit"
                    className="h-9 rounded-lg bg-[#0B1F3A] text-xs font-semibold text-white"
                  >
                    Create Coupon
                  </button>
                </form>

                <ul className="divide-y divide-slate-100 text-xs">
                  {coupons.map((cp) => (
                    <li key={cp.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <span className="font-mono font-bold text-[#0B1F3A]">{cp.code}</span>
                        <span className="ml-2 text-slate-600">
                          {cp.discount_type === 'percent'
                            ? `${cp.discount_value}% off`
                            : `${formatINR(cp.discount_value)} off`}
                          {` · Min ${formatINR(cp.min_order_amount)} · Used ${cp.used_count}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminDeleteCoupon(cp.id);
                          await loadAll();
                        }}
                        aria-label={`Delete coupon ${cp.code}`}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      )}

      {editorOpen && (
        <AdminProductEditor
          product={editingProduct}
          categories={categories}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            await loadAll();
            onCatalogMutated();
          }}
        />
      )}
    </div>
  );
}
