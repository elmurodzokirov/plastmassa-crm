export declare const PERMISSIONS: {
    readonly USERS: {
        readonly CREATE: "users:create";
        readonly READ: "users:read";
        readonly UPDATE: "users:update";
        readonly DELETE: "users:delete";
    };
    readonly CUSTOMERS: {
        readonly CREATE: "customers:create";
        readonly READ: "customers:read";
        readonly UPDATE: "customers:update";
        readonly DELETE: "customers:delete";
    };
    readonly PRODUCTS: {
        readonly CREATE: "products:create";
        readonly READ: "products:read";
        readonly UPDATE: "products:update";
        readonly DELETE: "products:delete";
    };
    readonly ORDERS: {
        readonly CREATE: "orders:create";
        readonly READ: "orders:read";
        readonly UPDATE: "orders:update";
        readonly DELETE: "orders:delete";
    };
    readonly STOCK: {
        readonly CREATE: "stock:create";
        readonly READ: "stock:read";
        readonly UPDATE: "stock:update";
    };
    readonly PRODUCTION: {
        readonly CREATE: "production:create";
        readonly READ: "production:read";
        readonly UPDATE: "production:update";
    };
    readonly ATTENDANCE: {
        readonly CREATE: "attendance:create";
        readonly READ: "attendance:read";
        readonly UPDATE: "attendance:update";
    };
    readonly PAYROLL: {
        readonly CREATE: "payroll:create";
        readonly READ: "payroll:read";
        readonly UPDATE: "payroll:update";
    };
    readonly FINANCE: {
        readonly CREATE: "finance:create";
        readonly READ: "finance:read";
        readonly UPDATE: "finance:update";
    };
    readonly RETURNS: {
        readonly CREATE: "returns:create";
        readonly READ: "returns:read";
        readonly UPDATE: "returns:update";
    };
    readonly REPORTS: {
        readonly READ: "reports:read";
    };
    readonly SETTINGS: {
        readonly READ: "settings:read";
        readonly UPDATE: "settings:update";
    };
};
export declare const ALL_PERMISSIONS: string[];
export declare const DEFAULT_ROLES: readonly [{
    readonly name: "Direktor";
    readonly description: "Korxona rahbari — barcha ruxsatlarga ega";
    readonly permissions: string[];
    readonly isSystem: true;
}, {
    readonly name: "Sotuv menejeri";
    readonly description: "Mijozlar bilan ishlash, buyurtma yaratish, narx belgilash";
    readonly permissions: readonly ["customers:create", "customers:read", "customers:update", "customers:delete", "orders:create", "orders:read", "orders:update", "orders:delete", "products:read", "stock:read", "returns:create", "returns:read", "reports:read"];
    readonly isSystem: false;
}, {
    readonly name: "Kassir";
    readonly description: "To'lov qabul qilish, xarajatlarni qayd etish, qarzlarni kuzatish";
    readonly permissions: readonly ["finance:create", "finance:read", "finance:update", "customers:read", "orders:read", "payroll:read", "reports:read"];
    readonly isSystem: false;
}, {
    readonly name: "Omborchi";
    readonly description: "Mahsulot kirim/chiqim, stock nazorat, lot boshqaruv";
    readonly permissions: readonly ["products:create", "products:read", "products:update", "products:delete", "stock:create", "stock:read", "stock:update", "production:read", "orders:read", "reports:read"];
    readonly isSystem: false;
}, {
    readonly name: "Ishlab chiqarish boshlig'i";
    readonly description: "Ishlab chiqarish jarayoni, ishchilar davomati";
    readonly permissions: readonly ["production:create", "production:read", "production:update", "products:read", "stock:read", "attendance:create", "attendance:read", "attendance:update", "reports:read"];
    readonly isSystem: false;
}, {
    readonly name: "Hisobchi";
    readonly description: "Ish haqi hisoblash, moliyaviy hisobotlar, avanslar";
    readonly permissions: readonly ["payroll:create", "payroll:read", "payroll:update", "finance:create", "finance:read", "finance:update", "attendance:read", "customers:read", "orders:read", "reports:read", "users:read"];
    readonly isSystem: false;
}, {
    readonly name: "Operator";
    readonly description: "Tsex ishchisi — o'z ishini kiritadi va davomatini ko'radi";
    readonly permissions: readonly ["production:create", "production:read", "attendance:read"];
    readonly isSystem: false;
}];
export declare const SALARY_TYPES: {
    readonly FIXED: "FIXED";
    readonly PIECE_RATE: "PIECE_RATE";
};
export declare const SALARY_TYPE_LABELS: Record<string, string>;
export declare const UNIT_TYPES: {
    readonly WEIGHT: "WEIGHT";
    readonly LENGTH: "LENGTH";
    readonly QUANTITY: "QUANTITY";
    readonly VOLUME: "VOLUME";
};
export declare const ORDER_STATUSES: {
    readonly PENDING: "PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly CANCELLED: "CANCELLED";
};
export declare const PAYMENT_TYPES: {
    readonly CASH: "CASH";
    readonly TRANSFER: "TRANSFER";
    readonly DEBT: "DEBT";
};
export declare const CURRENCY = "UZS";
