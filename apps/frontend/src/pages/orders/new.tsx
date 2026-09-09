import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  AlertTriangle,
  X,
  Percent,
} from 'lucide-react';
import type { Customer, Product, Unit } from '@plastmassa/shared';
import { cn, formatCurrency } from '@/lib/utils';
import { useCustomers } from '@/hooks/use-customers';
import { useProducts } from '@/hooks/use-products';
import { useCreateOrder } from '@/hooks/use-orders';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ProductImage } from '@/components/shared/product-image';
import { SearchCombobox } from '@/components/shared/search-combobox';
import { QuickCreateCustomerDialog } from '@/components/shared/quick-create-customer-dialog';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface CartItem {
  product: Product;
  unit: { id: string; name: string };
  quantity: number;
  originalPrice: number;
  discountPercent: number;
  price: number;
  total: number;
}

// Auto-select input content on focus for quick editing
const SelectOnFocusInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  (props, ref) => {
    return (
      <Input
        {...props}
        ref={ref}
        onFocus={(e) => {
          e.target.select();
          props.onFocus?.(e);
        }}
      />
    );
  },
);
SelectOnFocusInput.displayName = 'SelectOnFocusInput';

export default function NewOrderPage() {
  const navigate = useNavigate();

  // Customer selection — searchable combobox, no "recently used" suggestions
  // (unlike the product/supplier combobox elsewhere in the app).
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const [quickCreateCustomerOpen, setQuickCreateCustomerOpen] = useState(false);
  const [quickCreateCustomerInitialName, setQuickCreateCustomerInitialName] = useState('');
  const [justCreatedCustomers, setJustCreatedCustomers] = useState<Customer[]>([]);

  // Product selection
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const debouncedProductSearch = useDebounce(productSearch, 300);

  // Payment
  const [paymentType, setPaymentType] = useState<string>('CASH');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Editing state — which cart item field is being inline-edited
  const [editingField, setEditingField] = useState<{ index: number; field: 'price' | 'quantity' | 'discount' } | null>(null);

  // ── Keyboard navigation refs ────────────────────────────────────────────────
  // Product grid cells, focused via arrow keys; column count is measured from the
  // actually-rendered DOM so it stays correct across the grid's responsive breakpoints.
  const productRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastFocusedProductIndexRef = useRef(0);
  // Cart row fields, focused in a chain right after a product is picked:
  // product -> quantity (selected) -> Enter -> price (selected) -> Enter -> back to grid.
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pendingFocusQuantityIndexRef = useRef<number | null>(null);

  // Fetched once (not per-keystroke) so the combobox can filter client-side, same
  // pattern as the product/supplier comboboxes in the purchase-invoice dialog.
  const { data: customersData } = useCustomers({ limit: 500, isActive: true });

  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    search: debouncedProductSearch || undefined,
    limit: 50,
    isActive: true,
  });

  const createOrderMutation = useCreateOrder();
  const fetchedCustomers = customersData?.items || [];
  const customers = useMemo(() => {
    const extra = justCreatedCustomers.filter((jc) => !fetchedCustomers.some((c) => c._id === jc._id));
    return [...fetchedCustomers, ...extra];
  }, [fetchedCustomers, justCreatedCustomers]);
  const products = productsData?.items || [];

  // Autofocus the customer field on mount, and again whenever the customer is cleared.
  useEffect(() => {
    if (!selectedCustomer) {
      customerInputRef.current?.focus();
    }
  }, [selectedCustomer]);

  useEffect(() => {
    const idx = pendingFocusQuantityIndexRef.current;
    if (idx !== null) {
      quantityRefs.current[idx]?.focus();
      pendingFocusQuantityIndexRef.current = null;
    }
  }, [cart]);

  const getProductColumnCount = useCallback(() => {
    const refs = productRefs.current;
    const first = refs[0];
    if (!first) return 1;
    const firstTop = first.offsetTop;
    let count = 0;
    for (const el of refs) {
      if (!el) break;
      if (el.offsetTop === firstTop) count++;
      else break;
    }
    return count || 1;
  }, []);

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    productRefs.current[0]?.focus();
  }, []);

  const openQuickCreateCustomer = useCallback((searchText: string) => {
    setQuickCreateCustomerInitialName(searchText);
    setQuickCreateCustomerOpen(true);
  }, []);

  const handleCustomerCreated = useCallback(
    (customer: Customer) => {
      setJustCreatedCustomers((prev) => [...prev, customer]);
      handleCustomerSelect(customer);
      setQuickCreateCustomerOpen(false);
    },
    [handleCustomerSelect],
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.total, 0),
    [cart],
  );

  useEffect(() => {
    if (paymentType === 'CASH' || paymentType === 'TRANSFER') {
      setPaidAmount(cartTotal);
    } else {
      setPaidAmount(0);
    }
  }, [paymentType, cartTotal]);

  const getUnitName = (unit: string | Unit): string => {
    if (typeof unit === 'string') return unit;
    return unit.name;
  };

  const getUnitId = (unit: string | Unit): string => {
    if (typeof unit === 'string') return unit;
    return unit._id;
  };

  const recalcItem = (item: CartItem, overrides: Partial<CartItem>): CartItem => {
    const merged = { ...item, ...overrides };
    const discountAmount = Math.round(merged.originalPrice * merged.discountPercent / 100);
    const price = merged.originalPrice - discountAmount;
    return {
      ...merged,
      price,
      total: merged.quantity * price,
    };
  };

  const handleProductClick = useCallback(
    (product: Product) => {
      const baseUnitId = getUnitId(product.baseUnit);
      const existingIndex = cart.findIndex(
        (item) => item.product._id === product._id && item.unit.id === baseUnitId,
      );
      // Remember which cart row to jump focus into once the state update below
      // has actually rendered (consumed by the `cart` effect further up).
      pendingFocusQuantityIndexRef.current = existingIndex >= 0 ? existingIndex : cart.length;

      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.product._id === product._id && item.unit.id === baseUnitId,
        );

        if (idx >= 0) {
          const updated = [...prev];
          const item = updated[idx];
          updated[idx] = recalcItem(item, { quantity: item.quantity + 1 });
          return updated;
        }

        return [
          ...prev,
          {
            product,
            unit: { id: baseUnitId, name: getUnitName(product.baseUnit) },
            quantity: 1,
            originalPrice: product.price,
            discountPercent: 0,
            price: product.price,
            total: product.price,
          },
        ];
      });
    },
    [cart],
  );

  const handleRemoveFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    setEditingField(null);
  }, []);

  const handleUpdateQuantity = useCallback(
    (index: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        handleRemoveFromCart(index);
        return;
      }
      setCart((prev) => {
        const updated = [...prev];
        updated[index] = recalcItem(updated[index], { quantity: newQuantity });
        return updated;
      });
    },
    [handleRemoveFromCart],
  );

  const handleUpdatePrice = useCallback(
    (index: number, newPrice: number) => {
      if (newPrice < 0) return;
      setCart((prev) => {
        const updated = [...prev];
        updated[index] = recalcItem(updated[index], { originalPrice: newPrice, discountPercent: 0 });
        return updated;
      });
    },
    [],
  );

  const handleUpdateDiscount = useCallback(
    (index: number, percent: number) => {
      if (percent < 0 || percent > 100) return;
      setCart((prev) => {
        const updated = [...prev];
        updated[index] = recalcItem(updated[index], { discountPercent: percent });
        return updated;
      });
    },
    [],
  );

  const handleUpdateUnit = useCallback(
    (index: number, unitId: string) => {
      setCart((prev) => {
        const updated = [...prev];
        const item = updated[index];
        const product = item.product;
        const baseUnitId = getUnitId(product.baseUnit);
        let unitName = '';
        let unitPrice = product.price;

        if (unitId === baseUnitId) {
          unitName = getUnitName(product.baseUnit);
        } else {
          const salesUnit = product.salesUnits.find((su) => getUnitId(su.unit) === unitId);
          if (salesUnit) {
            unitName = getUnitName(salesUnit.unit);
            unitPrice = salesUnit.price;
          }
        }

        updated[index] = recalcItem(item, {
          unit: { id: unitId, name: unitName },
          originalPrice: unitPrice,
          discountPercent: 0,
        });
        return updated;
      });
    },
    [],
  );

  const handleSubmitOrder = useCallback(async () => {
    if (!selectedCustomer || cart.length === 0) return;

    const orderData = {
      customer: selectedCustomer._id,
      items: cart.map((item) => ({
        product: item.product._id,
        unit: item.unit.id,
        quantity: item.quantity,
        price: item.originalPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountPercent > 0 ? Math.round(item.originalPrice * item.discountPercent / 100) : 0,
      })),
      paidAmount,
      paymentType,
      dueDate: paymentType === 'DEBT' && dueDate ? dueDate : undefined,
      notes: notes || undefined,
    };

    try {
      const createdOrder = await createOrderMutation.mutateAsync(orderData);
      toast({ title: 'Muvaffaqiyatli', description: 'Buyurtma yaratildi' });
      navigate(`/orders/${createdOrder._id}`);
    } catch (error: any) {
      toast({
        title: 'Xatolik',
        description: error?.response?.data?.message || 'Buyurtma yaratishda xatolik',
        variant: 'destructive',
      });
    }
  }, [selectedCustomer, cart, cartTotal, paidAmount, paymentType, dueDate, notes, createOrderMutation, navigate]);

  const remaining = cartTotal - paidAmount;
  const wouldExceedDebtLimit =
    selectedCustomer && paymentType === 'DEBT'
      ? selectedCustomer.currentDebt + remaining > selectedCustomer.debtLimit && selectedCustomer.debtLimit > 0
      : false;
  const hasInvalidPaidAmount = paidAmount < 0 || paidAmount > cartTotal;
  const canSubmit =
    !!selectedCustomer &&
    cart.length > 0 &&
    !wouldExceedDebtLimit &&
    !hasInvalidPaidAmount;

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col">
      {/* Top Bar */}
      <div className="mb-4 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/orders')}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground shrink-0">Yangi sotuv</h1>

        {/* Customer selector */}
        <div className="relative w-full flex-1 lg:max-w-md">
          {selectedCustomer ? (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/20">
              <User className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground truncate">{selectedCustomer.name}</span>
                {selectedCustomer.phone && (
                  <span className="text-xs text-muted-foreground ml-2">{selectedCustomer.phone}</span>
                )}
              </div>
              <span className={cn('text-xs font-semibold shrink-0', selectedCustomer.currentDebt > 0 ? 'text-red-500' : 'text-emerald-500')}>
                {formatCurrency(selectedCustomer.currentDebt)}
              </span>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <SearchCombobox
              items={customers}
              recentItems={[]}
              getId={(c) => c._id}
              getLabel={(c) => (c.phone ? `${c.name} — ${c.phone}` : c.name)}
              onSelect={handleCustomerSelect}
              onCreateNew={openQuickCreateCustomer}
              createNewLabel={(q) => (q ? `"${q}" nomli yangi mijoz yaratish` : 'Yangi mijoz yaratish')}
              placeholder="Mijoz tanlang..."
              inputRef={customerInputRef}
            />
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
        {/* LEFT — Products */}
        <div className="flex min-h-[18rem] flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm xl:min-h-0 xl:flex-[3]">
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mahsulot qidirish..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9 h-9 border-border/80 shadow-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center h-full"><LoadingSpinner size="md" /></div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Mahsulotlar topilmadi</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product, index) => {
                  const cartItem = cart.find((item) => item.product._id === product._id);
                  return (
                    <button
                      key={product._id}
                      ref={(el) => { productRefs.current[index] = el; }}
                      onClick={() => handleProductClick(product)}
                      onFocus={() => { lastFocusedProductIndexRef.current = index; }}
                      onKeyDown={(e) => {
                        let nextIndex: number | null = null;
                        if (e.key === 'ArrowRight') nextIndex = index + 1;
                        else if (e.key === 'ArrowLeft') nextIndex = index - 1;
                        else if (e.key === 'ArrowDown') nextIndex = index + getProductColumnCount();
                        else if (e.key === 'ArrowUp') nextIndex = index - getProductColumnCount();
                        if (nextIndex !== null) {
                          e.preventDefault();
                          nextIndex = Math.max(0, Math.min(products.length - 1, nextIndex));
                          productRefs.current[nextIndex]?.focus();
                        }
                      }}
                      className={cn(
                        'relative flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all duration-150 text-center hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        cartItem
                          ? 'border-primary/50 bg-primary/5 shadow-sm'
                          : 'border-border/60 hover:bg-accent hover:border-border',
                      )}
                    >
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className={cn(
                          'mb-1.5 h-12 w-12 rounded-xl border',
                          cartItem
                            ? 'border-primary/20 bg-primary/5'
                            : 'border-border/60 bg-muted/50',
                        )}
                        iconClassName={cn('h-5 w-5', cartItem ? 'text-primary' : 'text-muted-foreground')}
                      />
                      <p className="text-xs font-medium text-foreground truncate w-full leading-tight">{product.name}</p>
                      <p className="text-[11px] text-primary font-semibold mt-1">{formatCurrency(product.price)}</p>
                      <p className="text-[10px] text-muted-foreground">{product.currentStock} {getUnitName(product.baseUnit)}</p>
                      {cartItem && (
                        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-md ring-2 ring-card">
                          {cartItem.quantity}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart + Payment */}
        <div className="flex min-h-[20rem] flex-col rounded-xl border border-border/80 bg-card shadow-sm xl:min-h-0 xl:flex-[2]">
          {/* Cart header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Savat</h2>
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">{cart.length} ta</Badge>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Savat bo'sh</p>
                <p className="text-xs mt-1">Mahsulotga bosing</p>
              </div>
            ) : (
              <div>
                {cart.map((item, index) => {
                  const hasSalesUnits = item.product.salesUnits.length > 0;
                  const hasDiscount = item.discountPercent > 0;

                  return (
                    <div
                      key={`${item.product._id}-${item.unit.id}-${index}`}
                      className="group px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
                      {/* Product name + unit + delete */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <ProductImage
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="mt-0.5 h-10 w-10 shrink-0 rounded-xl border border-border/60 bg-background"
                            iconClassName="h-4 w-4"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                            {hasSalesUnits ? (
                              <Select value={item.unit.id} onValueChange={(v) => handleUpdateUnit(index, v)}>
                                <SelectTrigger className="h-5 w-auto text-[11px] text-muted-foreground border-0 bg-transparent p-0 gap-1 shadow-none focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={getUnitId(item.product.baseUnit)}>{getUnitName(item.product.baseUnit)}</SelectItem>
                                  {item.product.salesUnits.map((su, i) => (
                                    <SelectItem key={i} value={getUnitId(su.unit)}>{getUnitName(su.unit)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">{item.unit.name}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(index)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Quantity + Price + Total — clear horizontal layout */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Quantity stepper */}
                        <div className="flex items-center rounded-lg border border-border/80 bg-background overflow-hidden">
                          <button
                            onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <SelectOnFocusInput
                            ref={(el) => { quantityRefs.current[index] = el; }}
                            type="number"
                            min={0.01}
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                priceRefs.current[index]?.focus();
                              }
                            }}
                            className="h-8 w-16 text-center text-sm font-semibold border-0 border-x border-border/80 rounded-none shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price input */}
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground shrink-0">×</span>
                          <SelectOnFocusInput
                            ref={(el) => { priceRefs.current[index] = el; }}
                            type="number"
                            min={0}
                            step="any"
                            value={item.originalPrice}
                            onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                productRefs.current[lastFocusedProductIndexRef.current]?.focus();
                              }
                            }}
                            className="h-8 flex-1 min-w-0 text-sm text-right font-medium shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        {/* Discount toggle */}
                        <button
                          onClick={() => setEditingField(
                            editingField?.index === index && editingField?.field === 'discount'
                              ? null
                              : { index, field: 'discount' },
                          )}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shrink-0',
                            hasDiscount
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-border/80 text-muted-foreground hover:bg-accent hover:text-foreground',
                          )}
                          title="Chegirma"
                        >
                          <Percent className="h-3.5 w-3.5" />
                        </button>

                        {/* Total */}
                        <p className="ml-auto w-full text-right text-sm font-bold text-foreground tabular-nums sm:ml-0 sm:w-24">
                          {formatCurrency(item.total)}
                        </p>
                      </div>

                      {/* Discount row — only visible when toggled or has discount */}
                      {(editingField?.index === index && editingField?.field === 'discount') || hasDiscount ? (
                        <div className="flex items-center gap-2 mt-2 ml-0 pl-0">
                          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2 py-1">
                            <Percent className="h-3 w-3 text-emerald-500" />
                            <SelectOnFocusInput
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={item.discountPercent}
                              onChange={(e) => handleUpdateDiscount(index, parseFloat(e.target.value) || 0)}
                              className="h-6 w-12 text-xs text-center border-0 bg-transparent shadow-none p-0 focus-visible:ring-0 font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          {hasDiscount && (
                            <span className="text-xs text-muted-foreground">
                              <span className="line-through">{formatCurrency(item.originalPrice)}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1.5">{formatCurrency(item.price)}</span>
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom: Payment */}
          <div className="shrink-0 space-y-3 border-t border-border/50 bg-card/95 px-4 py-3 backdrop-blur">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Jami</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(cartTotal)}</span>
            </div>

            {/* Payment type + amount */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v)}>
                <SelectTrigger className="h-9 w-full text-sm sm:w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Naqd</SelectItem>
                  <SelectItem value="TRANSFER">O'tkazma</SelectItem>
                  <SelectItem value="DEBT">Nasiya</SelectItem>
                </SelectContent>
              </Select>
              <SelectOnFocusInput
                type="number"
                min={0}
                max={cartTotal}
                step="any"
                value={paidAmount}
                onChange={(e) => {
                  const rawValue = parseFloat(e.target.value);
                  const nextValue = Number.isFinite(rawValue) ? rawValue : 0;
                  setPaidAmount(Math.min(Math.max(nextValue, 0), cartTotal));
                }}
                disabled={paymentType === 'CASH' || paymentType === 'TRANSFER'}
                className="h-9 flex-1 text-sm"
                placeholder="To'langan"
              />
            </div>

            {/* Due date for DEBT */}
            {paymentType === 'DEBT' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To'lov muddati</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}

            {/* Remaining */}
            {paymentType === 'DEBT' && remaining > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Qoldiq (qarz)</span>
                <span className="font-semibold text-red-500">{formatCurrency(remaining)}</span>
              </div>
            )}

            {hasInvalidPaidAmount && (
              <p className="text-xs text-red-500">
                To&apos;langan summa jami summadan katta bo&apos;lishi mumkin emas
              </p>
            )}

            {/* Debt warning */}
            {wouldExceedDebtLimit && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-500">Qarz limitidan oshib ketadi!</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Limit: {formatCurrency(selectedCustomer!.debtLimit)} | Qarz: {formatCurrency(selectedCustomer!.currentDebt)} | Yangi: {formatCurrency(selectedCustomer!.currentDebt + remaining)}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <Textarea
              placeholder="Izoh..."
              rows={1}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm resize-none"
            />

            {/* Submit */}
            <Button
              onClick={handleSubmitOrder}
              disabled={!canSubmit || createOrderMutation.isPending}
              className="w-full gap-2 h-11 text-sm font-semibold"
              size="lg"
            >
              {createOrderMutation.isPending ? (
                <LoadingSpinner size="sm" className="h-4 w-4" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              Buyurtma berish
              {cartTotal > 0 && <span className="ml-1 opacity-80">— {formatCurrency(cartTotal)}</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Create Customer Dialog */}
      <QuickCreateCustomerDialog
        open={quickCreateCustomerOpen}
        onOpenChange={setQuickCreateCustomerOpen}
        initialName={quickCreateCustomerInitialName}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}
