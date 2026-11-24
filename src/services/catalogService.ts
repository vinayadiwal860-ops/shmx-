import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Category, Product, ProductFilterState, Review, StoreSettings } from '../types/database';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 1,
  hero_image_url: null,
  shipping_flat_rate: 60,
  free_shipping_threshold: 999,
  cod_enabled: true,
};

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  if (!isSupabaseConfigured || !supabase) return DEFAULT_STORE_SETTINGS;
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_STORE_SETTINGS;
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...data,
    shipping_flat_rate: Number(data.shipping_flat_rate ?? 60),
    free_shipping_threshold: Number(data.free_shipping_threshold ?? 999),
  };
}

export async function searchCatalogProducts(
  filters: Partial<ProductFilterState>,
  limit = 48,
  offset = 0
): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const minP = filters.minPrice && filters.minPrice.trim() !== '' ? Number(filters.minPrice) : null;
  const maxP = filters.maxPrice && filters.maxPrice.trim() !== '' ? Number(filters.maxPrice) : null;

  const { data, error } = await supabase.rpc('search_products', {
    p_query: filters.query?.trim() ?? '',
    p_category_slug: filters.categorySlug || null,
    p_min_price: minP !== null && !Number.isNaN(minP) ? minP : null,
    p_max_price: maxP !== null && !Number.isNaN(maxP) ? maxP : null,
    p_brand: filters.brand || null,
    p_product_type: filters.productType || null,
    p_in_stock_only: Boolean(filters.inStockOnly),
    p_sort: filters.sort || 'best_selling',
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Product[]).map((p) => ({
    ...p,
    price: Number(p.price),
    discount_percent: Number(p.discount_percent),
    rating_avg: Number(p.rating_avg),
    images: Array.isArray(p.images) ? p.images : [],
    specs: p.specs && typeof p.specs === 'object' ? p.specs : {},
  }));
}

export async function fetchSearchSuggestions(query: string): Promise<Pick<Product, 'id' | 'name' | 'slug' | 'model_number' | 'price' | 'discount_percent'>[]> {
  if (!isSupabaseConfigured || !supabase || query.trim().length < 2) return [];
  const data = await searchCatalogProducts({ query: query.trim(), sort: 'best_selling' }, 6, 0);
  return data.map(({ id, name, slug, model_number, price, discount_percent }) => ({
    id,
    name,
    slug,
    model_number,
    price,
    discount_percent,
  }));
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('products')
    .select('*, categories(name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const cat = (data as unknown as { categories?: { name: string; slug: string } | null }).categories;
  return {
    ...(data as Product),
    category_name: cat?.name,
    category_slug: cat?.slug,
    price: Number(data.price),
    discount_percent: Number(data.discount_percent),
    rating_avg: Number(data.rating_avg),
    images: Array.isArray(data.images) ? data.images : [],
    specs: data.specs && typeof data.specs === 'object' ? data.specs : {},
  };
}

export async function fetchRelatedProducts(categoryId: string, excludeProductId: string): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .neq('id', excludeProductId)
    .order('sales_count', { ascending: false })
    .limit(4);

  if (error) return [];
  return ((data ?? []) as Product[]).map((p) => ({
    ...p,
    price: Number(p.price),
    discount_percent: Number(p.discount_percent),
    rating_avg: Number(p.rating_avg),
    images: Array.isArray(p.images) ? p.images : [],
  }));
}

export async function fetchProductReviews(productId: string): Promise<Review[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Review[];
}

export async function checkUserCanReview(productId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_items!inner(product_id)')
    .eq('user_id', userId)
    .neq('order_status', 'cancelled')
    .eq('order_items.product_id', productId)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export async function submitProductReview(
  productId: string,
  userId: string,
  rating: number,
  title: string,
  comment: string
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('reviews').upsert(
    {
      product_id: productId,
      user_id: userId,
      rating,
      title: title.trim(),
      comment: comment.trim(),
    },
    { onConflict: 'product_id,user_id' }
  );
  if (error) throw new Error(error.message);
}

export function subscribeCatalogRealtime(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const channel = supabase
    .channel('shmx-catalog-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, onChange)
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}
