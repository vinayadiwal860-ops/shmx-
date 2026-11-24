import { useEffect, useMemo, useState } from 'react';
import { Filter, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { searchCatalogProducts } from '../services/catalogService';
import type { Category, Product, ProductFilterState, SortOption } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from '../components/ProductSkeleton';

interface CatalogPageProps {
  categories: Category[];
  initialFilters: ProductFilterState;
  wishlistIds: Set<string>;
  refreshToken: number;
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product) => Promise<void>;
  onBuyNow: (product: Product) => Promise<void>;
  onToggleWishlist: (productId: string) => Promise<void>;
}

export function CatalogPage({
  categories,
  initialFilters,
  wishlistIds,
  refreshToken,
  onNavigate,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: CatalogPageProps) {
  const [filters, setFilters] = useState<ProductFilterState>(initialFilters);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setProducts([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    searchCatalogProducts(filters, 60, 0)
      .then((res) => {
        if (active) setProducts(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load components.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, refreshToken]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.brand) set.add(p.brand);
    }
    if (filters.brand) set.add(filters.brand);
    return Array.from(set).sort();
  }, [products, filters.brand]);

  const productTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.product_type) set.add(p.product_type);
    }
    if (filters.productType) set.add(filters.productType);
    return Array.from(set).sort();
  }, [products, filters.productType]);

  const resetFilters = () => {
    setFilters({
      query: '',
      categorySlug: '',
      minPrice: '',
      maxPrice: '',
      brand: '',
      productType: '',
      inStockOnly: false,
      sort: 'best_selling',
    });
    onNavigate('/catalog');
  };

  const activeCategoryName = useMemo(() => {
    if (!filters.categorySlug) return 'All ECE Components';
    return categories.find((c) => c.slug === filters.categorySlug)?.name || 'Components';
  }, [categories, filters.categorySlug]);

  const filterForm = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-[#0B1F3A] flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
          Filters
        </h2>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#F97316]"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="filter-category" className="block text-xs font-semibold text-slate-700">
          Category
        </label>
        <select
          id="filter-category"
          value={filters.categorySlug}
          onChange={(e) => setFilters((f) => ({ ...f, categorySlug: e.target.value }))}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#0B1F3A] focus:border-[#0B1F3A] focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <span className="block text-xs font-semibold text-slate-700">Price Range (₹)</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filter-min-price" className="sr-only">
              Minimum price
            </label>
            <input
              id="filter-min-price"
              type="number"
              min={0}
              placeholder="Min ₹"
              value={filters.minPrice}
              onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums focus:border-[#0B1F3A] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="filter-max-price" className="sr-only">
              Maximum price
            </label>
            <input
              id="filter-max-price"
              type="number"
              min={0}
              placeholder="Max ₹"
              value={filters.maxPrice}
              onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums focus:border-[#0B1F3A] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Brand */}
      <div>
        <label htmlFor="filter-brand" className="block text-xs font-semibold text-slate-700">
          Manufacturer / Brand
        </label>
        <select
          id="filter-brand"
          value={filters.brand}
          onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#0B1F3A] focus:border-[#0B1F3A] focus:outline-none"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Product Type */}
      <div>
        <label htmlFor="filter-type" className="block text-xs font-semibold text-slate-700">
          Component Type
        </label>
        <select
          id="filter-type"
          value={filters.productType}
          onChange={(e) => setFilters((f) => ({ ...f, productType: e.target.value }))}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#0B1F3A] focus:border-[#0B1F3A] focus:outline-none"
        >
          <option value="">All Types</option>
          {productTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Stock availability */}
      <label className="flex items-center gap-2.5 text-sm font-medium text-[#0B1F3A] cursor-pointer">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => setFilters((f) => ({ ...f, inStockOnly: e.target.checked }))}
          className="h-4 w-4 rounded border-slate-300 accent-[#F97316]"
        />
        <span>In Stock Only</span>
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header Row */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1F3A] sm:text-3xl">
            {activeCategoryName}
          </h1>
          <p className="mt-1 text-sm text-slate-600 tabular-nums">
            {filters.query ? (
              <>
                Results for <span className="font-semibold text-[#0B1F3A]">"{filters.query}"</span>
                {' · '}
              </>
            ) : null}
            {loading ? 'Loading components...' : `${products.length} component${products.length === 1 ? '' : 's'} found`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3.5 text-xs font-semibold text-[#0B1F3A] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="catalog-sort" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Sort by
            </label>
            <select
              id="catalog-sort"
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortOption }))}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-[#0B1F3A] focus:border-[#0B1F3A] focus:outline-none"
            >
              <option value="best_selling">Best Selling</option>
              <option value="newest">New Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="highest_rated">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mt-8">
          <NotConfiguredNotice service="Supabase" />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-xl border border-slate-200 bg-white p-5">
              {filterForm}
            </div>
          </aside>

          {/* Product Grid */}
          <div>
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {error}
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                <h2 className="font-display text-lg font-semibold text-[#0B1F3A]">
                  No matching ECE components found
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Try searching by IC number (e.g. 7400, NE555), board name (ESP32, Arduino), or reset filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#16335B]"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isWishlisted={wishlistIds.has(p.id)}
                    onNavigateProduct={(slug) => onNavigate(`/product/${slug}`)}
                    onAddToCart={onAddToCart}
                    onBuyNow={onBuyNow}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#0B1F3A]/40"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="font-display text-base font-bold text-[#0B1F3A]">Filter Catalog</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {filterForm}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full rounded-lg bg-[#0B1F3A] py-2.5 text-xs font-semibold text-white"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
