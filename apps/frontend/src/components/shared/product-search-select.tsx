import type { Ref } from 'react';
import type { Product } from '@plastmassa/shared';
import { SearchCombobox } from '@/components/shared/search-combobox';

interface ProductSearchSelectProps {
  products: Product[];
  /** Shown as suggestions when the field is focused but nothing has been typed yet. */
  recentProducts?: Product[];
  value?: string;
  onSelect: (product: Product) => void;
  onCreateNew?: (searchText: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onEnterNext?: () => void;
}

export function ProductSearchSelect({
  products,
  recentProducts = [],
  value,
  onSelect,
  onCreateNew,
  placeholder = "Mahsulotni qidiring...",
  className,
  inputRef,
  onEnterNext,
}: ProductSearchSelectProps) {
  return (
    <SearchCombobox
      items={products}
      recentItems={recentProducts}
      value={value}
      getId={(p) => p._id}
      getLabel={(p) => p.name}
      getImage={(p) => p.imageUrl}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      createNewLabel={(q) => (q ? `"${q}" nomli yangi mahsulot yaratish` : 'Yangi mahsulot yaratish')}
      placeholder={placeholder}
      className={className}
      inputRef={inputRef}
      onEnterNext={onEnterNext}
    />
  );
}
