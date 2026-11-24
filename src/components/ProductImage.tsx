import { useState } from 'react';
import { Cpu } from 'lucide-react';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

export function ProductImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  eager = false,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const hasValidSrc = Boolean(src && src.trim().length > 0 && !failed);

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}
    >
      {hasValidSrc ? (
        <img
          src={src!}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`h-full w-full object-contain p-3 transition-transform duration-300 ${imgClassName}`}
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 p-4 text-center text-slate-400 select-none"
          aria-label="Image unavailable"
        >
          <Cpu className="h-9 w-9 stroke-[1.5] text-slate-400" aria-hidden="true" />
          <span className="text-xs font-medium tracking-tight text-slate-500">
            Image unavailable
          </span>
        </div>
      )}
    </div>
  );
}
