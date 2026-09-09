import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ProductImage } from '@/components/shared/product-image';

interface SearchComboboxProps<T> {
  items: T[];
  /** Shown as suggestions when the field is focused but nothing has been typed yet. */
  recentItems?: T[];
  value?: string;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  /** When provided, a thumbnail is shown next to each item (and the selected value). */
  getImage?: (item: T) => string | null | undefined;
  onSelect: (item: T) => void;
  onCreateNew?: (searchText: string) => void;
  createNewLabel?: (searchText: string) => string;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Fired after Enter is handled (item auto-selected if searching, or just closed). */
  onEnterNext?: () => void;
}

export function SearchCombobox<T>({
  items,
  recentItems = [],
  value,
  getId,
  getLabel,
  getImage,
  onSelect,
  onCreateNew,
  createNewLabel,
  placeholder = 'Qidiring...',
  className,
  inputRef,
  onEnterNext,
}: SearchComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const selected = useMemo(() => items.find((i) => getId(i) === value), [items, value, getId]);
  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return recentItems;
    const q = query.trim().toLowerCase();
    return items.filter((i) => getLabel(i).toLowerCase().includes(q));
  }, [isSearching, query, items, recentItems, getLabel]);

  const hasImages = !!getImage;
  // The "create new" row (when present) is appended as one extra navigable slot
  // right after the item list, so arrow keys can reach it too.
  const createNewIndex = filtered.length;
  const totalNavigable = filtered.length + (onCreateNew ? 1 : 0);

  // Keep the highlighted row within bounds whenever the visible list changes
  // (new query, recent-list swap, popover re-opened) and scroll it into view.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered, open]);

  useEffect(() => {
    itemRefs.current.get(highlightedIndex)?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const handleSelect = (item: T) => {
    onSelect(item);
    setQuery('');
    setOpen(false);
  };

  const handleCreateNew = () => {
    onCreateNew?.(query.trim());
    setQuery('');
    setOpen(false);
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) setQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (totalNavigable > 0) {
        setHighlightedIndex((i) => (i + 1) % totalNavigable);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open && totalNavigable > 0) {
        setHighlightedIndex((i) => (i - 1 + totalNavigable) % totalNavigable);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && totalNavigable > 0) {
        const idx = Math.min(highlightedIndex, totalNavigable - 1);
        if (idx === createNewIndex && onCreateNew) {
          handleCreateNew();
        } else {
          handleSelect(filtered[idx]);
        }
      } else {
        setOpen(false);
      }
      onEnterNext?.();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className={cn('relative', className)}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {hasImages && selected && !open && (
            <ProductImage
              src={getImage!(selected)}
              alt={getLabel(selected)}
              className="absolute left-8 top-1/2 h-5 w-5 -translate-y-1/2 rounded-md"
              iconClassName="h-2.5 w-2.5"
            />
          )}
          <Input
            ref={inputRef}
            value={open ? query : selected ? getLabel(selected) : ''}
            placeholder={placeholder}
            onFocus={() => {
              setOpen(true);
              setQuery('');
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className={cn('pl-9', hasImages && selected && !open && 'pl-14')}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-64 overflow-y-auto p-1">
          {!isSearching && filtered.length > 0 && (
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              So'nggi ishlatilganlar
            </p>
          )}
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              {isSearching ? `"${query.trim()}" bo'yicha topilmadi` : 'Hech narsa topilmadi'}
            </p>
          ) : (
            filtered.map((item, index) => {
              const id = getId(item);
              return (
                <button
                  key={id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(index, el);
                    else itemRefs.current.delete(index);
                  }}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60',
                    id === value && 'bg-muted/40',
                    index === highlightedIndex && 'bg-muted/60 ring-1 ring-inset ring-ring',
                  )}
                >
                  {hasImages && (
                    <ProductImage
                      src={getImage!(item)}
                      alt={getLabel(item)}
                      className="h-8 w-8 shrink-0 rounded-md"
                      iconClassName="h-3.5 w-3.5"
                    />
                  )}
                  <span className="flex-1 truncate">{getLabel(item)}</span>
                  {id === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </div>
        {onCreateNew && (
          <div className="border-t border-border p-1">
            <button
              ref={(el) => {
                if (el) itemRefs.current.set(createNewIndex, el);
                else itemRefs.current.delete(createNewIndex);
              }}
              type="button"
              onClick={handleCreateNew}
              onMouseEnter={() => setHighlightedIndex(createNewIndex)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-indigo-400 transition-colors hover:bg-muted/60',
                highlightedIndex === createNewIndex && 'bg-muted/60 ring-1 ring-inset ring-ring',
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {createNewLabel
                  ? createNewLabel(query.trim())
                  : query.trim()
                    ? `"${query.trim()}" nomli yangisini yaratish`
                    : 'Yangisini yaratish'}
              </span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
