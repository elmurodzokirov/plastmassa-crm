import { useProductionLog } from '@/hooks/use-production';
import { useProducts } from '@/hooks/use-products';
import { useUsers } from '@/hooks/use-users';
import { ProductionBatchDetailDialog } from './production-batch-detail-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface ProductionLogPreviewDialogProps {
  logId: string | null;
  onOpenChange: (open: boolean) => void;
}

// Thin wrapper: resolves a ProductionLog _id to its batchNumber, then opens
// the existing (editable) ProductionBatchDetailDialog for that batch.
export function ProductionLogPreviewDialog({
  logId,
  onOpenChange,
}: ProductionLogPreviewDialogProps) {
  const { data: log, isLoading } = useProductionLog(logId || '');
  const { data: productsData } = useProducts({ limit: 200, isActive: true });
  const { data: usersData } = useUsers({ limit: 200 });

  const products = productsData?.items || [];
  const workers = usersData?.items || [];

  if (logId && (isLoading || !log?.batchNumber)) {
    return (
      <Dialog open={!!logId} onOpenChange={(open) => !open && onOpenChange(false)}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ProductionBatchDetailDialog
      open={!!logId}
      batchNumber={log?.batchNumber || null}
      onOpenChange={onOpenChange}
      products={products}
      workers={workers}
    />
  );
}
