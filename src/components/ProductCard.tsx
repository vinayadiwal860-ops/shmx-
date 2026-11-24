import { useState } from 'react';
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react';
import { computeEffectivePrice, formatINR, getStockLabel, getStockStatus } from '../lib/pricing';
import type { Product } from '../types/database';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onNavigateProduct: (slug: string) => void;
  onAddToCart: (product: Product) => Promise<void>;
  onBuyNow: (product: Product) => Promise<void>;
  onToggleWishlist: (productId: string) => Promise<void>;
}

export function ProductCard({
  product,
  isWishlisted,
  onNavigateProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: ProductCardProps) {
  const [busy, setBusy] = useState<'cart' | 'buy' | null>(null);
  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const stockLabel = getStockLabel(stockStatus);
  const isOutOfStock = stockStatus === 'out_of_stock';
  const effectivePrice = computeEffectivePrice(product.price, product.discount_percent);
  const hasDiscount = product.discount_percent > 0;

  const handleAdd = async () => {
    if (isOutOfStock || busy) return;
    setBusy('cart');
    try {
      await onAddToCart(product);
    } finally {
      setBusy(null);
    }
  };

  const handleBuy = async () => {
    if (isOutOfStock || busy) return;
    setBusy('buy');
    try {
      await onBuyNow(product);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="group flex flex-col rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative overflow-hidden rounded-t-xl border-b border-slate-100">
        <a
          href={`/product/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            onNavigateProduct(product.slug);
          }}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
        >
          <ProductImage
            src={product.images?.[0]}
            alt={`${product.name} (${product.model_number})`}
            imgClassName="group-hover:scale-[1.03]"
          />
        </a>
        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-600 transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
        >
          <Heart
            className={`h-4 w-4 ${isWishlisted ? 'fill-[#F97316] text-[#F97316]' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Clean unboxed metadata (no pills) */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono truncate">
          <span className="font-medium text-[#0B1F3A]">{product.model_number}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate font-sans">{product.brand}</span>
        </div>

        <h3 className="mt-1.5 font-display text-[15px] font-semibold leading-snug text-[#0B1F3A] line-clamp-2 min-h-[2.5rem]">
          <a
            href={`/product/${product.slug}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigateProduct(product.slug);
            }}
            className="hover:text-[#F97316] transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {product.name}
          </a>
        </h3>

        <p className="mt-1 text-xs text-slate-600 line-clamp-1">{product.short_spec}</p>

        {/* Rating & Stock Status */}
        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-700 tabular-nums">
            <Star
              className={`h-3.5 w-3.5 ${product.rating_count > 0 ? 'fill-[#F97316] text-[#F97316]' : 'text-slate-300'}`}
              aria-hidden="true"
            />
            <span className="font-medium">
              {product.rating_count > 0 ? product.rating_avg.toFixed(1) : 'New'}
            </span>
            {product.rating_count > 0 && (
              <span className="text-slate-400">({product.rating_count})</span>
            )}
          </div>

          <span
            className={`font-medium ${
              stockStatus === 'out_of_stock'
                ? 'text-red-600'
                : stockStatus === 'low_stock'
                  ? 'text-amber-700'
                  : 'text-emerald-700'
            }`}
          >
            {stockLabel}
          </span>
        </div>

        {/* Pricing */}
        <div className="mt-3 flex items-baseline gap-2 tabular-nums">
          <span className="font-display text-lg font-bold text-[#0B1F3A]">
            {formatINR(effectivePrice)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-slate-400 line-through">
                {formatINR(product.price)}
              </span>
              <span className="text-xs font-semibold text-[#F97316]">
                {product.discount_percent}% off
              </span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isOutOfStock || busy !== null}
            onClick={handleAdd}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#0B1F3A] bg-white px-3 text-xs font-semibold text-[#0B1F3A] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{isOutOfStock ? 'Unavailable' : busy === 'cart' ? 'Adding...' : 'Add to Cart'}</span>
          </button>
          <button
            type="button"
            disabled={isOutOfStock || busy !== null}
            onClick={handleBuy}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#F97316] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]"
          >
            <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{busy === 'buy' ? 'Opening...' : 'Buy Now'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
