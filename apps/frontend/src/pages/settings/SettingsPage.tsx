import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  Database,
  Building2,
  Banknote,
  Factory,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useSettings, useUpdateSetting, useSeedSettings } from '@/hooks/use-settings';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// ── Constants ─────────────────────────────────────────────────────────

const GROUP_CONFIG: Record<string, { label: string; icon: typeof Settings }> = {
  Kompaniya: { label: 'Kompaniya', icon: Building2 },
  Moliya: { label: 'Moliya', icon: Banknote },
  'Ishlab chiqarish': { label: 'Ishlab chiqarish', icon: Factory },
};

// ── Component ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const seedSettings = useSeedSettings();

  // Local edit state: key -> edited value
  const [editedValues, setEditedValues] = useState<Record<string, string | number | boolean>>({});

  // Group settings by group
  const groupedSettings = useMemo(() => {
    const items = Array.isArray(settings) ? settings : [];
    const groups: Record<string, typeof items> = {};
    items.forEach((setting) => {
      const group = setting.group || 'Boshqa';
      if (!groups[group]) groups[group] = [];
      groups[group].push(setting);
    });
    return groups;
  }, [settings]);

  const handleValueChange = useCallback((key: string, value: string | number | boolean) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveSetting = useCallback(
    async (key: string, currentValue: string | number | boolean) => {
      const newValue = editedValues[key] !== undefined ? editedValues[key] : currentValue;
      try {
        await updateSetting.mutateAsync({ key, value: newValue });
        toast({
          title: 'Muvaffaqiyatli',
          description: "Sozlama saqlandi",
          variant: 'success',
        });
        // Clear edited value on success
        setEditedValues((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      } catch {
        toast({
          title: 'Xatolik',
          description: 'Sozlamani saqlashda xatolik yuz berdi',
          variant: 'destructive',
        });
      }
    },
    [editedValues, updateSetting],
  );

  const handleSeedSettings = useCallback(async () => {
    try {
      await seedSettings.mutateAsync();
      toast({
        title: 'Muvaffaqiyatli',
        description: "Boshlang'ich sozlamalar yuklandi",
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Xatolik',
        description: "Boshlang'ich sozlamalarni yuklashda xatolik yuz berdi",
        variant: 'destructive',
      });
    }
  }, [seedSettings]);

  const getDisplayValue = (key: string, originalValue: string | number | boolean) => {
    return editedValues[key] !== undefined ? editedValues[key] : originalValue;
  };

  const hasChanges = (key: string) => {
    return editedValues[key] !== undefined;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <h1 className="text-2xl font-bold text-foreground">Sozlamalar</h1>

        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleSeedSettings}
            disabled={seedSettings.isPending}
            className="gap-2 rounded-xl"
          >
            {seedSettings.isPending ? (
              <LoadingSpinner size="sm" className="h-4 w-4" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Boshlang'ich sozlamalarni yuklash
          </Button>
        )}
      </motion.div>

      {/* Settings Groups */}
      {Object.keys(groupedSettings).length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 text-center"
        >
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Sozlamalar topilmadi</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Boshlang'ich sozlamalarni yuklash tugmasini bosing"
              : "Hozircha hech qanday sozlama mavjud emas"}
          </p>
        </motion.div>
      ) : (
        Object.entries(groupedSettings).map(([group, items], groupIdx) => {
          const config = GROUP_CONFIG[group] || { label: group, icon: Settings };
          const GroupIcon = config.icon;

          return (
            <motion.div
              key={group}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + groupIdx * 0.1 }}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden"
            >
              {/* Group Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20">
                  <GroupIcon className="h-4 w-4 text-indigo-400" />
                </div>
                <h2 className="text-base font-semibold text-foreground">{config.label}</h2>
              </div>

              {/* Settings Rows */}
              <div className="divide-y divide-border/30">
                {items.map((setting) => {
                  const displayValue = getDisplayValue(setting.key, setting.value);
                  const changed = hasChanges(setting.key);

                  return (
                    <div
                      key={setting.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4"
                    >
                      <div className="flex-1 min-w-0">
                        <Label className="text-sm font-medium text-foreground">
                          {setting.label}
                        </Label>
                        {setting.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {setting.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {setting.type === 'boolean' ? (
                          <Switch
                            checked={displayValue === true || displayValue === 'true'}
                            onCheckedChange={(checked) =>
                              handleValueChange(setting.key, checked)
                            }
                          />
                        ) : setting.type === 'number' ? (
                          <Input
                            type="number"
                            value={String(displayValue)}
                            onChange={(e) =>
                              handleValueChange(setting.key, Number(e.target.value) || 0)
                            }
                            className="h-9 w-[200px] rounded-xl text-sm"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={String(displayValue)}
                            onChange={(e) => handleValueChange(setting.key, e.target.value)}
                            className="h-9 w-[200px] rounded-xl text-sm"
                          />
                        )}

                        <Button
                          variant={changed ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSaveSetting(setting.key, setting.value)}
                          disabled={updateSetting.isPending || !changed}
                          className="gap-1.5 rounded-xl shrink-0"
                        >
                          {updateSetting.isPending ? (
                            <LoadingSpinner size="sm" className="h-3.5 w-3.5" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Saqlash
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
