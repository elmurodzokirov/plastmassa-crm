// Role
export interface RoleDoc {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// User
export interface User {
  _id: string;
  fullName: string;
  username: string;
  password?: string;
  phone: string;
  role: string | RoleDoc;
  salaryType: 'FIXED' | 'PIECE_RATE';
  baseSalary: number;
  telegramChatId?: string;
  isActive: boolean;
  inactiveReason?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SalaryType = 'FIXED' | 'PIECE_RATE';

export interface LoginDto {
  username: string;
  password: string;
}

export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
}

export interface TokenPayload {
  sub: string;
  phone: string;
  permissions: string[];
  roleName: string;
}

// Unit
export interface Unit {
  _id: string;
  name: string;
  symbol: string;
  type: UnitType;
  createdAt: string;
  updatedAt: string;
}

export type UnitType = 'WEIGHT' | 'LENGTH' | 'QUANTITY' | 'VOLUME';

export interface UnitConversion {
  _id: string;
  fromUnit: string | Unit;
  toUnit: string | Unit;
  factor: number;
}

// Customer (Sprint 1)
export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  currentDebt: number;
  debtLimit: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product (Sprint 2)
export interface Product {
  _id: string;
  name: string;
  imageUrl?: string;
  baseUnit: string | Unit;
  salesUnits: SalesUnit[];
  currentStock: number;
  costPrice: number;
  costPerUnit: number;
  price: number;
  pieceRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesUnit {
  unit: string | Unit;
  conversionFactor: number;
  price: number;
}

// Order (Sprint 3)
export interface Order {
  _id: string;
  orderNumber: string;
  customer: string | Customer;
  items: OrderItem[];
  totalAmount: number;
  initialPaidAmount: number;
  paidAmount: number;
  totalCost: number;
  grossProfit: number;
  status: OrderStatus;
  paymentType: PaymentType;
  dueDate?: string;
  invoiceNumber?: string;
  deliveredTo?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  notes?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product: string | Product;
  productName: string;
  unit: string | Unit;
  unitName: string;
  quantity: number;
  baseQuantity: number;
  baseUnit: string | Unit;
  baseUnitName: string;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  price: number;
  total: number;
  costPerUnit: number;
  totalCost: number;
  lotConsumptions: LotConsumption[];
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentType = 'CASH' | 'TRANSFER' | 'DEBT';

// Payment (Sprint 3)
export interface Payment {
  _id: string;
  customer: string | Customer;
  order?: string | Order;
  amount: number;
  type: PaymentMethodType;
  notes?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethodType = 'CASH' | 'TRANSFER' | 'CARD';

export interface LotConsumption {
  lot: string;
  lotNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

// Stock Movement (Sprint 2)
export interface StockMovement {
  _id: string;
  type: StockMovementType;
  product?: string | Product;
  quantity: number;
  unit: string | Unit;
  reason: string;
  reference?: string;
  referenceModel?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

// ProductLot (Sprint 4)
export type ProductLotSource = 'PURCHASE' | 'PRODUCTION';

export interface ProductLot {
  _id: string;
  product: string | Product;
  lotNumber: string;
  quantity: number;
  unit: string | Unit;
  unitCost: number;
  totalCost: number;
  quantityRemaining: number;
  source: ProductLotSource;
  productionLog?: string | ProductionLog;
  purchaseQuantity?: number;
  purchaseUnit?: string | Unit;
  supplier?: string;
  notes?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

// Production (Sprint 5)
export interface ProductionLog {
  _id: string;
  product: string | Product;
  productName: string;
  unit: string | Unit;
  unitName: string;
  date: string;
  quantityProduced: number;
  totalMaterialCost: number;
  costPerUnitProduced: number;
  earnedAmount: number;
  pieceRateAmount: number;
  status: 'PENDING' | 'APPROVED';
  approvedBy?: string | User;
  approvedAt?: string;
  notes?: string;
  worker: string | User;
  createdAt: string;
  updatedAt: string;
}

// Attendance (Sprint 6)
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';

export interface Attendance {
  _id: string;
  user: string | User;
  date: string;
  status: AttendanceStatus;
  hoursWorked: number;
  overtimeHours: number;
  notes?: string;
  markedBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
}

export interface MonthlyAttendanceReport {
  records: Attendance[];
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    leaveDays: number;
    totalHoursWorked: number;
    totalOvertimeHours: number;
  };
}

// Advance (Sprint 7)
export type AdvanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Advance {
  _id: string;
  user: string | User;
  amount: number;
  date: string;
  notes?: string;
  status: AdvanceStatus;
  approvedBy?: string | User;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

// Payroll (Sprint 7)
export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID';

export interface Payroll {
  _id: string;
  user: string | User;
  year: number;
  month: number;
  baseSalary: number;
  salaryType: 'FIXED' | 'PIECE_RATE';
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHoursWorked: number;
  overtimeHours: number;
  overtimeAmount: number;
  deductions: number;
  advancesTotal: number;
  bonus: number;
  productionEarnings: number;
  previousBalance: number;
  totalEarned: number;
  paidAmount: number;
  remainingBalance: number;
  netSalary: number;
  status: PayrollStatus;
  notes?: string;
  calculatedBy: string | User;
  createdAt: string;
  updatedAt: string;
}

// Expense (Sprint 8)
export interface Expense {
  _id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paidBy?: User;
  paymentMethod: 'cash' | 'bank' | 'card';
  notes?: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

// Finance (Sprint 8)
export interface CashFlow {
  income: number;
  expenses: number;
  net: number;
  period: { from: string; to: string };
}

export interface MonthlyCashFlow {
  year: number;
  months: Array<{ month: number; income: number; expenses: number; net: number }>;
}

export interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalDebt: number;
  netProfit: number;
}

export interface ProfitAndLoss {
  revenue: { total: number; byProduct: Array<{ name: string; total: number }> };
  expenses: { total: number; byCategory: Array<{ category: string; total: number }> };
  grossProfit: number;
  netProfit: number;
  period: { from: string; to: string };
}

// Dashboard (Sprint 9)
export interface DashboardStats {
  totalCustomers: number;
  activeOrders: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  totalDebt: number;
  productionToday: number;
  employeeCount: number;
  lowStockProducts: number;
}

// Sales Report (Sprint 9)
export interface SalesReport {
  totalOrders: number;
  totalAmount: number;
  averageOrderAmount: number;
  breakdown: Array<{ period: string; orderCount: number; totalAmount: number }>;
  topProducts: Array<{ productName: string; quantity: number; totalAmount: number }>;
  topCustomers: Array<{ customerName: string; orderCount: number; totalAmount: number }>;
}

// Production Report (Sprint 9)
export interface ProductionReport {
  totalProduced: number;
  totalEarned: number;
  byProduct: Array<{ productName: string; totalQuantity: number; totalEarned: number }>;
  byWorker: Array<{ workerName: string; totalQuantity: number; totalEarned: number }>;
  dailyBreakdown: Array<{ date: string; totalQuantity: number }>;
}

// Stock Report (Sprint 9)
export interface StockReport {
  products: Array<{ _id: string; name: string; currentStock: number; price: number }>;
  lowStockAlerts: Array<{ name: string; currentStock: number; minStock: number }>;
}

// Attendance Report (Sprint 9)
export interface AttendanceReport {
  byEmployee: Array<{
    fullName: string;
    role: string;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
    overtimeHours: number;
  }>;
  summary: {
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    averageAttendance: number;
  };
}

// Setting (Sprint 9)
export interface Setting {
  _id: string;
  key: string;
  value: any;
  label: string;
  group: string;
  type: 'text' | 'number' | 'boolean' | 'json';
  createdAt: string;
  updatedAt: string;
}

// Customer Price
export interface CustomerPrice {
  _id: string;
  customer: string | Customer;
  product: string | Product;
  price: number;
  createdAt: string;
  updatedAt: string;
}

// Return
export type ReturnStatus = 'PENDING' | 'APPROVED';

export interface ReturnItem {
  product: string | Product;
  productName: string;
  unit: string | Unit;
  unitName: string;
  quantity: number;
  baseQuantity: number;
  baseUnit: string | Unit;
  baseUnitName: string;
  price: number;
  total: number;
  lotConsumptions: LotConsumption[];
}

export interface Return {
  _id: string;
  order: string | Order;
  items: ReturnItem[];
  reason: string;
  totalAmount: number;
  status: ReturnStatus;
  approvedBy?: string | User;
  approvedAt?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
