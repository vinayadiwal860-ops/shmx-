import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Star, Trash2, Upload, X } from 'lucide-react';
import { slugify } from '../../lib/validators';
import {
  adminDeleteStorageImage,
  adminSaveProduct,
  adminUploadProductImage,
} from '../../services/adminService';
import type { Category, Product } from '../../types/database';
import { ProductImage } from '../ProductImage';

interface AdminProductEditorProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function AdminProductEditor({
  product,
  categories,
  onClose,
  onSaved,
}: AdminProductEditorProps) {
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [modelNumber, setModelNumber] = useState(product?.model_number ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [productType, setProductType] = useState(product?.product_type ?? 'Component');
  const [shortSpec, setShortSpec] = useState(product?.short_spec ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [operatingVoltage, setOperatingVoltage] = useState(product?.operating_voltage ?? '');
  const [pinConfiguration, setPinConfiguration] = useState(product?.pin_configuration ?? '');
  const [pinDiagramUrl, setPinDiagramUrl] = useState(product?.pin_diagram_url ?? '');
  const [applications, setApplications] = useState(product?.applications ?? '');
  const [datasheetUrl, setDatasheetUrl] = useState(product?.datasheet_url ?? '');
  const [price, setPrice] = useState(String(product?.price ?? 0));
  const [discountPercent, setDiscountPercent] = useState(String(product?.discount_percent ?? 0));
  const [stockQuantity, setStockQuantity] = useState(String(product?.stock_quantity ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(product?.low_stock_threshold ?? 10)
  );
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeaturedKit, setIsFeaturedKit] = useState(product?.is_featured_kit ?? false);
  const [images, setImages] = useState<string[]>(product?.images ?? []);

  const [specRows, setSpecRows] = useState<{ key: string; value: string }[]>(() => {
    const entries = Object.entries(product?.specs ?? {});
    return entries.length > 0
      ? entries.map(([key, value]) => ({ key, value: String(value) }))
      : [{ key: '', value: '' }];
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await adminUploadProductImage(file, 'products');
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePinDiagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await adminUploadProductImage(file, 'pin-diagrams');
      setPinDiagramUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pin diagram upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const moveImage = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    setImages(copy);
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0 || index >= images.length) return;
    const copy = [...images];
    const [picked] = copy.splice(index, 1);
    copy.unshift(picked);
    setImages(copy);
  };

  const removeImage = async (index: number) => {
    const url = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));
    try {
      await adminDeleteStorageImage(url);
    } catch {
      // ignore storage cleanup errors if external URL
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const specsObj: Record<string, string> = {};
      for (const row of specRows) {
        if (row.key.trim() && row.value.trim()) {
          specsObj[row.key.trim()] = row.value.trim();
        }
      }

      const finalSlug = slug.trim() || slugify(`${name}-${modelNumber}`);
      await adminSaveProduct(product?.id ?? null, {
        name: name.trim(),
        slug: finalSlug,
        model_number: modelNumber.trim(),
        brand: brand.trim() || 'Generic',
        category_id: categoryId,
        product_type: productType.trim() || 'Component',
        short_spec: shortSpec.trim(),
        description: description.trim(),
        specs: specsObj,
        pin_configuration: pinConfiguration.trim(),
        pin_diagram_url: pinDiagramUrl.trim() || null,
        operating_voltage: operatingVoltage.trim(),
        applications: applications.trim(),
        datasheet_url: datasheetUrl.trim() || null,
        price: Number(price),
        discount_percent: Number(discountPercent),
        stock_quantity: Number(stockQuantity),
        low_stock_threshold: Number(lowStockThreshold),
        images,
        is_active: isActive,
        is_featured_kit: isFeaturedKit,
      });

      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save component.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0B1F3A]/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product ? 'Edit Component' : 'Add New Component'}
        className="my-6 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
            {product ? `Edit: ${product.name}` : 'Add ECE Component'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product editor"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Component Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!product) setSlug(slugify(e.target.value));
                }}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">URL Slug *</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Model Number *</label>
              <input
                type="text"
                required
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="ESP32-WROOM-32"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Brand / Manufacturer</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Texas Instruments / Espressif"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Component Type</label>
              <input
                type="text"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="Logic IC / Sensor Module / Learning Kit"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Price (₹) *</label>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Discount %</label>
              <input
                type="number"
                min={0}
                max={95}
                step="0.5"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Stock Quantity *</label>
              <input
                type="number"
                required
                min={0}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Low Stock Alert</label>
              <input
                type="number"
                min={0}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Product Images Manager */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">Product Images (Supabase Storage)</h3>
                <p className="text-xs text-slate-500">
                  JPEG/PNG/WebP up to 5 MB each. First image is the primary storefront thumbnail.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#16335B]">
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{uploading ? 'Uploading...' : 'Upload Images'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={handleImageUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {images.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No images uploaded yet — storefront will display "Image unavailable" placeholder.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((url, idx) => (
                  <div key={url + idx} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
                    <div className="overflow-hidden rounded">
                      <ProductImage src={url} alt={`Product image ${idx + 1}`} />
                    </div>
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-mono text-[11px] text-slate-500">
                        {idx === 0 ? 'Primary' : `#${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(idx)}
                            title="Set as primary image"
                            aria-label="Set as primary image"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#F97316]"
                          >
                            <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveImage(idx, -1)}
                          aria-label="Move image left"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={() => moveImage(idx, 1)}
                          aria-label="Move image right"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          aria-label="Delete image"
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Engineering Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Short Spec Line *</label>
              <input
                type="text"
                required
                value={shortSpec}
                onChange={(e) => setShortSpec(e.target.value)}
                placeholder="Dual-Core 240MHz · Wi-Fi + BLE · 30-Pin"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Full Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Operating Voltage</label>
              <input
                type="text"
                value={operatingVoltage}
                onChange={(e) => setOperatingVoltage(e.target.value)}
                placeholder="3.3V – 5V"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Datasheet URL (HTTPS)</label>
              <input
                type="url"
                value={datasheetUrl}
                onChange={(e) => setDatasheetUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Pin Configuration</label>
              <textarea
                rows={2}
                value={pinConfiguration}
                onChange={(e) => setPinConfiguration(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Optional Pin Diagram Image
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="url"
                  value={pinDiagramUrl}
                  onChange={(e) => setPinDiagramUrl(e.target.value)}
                  placeholder="Storage URL or upload"
                  className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-xs"
                />
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                  Upload
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePinDiagramUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Applications</label>
              <input
                type="text"
                value={applications}
                onChange={(e) => setApplications(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>

          {/* Dynamic Specs JSONB */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Technical Specs Table</label>
              <button
                type="button"
                onClick={() => setSpecRows((rows) => [...rows, { key: '', value: '' }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Spec Row
              </button>
            </div>
            {specRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Parameter (e.g. Package)"
                  value={row.key}
                  onChange={(e) =>
                    setSpecRows((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r))
                    )
                  }
                  className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-xs"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. DIP-14)"
                  value={row.value}
                  onChange={(e) =>
                    setSpecRows((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r))
                    )
                  }
                  className="h-9 flex-1 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setSpecRows((rows) => rows.filter((_, idx) => idx !== i))}
                  aria-label="Remove spec row"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          {/* Visibility Toggles */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-[#0B1F3A]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-[#F97316]"
              />
              Active (Visible in Storefront)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[#0B1F3A]">
              <input
                type="checkbox"
                checked={isFeaturedKit}
                onChange={(e) => setIsFeaturedKit(e.target.checked)}
                className="h-4 w-4 accent-[#F97316]"
              />
              Featured ECE Kit
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-[#F97316] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60"
            >
              {saving ? 'Saving...' : product ? 'Update Component' : 'Create Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
