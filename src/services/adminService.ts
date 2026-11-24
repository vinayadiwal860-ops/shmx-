import { isSupabaseConfigured, PRODUCT_IMAGES_BUCKET, supabase } from '../lib/supabase';
import { validateProductImageFile } from '../lib/validators';
import type { Category, Coupon, Order, OrderStatus, Product, StoreSettings } from '../types/database';

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

export interface AdminDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: Product[];
  bestSellingProducts: Product[];
  monthlySales: { month: string; revenue: number; orders: number }[];
}

export async function adminFetchDashboardStats(): Promise<AdminDashboardStats> {
  const client = requireClient();

  const [ordersRes, customersRes, productsRes] = await Promise.all([
    client.from('orders').select('id, total_amount, order_status, payment_status, created_at'),
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    client.from('products').select('*, categories(name, slug)').order('sales_count', { ascending: false }),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);

  const orders = ordersRes.data ?? [];
  const products = ((productsRes.data ?? []) as Product[]).map((p) => ({
    ...p,
    price: Number(p.price),
    discount_percent: Number(p.discount_percent),
    images: Array.isArray(p.images) ? p.images : [],
  }));

  const validOrders = orders.filter((o) => o.order_status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const monthMap = new Map<string, { revenue: number; orders: number; sortKey: string }>();
  for (const ord of validOrders) {
    const dt = new Date(ord.created_at);
    const sortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const label = dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const curr = monthMap.get(sortKey) ?? { revenue: 0, orders: 0, sortKey };
    curr.revenue += Number(ord.total_amount || 0);
    curr.orders += 1;
    monthMap.set(sortKey, curr);
    // attach label lookup
    (curr as { label?: string }).label = label;
  }

  const monthlySales = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, val]) => ({
      month: (val as { label?: string }).label || val.sortKey,
      revenue: Math.round(val.revenue),
      orders: val.orders,
    }));

  const lowStockProducts = products.filter((p) => p.stock_quantity <= p.low_stock_threshold);

  return {
    totalRevenue,
    totalOrders: orders.length,
    totalCustomers: customersRes.count ?? 0,
    totalProducts: products.length,
    lowStockProducts,
    bestSellingProducts: products.slice(0, 6),
    monthlySales,
  };
}

export async function adminFetchAllProducts(): Promise<Product[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('products')
    .select('*, categories(name, slug)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Product & { categories?: { name: string; slug: string } | null }>).map((p) => ({
    ...p,
    category_name: p.categories?.name,
    category_slug: p.categories?.slug,
    price: Number(p.price),
    discount_percent: Number(p.discount_percent),
    rating_avg: Number(p.rating_avg),
    images: Array.isArray(p.images) ? p.images : [],
    specs: p.specs && typeof p.specs === 'object' ? p.specs : {},
  }));
}

export async function adminSaveProduct(
  productId: string | null,
  payload: Partial<Product>
): Promise<Product> {
  const client = requireClient();
  const record = {
    name: payload.name,
    slug: payload.slug,
    model_number: payload.model_number,
    brand: payload.brand,
    category_id: payload.category_id,
    product_type: payload.product_type,
    short_spec: payload.short_spec,
    description: payload.description,
    specs: payload.specs ?? {},
    pin_configuration: payload.pin_configuration ?? '',
    pin_diagram_url: payload.pin_diagram_url || null,
    operating_voltage: payload.operating_voltage ?? '',
    applications: payload.applications ?? '',
    datasheet_url: payload.datasheet_url || null,
    price: Number(payload.price),
    discount_percent: Number(payload.discount_percent ?? 0),
    stock_quantity: Math.max(0, Math.floor(Number(payload.stock_quantity ?? 0))),
    low_stock_threshold: Math.max(0, Math.floor(Number(payload.low_stock_threshold ?? 10))),
    images: payload.images ?? [],
    is_active: payload.is_active ?? true,
    is_featured_kit: payload.is_featured_kit ?? false,
  };

  if (productId) {
    const { data, error } = await client
      .from('products')
      .update(record)
      .eq('id', productId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to update product.');
    return data as Product;
  } else {
    const { data, error } = await client
      .from('products')
      .insert(record)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to create product.');
    return data as Product;
  }
}

export async function adminDeleteProduct(productId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('products').delete().eq('id', productId);
  if (error) throw new Error(error.message);
}

export async function adminUploadProductImage(file: File, folder = 'products'): Promise<string> {
  const client = requireClient();
  const check = validateProductImageFile(file);
  if (!check.valid) throw new Error(check.error);

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await client.storage.from(PRODUCT_IMAGES_BUCKET).upload(safeName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(safeName);
  return data.publicUrl;
}

export async function adminDeleteStorageImage(publicUrl: string): Promise<void> {
  const client = requireClient();
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  await client.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
}

export async function adminFetchOrders(): Promise<Order[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
  refundNotes?: string,
  cancellationReason?: string
): Promise<Order> {
  const client = requireClient();
  const { data, error } = await client.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_order_status: status,
    p_refund_notes: refundNotes || null,
    p_cancellation_reason: cancellationReason || null,
  });
  if (error || !data) throw new Error(error?.message || 'Failed to update order status.');
  return data as Order;
}

export async function adminFetchCoupons(): Promise<Coupon[]> {
  const client = requireClient();
  const { data, error } = await client.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Coupon[];
}

export async function adminSaveCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
  const client = requireClient();
  const payload = {
    code: coupon.code?.trim().toUpperCase(),
    discount_type: coupon.discount_type || 'percent',
    discount_value: Number(coupon.discount_value || 0),
    min_order_amount: Number(coupon.min_order_amount || 0),
    max_discount_amount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null,
    expires_at: coupon.expires_at || null,
    usage_limit: coupon.usage_limit ? Number(coupon.usage_limit) : null,
    is_active: coupon.is_active ?? true,
  };

  if (coupon.id) {
    const { data, error } = await client.from('coupons').update(payload).eq('id', coupon.id).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Failed to update coupon.');
    return data as Coupon;
  }
  const { data, error } = await client.from('coupons').insert(payload).select('*').single();
  if (error || !data) throw new Error(error?.message || 'Failed to create coupon.');
  return data as Coupon;
}

export async function adminDeleteCoupon(couponId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('coupons').delete().eq('id', couponId);
  if (error) throw new Error(error.message);
}

export async function adminUpdateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const client = requireClient();
  const { data, error } = await client
    .from('store_settings')
    .update({
      hero_image_url: settings.hero_image_url,
      shipping_flat_rate: Number(settings.shipping_flat_rate ?? 60),
      free_shipping_threshold: Number(settings.free_shipping_threshold ?? 999),
      cod_enabled: Boolean(settings.cod_enabled),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to save store settings.');
  return data as StoreSettings;
}

export async function adminFetchCategories(): Promise<Category[]> {
  const client = requireClient();
  const { data, error } = await client.from('categories').select('*').order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}
