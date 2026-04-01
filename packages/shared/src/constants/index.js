"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY = exports.PAYMENT_TYPES = exports.ORDER_STATUSES = exports.UNIT_TYPES = exports.SALARY_TYPE_LABELS = exports.SALARY_TYPES = exports.DEFAULT_ROLES = exports.ALL_PERMISSIONS = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
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
};
exports.ALL_PERMISSIONS = Object.values(exports.PERMISSIONS).flatMap((p) => Object.values(p));
exports.DEFAULT_ROLES = [
    {
        name: 'Direktor',
        description: 'Korxona rahbari — barcha ruxsatlarga ega',
        permissions: exports.ALL_PERMISSIONS,
        isSystem: true,
    },
    {
        name: 'Sotuv menejeri',
        description: 'Mijozlar bilan ishlash, buyurtma yaratish, narx belgilash',
        permissions: [
            exports.PERMISSIONS.CUSTOMERS.CREATE,
            exports.PERMISSIONS.CUSTOMERS.READ,
            exports.PERMISSIONS.CUSTOMERS.UPDATE,
            exports.PERMISSIONS.CUSTOMERS.DELETE,
            exports.PERMISSIONS.ORDERS.CREATE,
            exports.PERMISSIONS.ORDERS.READ,
            exports.PERMISSIONS.ORDERS.UPDATE,
            exports.PERMISSIONS.ORDERS.DELETE,
            exports.PERMISSIONS.PRODUCTS.READ,
            exports.PERMISSIONS.STOCK.READ,
            exports.PERMISSIONS.RETURNS.CREATE,
            exports.PERMISSIONS.RETURNS.READ,
            exports.PERMISSIONS.REPORTS.READ,
        ],
        isSystem: false,
    },
    {
        name: 'Kassir',
        description: "To'lov qabul qilish, xarajatlarni qayd etish, qarzlarni kuzatish",
        permissions: [
            exports.PERMISSIONS.FINANCE.CREATE,
            exports.PERMISSIONS.FINANCE.READ,
            exports.PERMISSIONS.FINANCE.UPDATE,
            exports.PERMISSIONS.CUSTOMERS.READ,
            exports.PERMISSIONS.ORDERS.READ,
            exports.PERMISSIONS.PAYROLL.READ,
            exports.PERMISSIONS.REPORTS.READ,
        ],
        isSystem: false,
    },
    {
        name: 'Omborchi',
        description: 'Mahsulot kirim/chiqim, stock nazorat, lot boshqaruv',
        permissions: [
            exports.PERMISSIONS.PRODUCTS.CREATE,
            exports.PERMISSIONS.PRODUCTS.READ,
            exports.PERMISSIONS.PRODUCTS.UPDATE,
            exports.PERMISSIONS.PRODUCTS.DELETE,
            exports.PERMISSIONS.STOCK.CREATE,
            exports.PERMISSIONS.STOCK.READ,
            exports.PERMISSIONS.STOCK.UPDATE,
            exports.PERMISSIONS.PRODUCTION.READ,
            exports.PERMISSIONS.ORDERS.READ,
            exports.PERMISSIONS.REPORTS.READ,
        ],
        isSystem: false,
    },
    {
        name: 'Ishlab chiqarish boshlig\'i',
        description: 'Ishlab chiqarish jarayoni, ishchilar davomati',
        permissions: [
            exports.PERMISSIONS.PRODUCTION.CREATE,
            exports.PERMISSIONS.PRODUCTION.READ,
            exports.PERMISSIONS.PRODUCTION.UPDATE,
            exports.PERMISSIONS.PRODUCTS.READ,
            exports.PERMISSIONS.STOCK.READ,
            exports.PERMISSIONS.ATTENDANCE.CREATE,
            exports.PERMISSIONS.ATTENDANCE.READ,
            exports.PERMISSIONS.ATTENDANCE.UPDATE,
            exports.PERMISSIONS.REPORTS.READ,
        ],
        isSystem: false,
    },
    {
        name: 'Hisobchi',
        description: 'Ish haqi hisoblash, moliyaviy hisobotlar, avanslar',
        permissions: [
            exports.PERMISSIONS.PAYROLL.CREATE,
            exports.PERMISSIONS.PAYROLL.READ,
            exports.PERMISSIONS.PAYROLL.UPDATE,
            exports.PERMISSIONS.FINANCE.CREATE,
            exports.PERMISSIONS.FINANCE.READ,
            exports.PERMISSIONS.FINANCE.UPDATE,
            exports.PERMISSIONS.ATTENDANCE.READ,
            exports.PERMISSIONS.CUSTOMERS.READ,
            exports.PERMISSIONS.ORDERS.READ,
            exports.PERMISSIONS.REPORTS.READ,
            exports.PERMISSIONS.USERS.READ,
        ],
        isSystem: false,
    },
    {
        name: 'Operator',
        description: "Tsex ishchisi — o'z ishini kiritadi va davomatini ko'radi",
        permissions: [
            exports.PERMISSIONS.PRODUCTION.CREATE,
            exports.PERMISSIONS.PRODUCTION.READ,
            exports.PERMISSIONS.ATTENDANCE.READ,
        ],
        isSystem: false,
    },
];
exports.SALARY_TYPES = {
    FIXED: 'FIXED',
    PIECE_RATE: 'PIECE_RATE',
};
exports.SALARY_TYPE_LABELS = {
    FIXED: 'Oylikchi (Fixed)',
    PIECE_RATE: 'Ishbaychi (Piece-rate)',
};
exports.UNIT_TYPES = {
    WEIGHT: 'WEIGHT',
    LENGTH: 'LENGTH',
    QUANTITY: 'QUANTITY',
    VOLUME: 'VOLUME',
};
exports.ORDER_STATUSES = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
};
exports.PAYMENT_TYPES = {
    CASH: 'CASH',
    TRANSFER: 'TRANSFER',
    DEBT: 'DEBT',
};
exports.CURRENCY = 'UZS';
//# sourceMappingURL=index.js.map