import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
}

export function ProductImage({
  src,
  alt,
  className,
  imageClassName,
  iconClassName,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden bg-muted text-muted-foreground',
        className,
      )}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn('h-full w-full object-cover', imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <Package className={cn('h-5 w-5', iconClassName)} />
      )}
    </div>
  );
}
