import type { Ref } from 'react';
import type { Supplier } from '@plastmassa/shared';
import { SearchCombobox } from '@/components/shared/search-combobox';

interface SupplierSearchSelectProps {
  suppliers: Supplier[];
  /** Shown as suggestions when the field is focused but nothing has been typed yet. */
  recentSuppliers?: Supplier[];
  value?: string;
  onSelect: (supplier: Supplier) => void;
  onCreateNew?: (searchText: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onEnterNext?: () => void;
}

export function SupplierSearchSelect({
  suppliers,
  recentSuppliers = [],
  value,
  onSelect,
  onCreateNew,
  placeholder = 'Yetkazib beruvchini qidiring...',
  className,
  inputRef,
  onEnterNext,
}: SupplierSearchSelectProps) {
  return (
    <SearchCombobox
      items={suppliers}
      recentItems={recentSuppliers}
      value={value}
      getId={(s) => s._id}
      getLabel={(s) => s.name}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      createNewLabel={(q) => (q ? `"${q}" nomli yangi yetkazib beruvchi yaratish` : 'Yangi yetkazib beruvchi yaratish')}
      placeholder={placeholder}
      className={className}
      inputRef={inputRef}
      onEnterNext={onEnterNext}
    />
  );
}
