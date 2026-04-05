import { FlaskConical } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';

export function MockModeBanner() {
  const { isMockMode, toggleMockMode } = useUIStore();

  if (!isMockMode) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Demo rejim yoqilgan
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-200/80">
              Ayrim sahifalarda ma&apos;lumotlar mock ma&apos;lumot bilan ishlaydi va real bazaga yozilmaydi.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMockMode}
          className="border-amber-500/30 bg-background/70 text-amber-700 hover:bg-background dark:text-amber-300"
        >
          Demo rejimni o&apos;chirish
        </Button>
      </div>
    </div>
  );
}
