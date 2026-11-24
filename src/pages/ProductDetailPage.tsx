import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  FileText,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { computeEffectivePrice, formatINR, getStockLabel, getStockStatus } from '../lib/pricing';
import { isSupabaseConfigured } from '../lib/supabase';
import { sanitizeExternalUrl } from '../lib/validators';
import {
  checkUserCanReview,
  fetchProductBySlug,
  fetchProductReviews,
  fetchRelatedProducts,
  submitProductReview,
} from '../services/catalogService';
import type { Product, Review } from '../types/database';
import { NotConfiguredNotice } from '../components/NotConfiguredNotice';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';

interface ProductDetailPageProps {
  slug: string;
  wishlistIds: Set<string>;
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product, quantity: number) => Promise<void>;
  onBuyNow: (product: Product, quantity: number) => Promise<void>;
  onToggleWishlist: (productId: string) => Promise<void>;
}

export function ProductDetailPage({
  slug,
  wishlistIds,
  onNavigate,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: ProductDetailPageProps) {
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);

  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null);
  const [qty, setQty] = useState(1);
  const [actionBusy, setActionBusy] = useState(false);

  // Review form
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revError, setRevError] = useState<string | null>(null);
  const [revSuccess, setRevSuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setSelectedImageIdx(0);
    setQty(1);

    fetchProductBySlug(slug)
      .then(async (prod) => {
        if (!active) return;
        setProduct(prod);
        if (prod) {
          const [rel, revs] = await Promise.all([
            fetchRelatedProducts(prod.category_id, prod.id),
            fetchProductReviews(prod.id),
          ]);
          if (active) {
            setRelated(rel);
            setReviews(revs);
          }
          if (user) {
            const eligible = await checkUserCanReview(prod.id, user.id);
            if (active) setCanReview(eligible);
          } else {
            setCanReview(false);
          }
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load product.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, user]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <NotConfiguredNotice service="Supabase" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 animate-pulse">
          <div className="aspect-square rounded-2xl bg-slate-100" />
          <div className="space-y-4">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-8 w-3/4 rounded bg-slate-200" />
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="h-24 w-full rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">
          {error ? 'Error Loading Component' : 'Component Not Found'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {error || 'The component you requested may be inactive or removed from inventory.'}
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/catalog')}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Catalog
        </button>
      </div>
    );
  }

  const images = product.images ?? [];
  const currentImg = images[selectedImageIdx] ?? null;
  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const isOutOfStock = stockStatus === 'out_of_stock';
  const effectivePrice = computeEffectivePrice(product.price, product.discount_percent);
  const safeDatasheetUrl = sanitizeExternalUrl(product.datasheet_url);
  const safePinDiagramUrl = sanitizeExternalUrl(product.pin_diagram_url);
  const specEntries = Object.entries(product.specs ?? {});
  const isWishlisted = wishlistIds.has(product.id);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setRevError(null);
    setRevSuccess(false);
    setRevSubmitting(true);
    try {
      await submitProductReview(product.id, user.id, revRating, revTitle, revComment);
      setRevSuccess(true);
      setRevTitle('');
      setRevComment('');
      const updated = await fetchProductReviews(product.id);
      setReviews(updated);
    } catch (err) {
      setRevError(err instanceof Error ? err.message : 'Unable to submit review.');
    } finally {
      setRevSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <button type="button" onClick={() => onNavigate('/')} className="hover:text-[#0B1F3A]">
          Home
        </button>
        <span aria-hidden="true">/</span>
        <button type="button" onClick={() => onNavigate('/catalog')} className="hover:text-[#0B1F3A]">
          Catalog
        </button>
        {product.category_name && (
          <>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => onNavigate(`/catalog?category=${product.category_slug}`)}
              className="hover:text-[#0B1F3A]"
            >
              {product.category_name}
            </button>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="font-mono font-medium text-[#0B1F3A]">{product.model_number}</span>
      </nav>

      {/* Main Split: Gallery Left + Purchase Module Right */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
        {/* Image Gallery with Zoom on Hover */}
        <div className="lg:sticky lg:top-28 space-y-3">
          <div
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            onMouseMove={(e) => {
              if (!currentImg) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setZoomOrigin({ x, y });
            }}
            onMouseLeave={() => setZoomOrigin(null)}
          >
            {currentImg ? (
              <div className="aspect-square w-full overflow-hidden bg-slate-50 flex items-center justify-center">
                <img
                  src={currentImg}
                  alt={`${product.name} view ${selectedImageIdx + 1}`}
                  referrerPolicy="no-referrer"
                  style={
                    zoomOrigin
                      ? {
                          transform: 'scale(1.65)',
                          transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                        }
                      : undefined
                  }
                  className="h-full w-full object-contain p-6 transition-transform duration-150 ease-out"
                />
              </div>
            ) : (
              <ProductImage src={null} alt={product.name} eager />
            )}
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {images.map((imgUrl, idx) => (
                <button
                  key={imgUrl + idx}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  aria-label={`View image ${idx + 1} of ${product.name}`}
                  className={`h-18 w-18 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    selectedImageIdx === idx
                      ? 'border-[#F97316]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ProductImage src={imgUrl} alt={`${product.name} thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Module */}
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-[#0B1F3A]">{product.model_number}</span>
              <span aria-hidden="true">·</span>
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{product.product_type}</span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-bold text-[#0B1F3A] sm:text-3xl">
              {product.name}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600">{product.short_spec}</p>

            {/* Rating & Stock */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 tabular-nums">
                <Star
                  className={`h-4 w-4 ${product.rating_count > 0 ? 'fill-[#F97316] text-[#F97316]' : 'text-slate-300'}`}
                  aria-hidden="true"
                />
                <span className="font-semibold text-[#0B1F3A]">
                  {product.rating_count > 0 ? product.rating_avg.toFixed(1) : 'No ratings yet'}
                </span>
                {product.rating_count > 0 && (
                  <span className="text-slate-500">({product.rating_count} reviews)</span>
                )}
              </div>

              <span aria-hidden="true" className="text-slate-300">|</span>

              <span
                className={`font-semibold ${
                  stockStatus === 'out_of_stock'
                    ? 'text-red-600'
                    : stockStatus === 'low_stock'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {getStockLabel(stockStatus)}
                {product.stock_quantity > 0 && ` (${product.stock_quantity} available)`}
              </span>
            </div>
          </div>

          {/* Price Block */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="font-display text-3xl font-extrabold text-[#0B1F3A]">
                {formatINR(effectivePrice)}
              </span>
              {product.discount_percent > 0 && (
                <>
                  <span className="text-base text-slate-400 line-through">
                    {formatINR(product.price)}
                  </span>
                  <span className="text-sm font-bold text-[#F97316]">
                    {product.discount_percent}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Inclusive of applicable taxes.</p>

            {/* Qty + Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white">
                <button
                  type="button"
                  disabled={isOutOfStock || qty <= 1}
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-full w-10 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-10 text-center font-mono text-sm font-semibold tabular-nums">
                  {isOutOfStock ? 0 : qty}
                </span>
                <button
                  type="button"
                  disabled={isOutOfStock || qty >= product.stock_quantity}
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(product.stock_quantity, q + 1))}
                  className="flex h-full w-10 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                disabled={isOutOfStock || actionBusy}
                onClick={async () => {
                  setActionBusy(true);
                  try {
                    await onAddToCart(product, qty);
                  } finally {
                    setActionBusy(false);
                  }
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#0B1F3A] bg-white px-5 text-sm font-semibold text-[#0B1F3A] transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 whitespace-nowrap"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <button
                type="button"
                disabled={isOutOfStock || actionBusy}
                onClick={async () => {
                  setActionBusy(true);
                  try {
                    await onBuyNow(product, qty);
                  } finally {
                    setActionBusy(false);
                  }
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 whitespace-nowrap"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                Buy Now
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-[#F97316] hover:text-[#F97316]"
              >
                <Heart
                  className={`h-4.5 w-4.5 ${isWishlisted ? 'fill-[#F97316] text-[#F97316]' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Key Engineering Metadata */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {product.operating_voltage && (
              <div className="rounded-xl border border-slate-200 p-3.5">
                <div className="text-xs font-medium text-slate-500">Operating Voltage</div>
                <div className="mt-1 font-mono text-sm font-semibold text-[#0B1F3A]">
                  {product.operating_voltage}
                </div>
              </div>
            )}
            {safeDatasheetUrl && (
              <a
                href={safeDatasheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-[#0B1F3A] hover:bg-slate-50"
              >
                <div>
                  <div className="text-xs font-medium text-slate-500">Technical Documentation</div>
                  <div className="mt-1 text-sm font-semibold text-[#F97316]">
                    Download Datasheet (PDF)
                  </div>
                </div>
                <FileText className="h-5 w-5 text-[#0B1F3A]" aria-hidden="true" />
              </a>
            )}
          </div>

          {/* Description & Applications */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">Overview</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{product.description}</p>
            </div>
            {product.applications && (
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                  ECE Applications
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {product.applications}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Specs & Pin Configuration */}
      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
            Technical Specifications
          </h2>
          {specEntries.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No tabular specifications recorded.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {specEntries.map(([key, val]) => (
                  <tr key={key}>
                    <th className="py-2.5 pr-4 text-left font-medium text-slate-500 w-2/5">
                      {key}
                    </th>
                    <td className="py-2.5 font-mono text-xs font-medium text-[#0B1F3A] tabular-nums">
                      {String(val)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#0B1F3A] flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-[#F97316]" aria-hidden="true" />
            Pin Configuration
          </h2>
          {product.pin_configuration ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-4 font-mono text-xs leading-relaxed text-[#0B1F3A]">
              {product.pin_configuration}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Pin configuration details not listed.</p>
          )}
          {safePinDiagramUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={safePinDiagramUrl}
                alt={`${product.name} pinout diagram`}
                referrerPolicy="no-referrer"
                className="max-h-64 w-full object-contain p-3"
              />
            </div>
          )}
        </section>
      </div>

      {/* Customer Reviews */}
      <section className="mt-14 border-t border-slate-200 pt-10" aria-labelledby="reviews-heading">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <h2 id="reviews-heading" className="font-display text-xl font-bold text-[#0B1F3A]">
              Engineer & Student Reviews ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                No reviews yet for this component. Verified buyers can leave technical feedback after placing an order.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <article key={rev.id} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-semibold text-[#0B1F3A]">
                          {rev.profiles?.full_name || 'Verified Engineer'}
                        </span>
                        {rev.is_verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {new Date(rev.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < rev.rating ? 'fill-[#F97316] text-[#F97316]' : 'text-slate-200'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                      {rev.title && (
                        <span className="ml-2 text-sm font-semibold text-[#0B1F3A]">{rev.title}</span>
                      )}
                    </div>
                    {rev.comment && (
                      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{rev.comment}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-96 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="font-display text-base font-bold text-[#0B1F3A]">Write a Review</h3>
            {!user ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Sign in with an account that has ordered this component to submit a verified review.
              </p>
            ) : !canReview ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Reviews are restricted to verified buyers who have a non-cancelled order containing this component.
              </p>
            ) : (
              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3">
                <div>
                  <label htmlFor="rev-rating" className="block text-xs font-medium text-slate-700">
                    Rating
                  </label>
                  <select
                    id="rev-rating"
                    value={revRating}
                    onChange={(e) => setRevRating(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Fair</option>
                    <option value={1}>1 - Poor</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rev-title" className="block text-xs font-medium text-slate-700">
                    Headline
                  </label>
                  <input
                    id="rev-title"
                    type="text"
                    required
                    value={revTitle}
                    onChange={(e) => setRevTitle(e.target.value)}
                    placeholder="Tested on breadboard..."
                    className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="rev-comment" className="block text-xs font-medium text-slate-700">
                    Technical Feedback
                  </label>
                  <textarea
                    id="rev-comment"
                    rows={3}
                    required
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    placeholder="Share build quality, pin alignment, or datasheet accuracy..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  />
                </div>
                {revError && <p className="text-xs text-red-600">{revError}</p>}
                {revSuccess && (
                  <p className="text-xs font-medium text-emerald-700">Review saved. Thank you!</p>
                )}
                <button
                  type="submit"
                  disabled={revSubmitting}
                  className="w-full rounded-lg bg-[#0B1F3A] py-2.5 text-xs font-semibold text-white hover:bg-[#16335B]"
                >
                  {revSubmitting ? 'Submitting...' : 'Submit Verified Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Related Components */}
      {related.length > 0 && (
        <section className="mt-14 border-t border-slate-200 pt-10">
          <h2 className="font-display text-xl font-bold text-[#0B1F3A]">Related Components</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isWishlisted={wishlistIds.has(p.id)}
                onNavigateProduct={(s) => onNavigate(`/product/${s}`)}
                onAddToCart={(prod) => onAddToCart(prod, 1)}
                onBuyNow={(prod) => onBuyNow(prod, 1)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
