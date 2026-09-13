import { useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const SUBJECT_LABELS: Record<string, string> = {
  users: 'Foydalanuvchilar',
  customers: 'Mijozlar',
  products: 'Mahsulotlar',
  materials: 'Homashyolar',
  orders: 'Buyurtmalar',
  returns: 'Qaytarishlar',
  stock: 'Ombor',
  production: 'Ishlab chiqarish',
  attendance: 'Davomat',
  payroll: 'Maosh',
  finance: 'Moliya',
  reports: 'Hisobotlar',
  settings: 'Sozlamalar',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Yaratish',
  read: "Ko'rish",
  update: 'Tahrirlash',
  delete: "O'chirish",
};

const ALL_ACTIONS = ['create', 'read', 'update', 'delete'] as const;

interface SubjectGroup {
  label: string;
  subjects: string[];
}

const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    label: 'Asosiy',
    subjects: ['users', 'customers', 'orders', 'returns'],
  },
  {
    label: 'Ombor va Ishlab chiqarish',
    subjects: ['materials', 'products', 'stock', 'production'],
  },
  {
    label: 'Moliya va HR',
    subjects: ['attendance', 'payroll', 'finance'],
  },
  {
    label: 'Tizim',
    subjects: ['reports', 'settings'],
  },
];

// Which actions are available for each subject
const SUBJECT_ACTIONS: Record<string, string[]> = {
  users: ['create', 'read', 'update', 'delete'],
  customers: ['create', 'read', 'update', 'delete'],
  products: ['create', 'read', 'update', 'delete'],
  materials: ['create', 'read', 'update', 'delete'],
  orders: ['create', 'read', 'update', 'delete'],
  returns: ['create', 'read', 'update'],
  stock: ['create', 'read', 'update'],
  production: ['create', 'read', 'update'],
  attendance: ['create', 'read', 'update'],
  payroll: ['create', 'read', 'update'],
  finance: ['create', 'read', 'update'],
  reports: ['read'],
  settings: ['read', 'update'],
};

interface PermissionMatrixProps {
  value: string[];
  onChange: (permissions: string[]) => void;
}

export function PermissionMatrix({ value, onChange }: PermissionMatrixProps) {
  const hasPermission = useCallback(
    (subject: string, action: string) => {
      return value.includes(`${subject}:${action}`);
    },
    [value],
  );

  const hasAllActions = useCallback(
    (subject: string) => {
      const available = SUBJECT_ACTIONS[subject] || [];
      return available.every((a) => value.includes(`${subject}:${a}`));
    },
    [value],
  );

  const hasSomeActions = useCallback(
    (subject: string) => {
      const available = SUBJECT_ACTIONS[subject] || [];
      return available.some((a) => value.includes(`${subject}:${a}`));
    },
    [value],
  );

  const togglePermission = useCallback(
    (subject: string, action: string, checked: boolean) => {
      const perm = `${subject}:${action}`;
      if (checked) {
        onChange([...value, perm]);
      } else {
        onChange(value.filter((p) => p !== perm));
      }
    },
    [value, onChange],
  );

  const toggleAll = useCallback(
    (subject: string) => {
      const available = SUBJECT_ACTIONS[subject] || [];
      const allSelected = available.every((a) => value.includes(`${subject}:${a}`));

      if (allSelected) {
        // remove all
        onChange(value.filter((p) => !p.startsWith(`${subject}:`)));
      } else {
        // add all missing
        const perms = available.map((a) => `${subject}:${a}`);
        const others = value.filter((p) => !p.startsWith(`${subject}:`));
        onChange([...others, ...perms]);
      }
    },
    [value, onChange],
  );

  return (
    <div className="space-y-4">
      {SUBJECT_GROUPS.map((group) => (
        <div key={group.label}>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
            {group.label}
          </h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-foreground w-[180px]">
                    Resurs
                  </th>
                  {ALL_ACTIONS.map((action) => (
                    <th
                      key={action}
                      className="text-center px-2 py-2 font-medium text-foreground"
                    >
                      {ACTION_LABELS[action]}
                    </th>
                  ))}
                  <th className="text-center px-2 py-2 font-medium text-amber-400">
                    Hammasi
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.subjects.map((subject) => {
                  const available = SUBJECT_ACTIONS[subject] || [];
                  const allSelected = hasAllActions(subject);
                  const someSelected = hasSomeActions(subject);

                  return (
                    <tr
                      key={subject}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {SUBJECT_LABELS[subject] ?? subject}
                      </td>
                      {ALL_ACTIONS.map((action) => {
                        const isAvailable = available.includes(action);
                        const checked = hasPermission(subject, action);
                        return (
                          <td key={action} className="text-center px-2 py-2">
                            {isAvailable ? (
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) =>
                                  togglePermission(subject, action, c === true)
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-2">
                        <Checkbox
                          checked={allSelected}
                          className={cn(
                            'border-amber-500',
                            'data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600',
                            !allSelected && someSelected && 'data-[state=unchecked]:bg-amber-500/30',
                          )}
                          onCheckedChange={() => toggleAll(subject)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
