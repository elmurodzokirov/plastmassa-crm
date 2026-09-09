import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ClipboardList, AlertTriangle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useProducts } from '@/hooks/use-products';
import { useAllActiveRecipes } from '@/hooks/use-recipes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { StatCard } from '@/components/shared/stat-card';
import { DataTableWrapper } from '@/components/shared/data-table';

export default function CalculationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: productsData, isLoading: isLoadingProducts } = useProducts({ limit: 200, isActive: true });
  const { data: recipes, isLoading: isLoadingRecipes } = useAllActiveRecipes();

  const isLoading = isLoadingProducts || isLoadingRecipes;
  const products = productsData?.items || [];

  const recipeByProduct = useMemo(() => {
    const map = new Map<string, NonNullable<typeof recipes>[number]>();
    (recipes || []).forEach((r) => {
      const productId = typeof r.product === 'object' ? r.product._id : r.product;
      map.set(productId, r);
    });
    return map;
  }, [recipes]);

  const rows = useMemo(() => {
    return products
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .map((p) => {
        const recipe = recipeByProduct.get(p._id);
        const costPrice = p.costPrice || 0;
        const margin = p.price > 0 && costPrice > 0 ? ((p.price - costPrice) / p.price) * 100 : null;
        return { product: p, recipe, costPrice, margin };
      });
  }, [products, recipeByProduct, search]);

  const withRecipeCount = useMemo(() => rows.filter((r) => r.recipe).length, [rows]);
  const withoutRecipeCount = rows.length - withRecipeCount;
  const negativeMarginCount = useMemo(
    () => rows.filter((r) => r.margin !== null && r.margin < 0).length,
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalkulyatsiya</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Har bir mahsulotning retsept (xom-ashyo tarkibi) asosidagi tannarxi va marjasi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Retsepti bor mahsulotlar"
          value={isLoading ? '...' : withRecipeCount}
          icon={ClipboardList}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Retsepti yo'q mahsulotlar"
          value={isLoading ? '...' : withoutRecipeCount}
          icon={Calculator}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/20"
          index={1}
        />
        <StatCard
          title="Salbiy marjali mahsulotlar"
          value={isLoading ? '...' : negativeMarginCount}
          icon={AlertTriangle}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
          index={2}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative max-w-sm"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Mahsulot nomi bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </motion.div>

      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && rows.length === 0}
        emptyTitle="Mahsulot topilmadi"
        emptyDescription="Hozircha hech qanday mahsulot yo'q"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Mahsulot</TableHead>
              <TableHead className="hidden sm:table-cell">Versiya</TableHead>
              <TableHead className="hidden md:table-cell">Xom-ashyo soni</TableHead>
              <TableHead>Tannarx</TableHead>
              <TableHead className="hidden sm:table-cell">Sotuv narxi</TableHead>
              <TableHead>Marja</TableHead>
              <TableHead className="hidden sm:table-cell">Holat</TableHead>
              <TableHead className="w-24">Amal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ product, recipe, costPrice, margin }) => (
              <TableRow key={product._id}>
                <TableCell>
                  <button
                    onClick={() => navigate(`/products/${product._id}`)}
                    className="font-medium text-foreground hover:text-indigo-400 transition-colors text-left"
                  >
                    {product.name}
                  </button>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {recipe ? `v${recipe.version}` : '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {recipe ? `${recipe.items.length} ta` : '-'}
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(costPrice)}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {formatCurrency(product.price)}
                </TableCell>
                <TableCell>
                  {margin === null ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    <span className={cn('font-medium', margin < 0 ? 'text-destructive' : 'text-emerald-400')}>
                      {formatNumber(margin)}%
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {recipe ? (
                    <Badge variant="success">Retsept bor</Badge>
                  ) : (
                    <Badge variant="secondary">Retsept yo'q</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/products/${product._id}`)}
                  >
                    {recipe ? 'Tahrirlash' : 'Qo\'shish'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>
    </div>
  );
}
