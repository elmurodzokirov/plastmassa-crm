export const PERMISSIONS = {
  USERS: { CREATE: 'users:create', READ: 'users:read', UPDATE: 'users:update', DELETE: 'users:delete' },
  CUSTOMERS: { CREATE: 'customers:create', READ: 'customers:read', UPDATE: 'customers:update', DELETE: 'customers:delete' },
  PRODUCTS: { CREATE: 'products:create', READ: 'products:read', UPDATE: 'products:update', DELETE: 'products:delete' },

  ORDERS: { CREATE: 'orders:create', READ: 'orders:read', UPDATE: 'orders:update', DELETE: 'orders:delete' },
  STOCK: { CREATE: 'stock:create', READ: 'stock:read', UPDATE: 'stock:update' },
  PRODUCTION: { CREATE: 'production:create', READ: 'production:read', UPDATE: 'production:update' },
  ATTENDANCE: { CREATE: 'attendance:create', READ: 'attendance:read', UPDATE: 'attendance:update' },
  PAYROLL: { CREATE: 'payroll:create', READ: 'payroll:read', UPDATE: 'payroll:update' },
  FINANCE: { CREATE: 'finance:create', READ: 'finance:read', UPDATE: 'finance:update' },
  RETURNS: { CREATE: 'returns:create', READ: 'returns:read', UPDATE: 'returns:update' },
  REPORTS: { READ: 'reports:read' },
  SETTINGS: { READ: 'settings:read', UPDATE: 'settings:update' },
} as const;

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).flatMap((p) => Object.values(p));

export const DEFAULT_ROLES = [
  {
    name: 'Direktor',
    description: 'Korxona rahbari — barcha ruxsatlarga ega',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  {
    name: 'Sotuv menejeri',
    description: 'Mijozlar bilan ishlash, buyurtma yaratish, narx belgilash',
    permissions: [
      PERMISSIONS.CUSTOMERS.CREATE,
      PERMISSIONS.CUSTOMERS.READ,
      PERMISSIONS.CUSTOMERS.UPDATE,
      PERMISSIONS.CUSTOMERS.DELETE,
      PERMISSIONS.ORDERS.CREATE,
      PERMISSIONS.ORDERS.READ,
      PERMISSIONS.ORDERS.UPDATE,
      PERMISSIONS.ORDERS.DELETE,
      PERMISSIONS.PRODUCTS.READ,
      PERMISSIONS.STOCK.READ,
      PERMISSIONS.RETURNS.CREATE,
      PERMISSIONS.RETURNS.READ,
      PERMISSIONS.REPORTS.READ,
    ],
    isSystem: false,
  },
  {
    name: 'Kassir',
    description: "To'lov qabul qilish, xarajatlarni qayd etish, qarzlarni kuzatish",
    permissions: [
      PERMISSIONS.FINANCE.CREATE,
      PERMISSIONS.FINANCE.READ,
      PERMISSIONS.FINANCE.UPDATE,
      PERMISSIONS.CUSTOMERS.READ,
      PERMISSIONS.ORDERS.READ,
      PERMISSIONS.PAYROLL.READ,
      PERMISSIONS.REPORTS.READ,
    ],
    isSystem: false,
  },
  {
    name: 'Omborchi',
    description: 'Mahsulot kirim/chiqim, stock nazorat, lot boshqaruv',
    permissions: [
      PERMISSIONS.PRODUCTS.CREATE,
      PERMISSIONS.PRODUCTS.READ,
      PERMISSIONS.PRODUCTS.UPDATE,
      PERMISSIONS.PRODUCTS.DELETE,
      PERMISSIONS.STOCK.CREATE,
      PERMISSIONS.STOCK.READ,
      PERMISSIONS.STOCK.UPDATE,
      PERMISSIONS.PRODUCTION.READ,
      PERMISSIONS.ORDERS.READ,
      PERMISSIONS.REPORTS.READ,
    ],
    isSystem: false,
  },
  {
    name: 'Ishlab chiqarish boshlig\'i',
    description: 'Ishlab chiqarish jarayoni, ishchilar davomati',
    permissions: [
      PERMISSIONS.PRODUCTION.CREATE,
      PERMISSIONS.PRODUCTION.READ,
      PERMISSIONS.PRODUCTION.UPDATE,
      PERMISSIONS.PRODUCTS.READ,
      PERMISSIONS.STOCK.READ,
      PERMISSIONS.ATTENDANCE.CREATE,
      PERMISSIONS.ATTENDANCE.READ,
      PERMISSIONS.ATTENDANCE.UPDATE,
      PERMISSIONS.REPORTS.READ,
    ],
    isSystem: false,
  },
  {
    name: 'Hisobchi',
    description: 'Ish haqi hisoblash, moliyaviy hisobotlar, avanslar',
    permissions: [
      PERMISSIONS.PAYROLL.CREATE,
      PERMISSIONS.PAYROLL.READ,
      PERMISSIONS.PAYROLL.UPDATE,
      PERMISSIONS.FINANCE.CREATE,
      PERMISSIONS.FINANCE.READ,
      PERMISSIONS.FINANCE.UPDATE,
      PERMISSIONS.ATTENDANCE.READ,
      PERMISSIONS.CUSTOMERS.READ,
      PERMISSIONS.ORDERS.READ,
      PERMISSIONS.REPORTS.READ,
      PERMISSIONS.USERS.READ,
    ],
    isSystem: false,
  },
  {
    name: 'Operator',
    description: "Tsex ishchisi — o'z ishini kiritadi va davomatini ko'radi",
    permissions: [
      PERMISSIONS.PRODUCTION.CREATE,
      PERMISSIONS.PRODUCTION.READ,
      PERMISSIONS.ATTENDANCE.READ,
    ],
    isSystem: false,
  },
] as const;

export const SALARY_TYPES = {
  FIXED: 'FIXED',
  PIECE_RATE: 'PIECE_RATE',
} as const;

export const SALARY_TYPE_LABELS: Record<string, string> = {
  FIXED: 'Oylikchi (Fixed)',
  PIECE_RATE: 'Ishbaychi (Piece-rate)',
};

export const UNIT_TYPES = {
  WEIGHT: 'WEIGHT',
  LENGTH: 'LENGTH',
  QUANTITY: 'QUANTITY',
  VOLUME: 'VOLUME',
} as const;

export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

export const PAYMENT_TYPES = {
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
  DEBT: 'DEBT',
} as const;

export const CURRENCY = 'UZS';
