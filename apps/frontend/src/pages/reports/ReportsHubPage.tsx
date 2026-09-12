import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Warehouse,
  UserCog,
  Wallet,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface DepartmentCard {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

const DEPARTMENTS: DepartmentCard[] = [
  {
    key: 'sotuv',
    name: 'Sotuv hisoboti',
    description: "Davr bo'yicha sotuvlar, top mahsulot va mijozlar",
    icon: ShoppingCart,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20',
  },
  {
    key: 'ombor',
    name: 'Ombor hisoboti',
    description: 'Mahsulotlar zaxirasi va ishlab chiqarish hisobotlari',
    icon: Warehouse,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/20',
  },
  {
    key: 'kadrlar',
    name: 'Kadrlar hisoboti',
    description: 'Xodimlar davomati bo\'yicha hisobot',
    icon: UserCog,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/20',
  },
  {
    key: 'moliya',
    name: 'Moliya hisoboti',
    description: "Kassa kitobi, xarajatlar, to'lovlar va boshqa moliyaviy hisobotlar",
    icon: Wallet,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/20',
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Hisobotlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hisobotni ko'rish uchun bo'limni tanlang
        </p>
      </motion.div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DEPARTMENTS.map((dept, idx) => (
          <motion.div
            key={dept.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 + idx * 0.05 }}
          >
            <Link
              to={`/reports/${dept.key}`}
              className="flex items-center gap-4 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 hover:border-indigo-400/50 hover:bg-accent/40 transition-colors"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${dept.iconBg}`}
              >
                <dept.icon className={`h-6 w-6 ${dept.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">{dept.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {dept.description}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
