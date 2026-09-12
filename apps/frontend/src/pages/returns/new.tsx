import { useState, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { Customer, Product } from '@plastmassa/shared';
import { cn, formatCurrency } from '@/lib/utils';
import { useCustomers } from '@/hooks/use-customers';
import { useProducts } from '@/hooks/use-products';
import { useCreateReturn } from '@/hooks/use-returns';
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface ReturnCartItem {
  product: Product;
  unit: { id: string; name: string };
  quantity: number;
  price: number;
  total: number;
}

// Auto-select input content on focus for quick editing (same pattern as "Yangi sotuv").
const SelectOnFocusInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  (props, ref) => (
    <Input
      {...props}
      ref={ref}
      onFocus={(e) => {
        e.target.select();
        props.onFocus?.(e);
      }}
    />
  ),
);
SelectOnFocusInput.displayName = 'SelectOnFocusInput';

// Order-independent "return from customer": pick a customer, freely build a list
// of returned products (same search+cart interaction as "Yangi sotuv", minus
// discounts/quick-create — kept deliberately simple), and record how much cash
// was actually handed back. Whatever isn't refunded in cash settles against the
// customer's account when this document is later approved from /returns.
export default function NewCustomerReturnPage() {
  const navigate = useNavigate();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const [cart, setCart] = useState<ReturnCartItem[]>([]);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [reason, setReason] = useState('');

  const { data: customersData } = useCustomers({ limit: 500, isActive: true });
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    search: debouncedProductSearch || undefined,
    limit: 50,
    isActive: true,
  });
  const createReturnMutation = useCreateReturn();

  const customers = customersData?.items || [];
  const products = productsData?.items || [];

  const getUnitName = (unit: any): string => (typeof unit === 'string' ? unit : unit?.name || '');
  const getUnitId = (unit: any): string => (typeof unit === 'string' ? unit : unit?._id || '');

  const recalcItem = (item: ReturnCartItem, overrides: Partial<ReturnCartItem>): ReturnCartItem => {
    const merged = { ...item, ...overrides };
    return { ...merged, total: merged.quantity * merged.price };
  };

  const handleProductClick = useCallback((product: Product) => {
    const baseUnitId = getUnitId(product.baseUnit);
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.product._id === product._id && item.unit.id === baseUnitId,
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = recalcItem(updated[idx], { quantity: updated[idx].quantity + 1 });
        return updated;
      }
      return [
        ...prev,
        {
          product,
          unit: { id: baseUnitId, name: getUnitName(product.baseUnit) },
          quantity: 1,
          price: product.price,
          total: product.price,
        },
      ];
    });
  }, []);

  const handleRemoveFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
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

  const handleUpdatePrice = useCallback((index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = recalcItem(updated[index], { price: newPrice });
      return updated;
    });
  }, []);

  const handleUpdateUnit = useCallback((index: number, unitId: string) => {
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

      updated[index] = recalcItem(item, { unit: { id: unitId, name: unitName }, price: unitPrice });
      return updated;
    });
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);

  const parsedRefundAmount =
    refundAmount === '' ? 0 : Math.max(0, parseFloat(refundAmount) || 0);
  const refundExceedsTotal = parsedRefundAmount > cartTotal;
  const settleWithCustomer = Math.max(cartTotal - parsedRefundAmount, 0);

  const canSubmit =
    !!selectedCustomer && cart.length > 0 && !!reason.trim() && !refundExceedsTotal;

  const handleSubmit = useCallback(async () => {
    if (!selectedCustomer || cart.length === 0) return;

    try {
      await createReturnMutation.mutateAsync({
        customer: selectedCustomer._id,
        reason: reason.trim(),
        refundAmount: refundAmount === '' ? undefined : parsedRefundAmount,
        items: cart.map((item) => ({
          product: item.product._id,
          unit: item.unit.id,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      toast({ title: 'Muvaffaqiyatli', description: "Qaytarish hujjati yaratildi" });
      navigate('/returns');
    } catch (error: any) {
      toast({
        title: 'Xatolik',
        description: error?.response?.data?.message || "Qaytarish yaratishda xatolik",
        variant: 'destructive',
      });
    }
  }, [selectedCustomer, cart, reason, refundAmount, parsedRefundAmount, createReturnMutation, navigate]);

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
        <h1 className="text-xl font-semibold text-foreground shrink-0">Mijozdan qaytarish</h1>

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
              onSelect={setSelectedCustomer}
              placeholder="Mijoz tanlang..."
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
                {products.map((product) => {
                  const cartItem = cart.find((item) => item.product._id === product._id);
                  return (
                    <button
                      key={product._id}
                      onClick={() => handleProductClick(product)}
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
                          cartItem ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-muted/50',
                        )}
                        iconClassName={cn('h-5 w-5', cartItem ? 'text-primary' : 'text-muted-foreground')}
                      />
                      <p className="text-xs font-medium text-foreground truncate w-full leading-tight">{product.name}</p>
                      <p className="text-[11px] text-primary font-semibold mt-1">{formatCurrency(product.price)}</p>
                      {cartItem && (
                        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shadow-md ring-2 ring-card bg-primary text-primary-foreground">
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

        {/* RIGHT — Return list + Refund */}
        <div className="flex min-h-[20rem] flex-col rounded-xl border border-border/80 bg-card shadow-sm xl:min-h-0 xl:flex-[2]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Qaytariladigan mahsulotlar</h2>
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">{cart.length} ta</Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Ro'yxat bo'sh</p>
                <p className="text-xs mt-1">Mahsulotga bosing</p>
              </div>
            ) : (
              <div>
                {cart.map((item, index) => {
                  const hasSalesUnits = item.product.salesUnits.length > 0;
                  return (
                    <div
                      key={`${item.product._id}-${item.unit.id}-${index}`}
                      className="group px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
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
                            type="number"
                            min={0.01}
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 0)}
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
                            type="number"
                            min={0}
                            step="any"
                            value={item.price}
                            onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                            className="h-8 flex-1 min-w-0 text-sm text-right font-medium shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        {/* Total */}
                        <p className="ml-auto w-full text-right text-sm font-bold text-foreground tabular-nums sm:ml-0 sm:w-24">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom: Refund + reason + submit */}
          <div className="shrink-0 space-y-3 border-t border-border/50 bg-card/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Jami qaytarish summasi</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(cartTotal)}</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pul qaytarildi (ixtiyoriy)</Label>
              <SelectOnFocusInput
                type="number"
                min={0}
                max={cartTotal}
                step="any"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Bo'sh qoldirilsa — mijoz hisobidan hisoblanadi"
                className="h-9 text-sm"
              />
            </div>

            {refundExceedsTotal && (
              <p className="text-xs text-red-500">
                Qaytarilgan pul jami summadan katta bo&apos;lishi mumkin emas
              </p>
            )}

            {!refundExceedsTotal && cartTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mijoz hisobidan hisoblanadi</span>
                <span className="font-semibold text-foreground">{formatCurrency(settleWithCustomer)}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Sabab <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Qaytarish sababi..."
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-sm resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || createReturnMutation.isPending}
              className="w-full gap-2 h-11 text-sm font-semibold"
              size="lg"
            >
              {createReturnMutation.isPending ? (
                <LoadingSpinner size="sm" className="h-4 w-4" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              Qaytarish yaratish
              {cartTotal > 0 && <span className="ml-1 opacity-80">— {formatCurrency(cartTotal)}</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
