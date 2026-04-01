import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Schemas ────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String },
    phone: { type: String, required: true, unique: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    salaryType: { type: String, enum: ['FIXED', 'PIECE_RATE'], default: 'FIXED' },
    telegramChatId: { type: String, sparse: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const UnitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    type: {
      type: String,
      enum: ['WEIGHT', 'LENGTH', 'QUANTITY', 'VOLUME'],
      required: true,
    },
  },
  { timestamps: true },
);

const UnitConversionSchema = new mongoose.Schema(
  {
    fromUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    toUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    factor: { type: Number, required: true },
  },
  { timestamps: true },
);

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    currentDebt: { type: Number, default: 0 },
    debtLimit: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    baseUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    salesUnits: {
      type: [
        {
          unit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
          },
          conversionFactor: { type: Number, required: true },
          price: { type: Number, required: true },
        },
      ],
      default: [],
    },
    recipe: {
      type: [
        {
          material: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Material',
            required: true,
          },
          materialName: { type: String, required: true },
          quantityPerUnit: { type: Number, required: true, min: 0 },
          unit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
          },
          unitName: { type: String, required: true },
        },
      ],
      default: [],
    },
    currentStock: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    price: { type: Number, required: true },
    pieceRate: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const StockMovementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['IN', 'OUT', 'ADJUSTMENT'],
    },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    reference: { type: String },
    referenceModel: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const ProductLotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    lotNumber: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    quantityRemaining: { type: Number, required: true, min: 0 },
    source: {
      type: String,
      required: true,
      enum: ['PURCHASE', 'PRODUCTION'],
      default: 'PURCHASE',
    },
    productionLog: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionLog' },
    purchaseQuantity: { type: Number },
    purchaseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    supplier: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: { type: String, required: true },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true,
  },
  unitName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.001 },
  price: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
      default: 'PENDING',
    },
    paymentType: {
      type: String,
      required: true,
      enum: ['CASH', 'TRANSFER', 'DEBT'],
    },
    notes: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const PaymentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      required: true,
      enum: ['CASH', 'TRANSFER', 'CARD'],
    },
    notes: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const ProductionLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: { type: String, required: true },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    unitName: { type: String, required: true },
    date: { type: Date, required: true },
    quantityProduced: { type: Number, required: true, min: 0 },
    materialsUsed: {
      type: [
        {
          material: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Material',
            required: true,
          },
          materialName: { type: String, required: true },
          quantity: { type: Number, required: true, min: 0 },
          unit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
          },
          unitName: { type: String, required: true },
          cost: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    totalMaterialCost: { type: Number, default: 0 },
    costPerUnitProduced: { type: Number, default: 0 },
    earnedAmount: { type: Number, default: 0 },
    pieceRateAmount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const AttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'],
      default: 'PRESENT',
    },
    hoursWorked: { type: Number, default: 0, min: 0, max: 24 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const AdvanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const PayrollSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    baseSalary: { type: Number, default: 0 },
    salaryType: { type: String, enum: ['FIXED', 'PIECE_RATE'], default: 'FIXED' },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    advancesTotal: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    productionEarnings: { type: Number, default: 0 },
    previousBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'CONFIRMED', 'PAID'],
      default: 'DRAFT',
    },
    notes: { type: String, trim: true },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const ExpenseSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'bank', 'card'],
      default: 'cash',
    },
    notes: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    label: { type: String, required: true, trim: true },
    group: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'number', 'boolean', 'json'],
      default: 'text',
    },
  },
  { timestamps: true },
);

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ─── Models ─────────────────────────────────────────────────────────────────

const RoleModel = mongoose.model('Role', RoleSchema);
const UserModel = mongoose.model('User', UserSchema);
const UnitModel = mongoose.model('Unit', UnitSchema);
const UnitConversionModel = mongoose.model('UnitConversion', UnitConversionSchema);
const CustomerModel = mongoose.model('Customer', CustomerSchema);
const ProductModel = mongoose.model('Product', ProductSchema);
const StockMovementModel = mongoose.model('StockMovement', StockMovementSchema);
const ProductLotModel = mongoose.model('ProductLot', ProductLotSchema);
const OrderModel = mongoose.model('Order', OrderSchema);
const PaymentModel = mongoose.model('Payment', PaymentSchema);
const ProductionLogModel = mongoose.model('ProductionLog', ProductionLogSchema);
const AttendanceModel = mongoose.model('Attendance', AttendanceSchema);
const AdvanceModel = mongoose.model('Advance', AdvanceSchema);
const PayrollModel = mongoose.model('Payroll', PayrollSchema);
const ExpenseModel = mongoose.model('Expense', ExpenseSchema);
const SettingModel = mongoose.model('Setting', SettingSchema);

// ─── Helper ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

// ─── Seed Function ──────────────────────────────────────────────────────────

async function seed() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/plastmassa_crm';

  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection.db is undefined');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DROP ALL DATA
  // ═══════════════════════════════════════════════════════════════════════
  console.log('══ DROPPING ALL DATA ══');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.dropCollection(col.name);
    console.log(`  ✗ Dropped collection: ${col.name}`);
  }
  console.log('  All collections dropped.\n');

  // ── Maps for referencing IDs ──────────────────────────────────────────
  const unitMap: Record<string, mongoose.Types.ObjectId> = {};
  const userMap: Record<string, mongoose.Types.ObjectId> = {};
  const customerMap: Record<string, mongoose.Types.ObjectId> = {};
  const productMap: Record<string, mongoose.Types.ObjectId> = {};
  const orderMap: Record<string, mongoose.Types.ObjectId> = {};
  const prodLogMap: Record<string, mongoose.Types.ObjectId> = {};

  // ═══════════════════════════════════════════════════════════════════════
  // 1. UNITS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('── Units ──');

  const defaultUnits = [
    { name: 'Kilogramm', symbol: 'kg', type: 'WEIGHT' },
    { name: 'Gramm', symbol: 'g', type: 'WEIGHT' },
    { name: 'Tonna', symbol: 'tonna', type: 'WEIGHT' },
    { name: 'Metr', symbol: 'metr', type: 'LENGTH' },
    { name: 'Santimetr', symbol: 'sm', type: 'LENGTH' },
    { name: 'Dona', symbol: 'dona', type: 'QUANTITY' },
    { name: 'Litr', symbol: 'litr', type: 'VOLUME' },
    { name: 'Millilitr', symbol: 'ml', type: 'VOLUME' },
  ];

  for (const u of defaultUnits) {
    const created = await UnitModel.create(u);
    unitMap[u.symbol] = created._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${u.name} (${u.symbol})`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. UNIT CONVERSIONS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Unit Conversions ──');

  const defaultConversions = [
    { from: 'kg', to: 'g', factor: 1000 },
    { from: 'tonna', to: 'kg', factor: 1000 },
    { from: 'metr', to: 'sm', factor: 100 },
    { from: 'litr', to: 'ml', factor: 1000 },
  ];

  for (const c of defaultConversions) {
    await UnitConversionModel.create({
      fromUnit: unitMap[c.from],
      toUnit: unitMap[c.to],
      factor: c.factor,
    });
    console.log(`  ✓ ${c.from} → ${c.to} (×${c.factor})`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2.5. ROLES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Roles ──');

  const roleMap: Record<string, mongoose.Types.ObjectId> = {};

  const ALL_PERMISSIONS = [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'customers:create', 'customers:read', 'customers:update', 'customers:delete',
    'products:create', 'products:read', 'products:update', 'products:delete',
    'orders:create', 'orders:read', 'orders:update', 'orders:delete',
    'stock:create', 'stock:read', 'stock:update',
    'production:create', 'production:read', 'production:update',
    'attendance:create', 'attendance:read', 'attendance:update',
    'payroll:create', 'payroll:read', 'payroll:update',
    'finance:create', 'finance:read', 'finance:update',
    'reports:read',
    'settings:read', 'settings:update',
  ];

  const defaultRoles = [
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
        'customers:create', 'customers:read', 'customers:update', 'customers:delete',
        'orders:create', 'orders:read', 'orders:update', 'orders:delete',
        'products:read', 'stock:read', 'reports:read',
      ],
      isSystem: false,
    },
    {
      name: 'Kassir',
      description: "To'lov qabul qilish, xarajatlarni qayd etish, qarzlarni kuzatish",
      permissions: [
        'finance:create', 'finance:read', 'finance:update',
        'customers:read', 'orders:read', 'payroll:read', 'reports:read',
      ],
      isSystem: false,
    },
    {
      name: 'Omborchi',
      description: 'Mahsulot kirim/chiqim, stock nazorat, lot boshqaruv',
      permissions: [
        'products:create', 'products:read', 'products:update', 'products:delete',
        'stock:create', 'stock:read', 'stock:update',
        'production:read', 'orders:read', 'reports:read',
      ],
      isSystem: false,
    },
    {
      name: 'Ishlab chiqarish boshlig\'i',
      description: 'Ishlab chiqarish jarayoni, ishchilar davomati',
      permissions: [
        'production:create', 'production:read', 'production:update',
        'products:read', 'stock:read',
        'attendance:create', 'attendance:read', 'attendance:update',
        'reports:read',
      ],
      isSystem: false,
    },
    {
      name: 'Hisobchi',
      description: 'Ish haqi hisoblash, moliyaviy hisobotlar, avanslar',
      permissions: [
        'payroll:create', 'payroll:read', 'payroll:update',
        'finance:create', 'finance:read', 'finance:update',
        'attendance:read', 'customers:read', 'orders:read',
        'reports:read', 'users:read',
      ],
      isSystem: false,
    },
    {
      name: 'Operator',
      description: "Tsex ishchisi — faqat o'z ishlab chiqarishi va davomatini ko'radi",
      permissions: ['production:read', 'attendance:read'],
      isSystem: false,
    },
  ];

  for (const r of defaultRoles) {
    const created = await RoleModel.create(r);
    roleMap[r.name] = created._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${r.name} (${r.permissions.length} ruxsatlar)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. USERS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Users ──');

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFullName = process.env.ADMIN_FULLNAME || 'Administrator';

  const allUsers = [
    { username: adminUsername, fullName: adminFullName, role: roleMap['Direktor'], phone: '+998900000000', salaryType: 'FIXED' },
    { username: 'sales1', fullName: 'Aziz Karimov', role: roleMap['Sotuv menejeri'], phone: '+998901111111', salaryType: 'FIXED' },
    { username: 'operator1', fullName: 'Bobur Toshmatov', role: roleMap['Operator'], phone: '+998902222222', salaryType: 'PIECE_RATE' },
    { username: 'operator2', fullName: 'Jasur Mirzayev', role: roleMap['Operator'], phone: '+998902222233', salaryType: 'PIECE_RATE' },
    { username: 'warehouse1', fullName: 'Sardor Aliyev', role: roleMap['Omborchi'], phone: '+998903333333', salaryType: 'FIXED' },
    { username: 'cashier1', fullName: 'Nilufar Rahimova', role: roleMap['Kassir'], phone: '+998904444444', salaryType: 'FIXED' },
    { username: 'production1', fullName: 'Rustam Ergashev', role: roleMap['Ishlab chiqarish boshlig\'i'], phone: '+998905555555', salaryType: 'FIXED' },
    { username: 'accountant1', fullName: 'Madina Yusupova', role: roleMap['Hisobchi'], phone: '+998906666666', salaryType: 'FIXED' },
  ];

  for (const u of allUsers) {
    const salt = await bcrypt.genSalt(10);
    const pw = u.username === adminUsername ? adminPassword : 'password123';
    const hashedPassword = await bcrypt.hash(pw, salt);
    const created = await UserModel.create({
      ...u,
      password: hashedPassword,
      isActive: true,
    });
    userMap[u.username] = created._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${u.fullName}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Customers ──');

  const defaultCustomers = [
    { name: 'Toshkent Plastik OOO', phone: '+998901234567', address: 'Toshkent sh., Chilonzor t., 15-uy', debtLimit: 50_000_000 },
    { name: 'Andijon Savdo OOO', phone: '+998932345678', address: 'Andijon sh., Navoiy ko\'chasi, 42', debtLimit: 30_000_000 },
    { name: 'Samarqand Qurilish OOO', phone: '+998943456789', address: 'Samarqand sh., Registon ko\'chasi, 8', debtLimit: 20_000_000 },
    { name: 'Buxoro Polimer OOO', phone: '+998914567890', address: 'Buxoro sh., Mustaqillik ko\'chasi, 55', debtLimit: 15_000_000 },
    { name: 'Namangan Market', phone: '+998945678901', address: 'Namangan sh., Markaziy bozor', debtLimit: 10_000_000 },
    { name: 'Farg\'ona Plastik', phone: '+998736789012', address: 'Farg\'ona sh., Sanoat ko\'chasi, 12', debtLimit: 25_000_000 },
    { name: 'Xorazm Savdo', phone: '+998917890123', address: 'Urganch sh., Buyuk turon, 3', debtLimit: 8_000_000 },
  ];

  for (const c of defaultCustomers) {
    const created = await CustomerModel.create({ ...c, currentDebt: 0, isActive: true });
    customerMap[c.name] = created._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${c.name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. PRODUCTS (with recipes!)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Products ──');

  const defaultProducts = [
    { name: 'Plastik chelak 10L', baseUnit: 'dona', price: 25_000, pieceRate: 500, currentStock: 800, costPerUnit: 15_200 },
    { name: 'Plastik chelak 20L', baseUnit: 'dona', price: 40_000, pieceRate: 800, currentStock: 350, costPerUnit: 24_500 },
    { name: 'Plastik truba 50mm', baseUnit: 'metr', price: 15_000, pieceRate: 300, currentStock: 2000, costPerUnit: 8_400 },
    { name: 'Plastik truba 100mm', baseUnit: 'metr', price: 28_000, pieceRate: 500, currentStock: 1000, costPerUnit: 16_500 },
    { name: 'Plastik stul', baseUnit: 'dona', price: 85_000, pieceRate: 2000, currentStock: 150, costPerUnit: 52_000 },
    { name: 'Plastik stol', baseUnit: 'dona', price: 150_000, pieceRate: 3500, currentStock: 80, costPerUnit: 92_000 },
    { name: 'PE paket (kichik)', baseUnit: 'dona', price: 300, pieceRate: 5, currentStock: 20000, costPerUnit: 120 },
    { name: 'PE paket (katta)', baseUnit: 'dona', price: 500, pieceRate: 8, currentStock: 15000, costPerUnit: 200 },
    { name: 'Plastik quvur mufta 50mm', baseUnit: 'dona', price: 5_000, pieceRate: 150, currentStock: 500, costPerUnit: 2_800 },
    { name: 'Polistirol qadoq (konteyner)', baseUnit: 'dona', price: 1_500, pieceRate: 30, currentStock: 5000, costPerUnit: 750 },
  ];

  for (const p of defaultProducts) {
    const created = await ProductModel.create({
      name: p.name,
      baseUnit: unitMap[p.baseUnit],
      price: p.price,
      pieceRate: p.pieceRate || 0,
      currentStock: p.currentStock,
      costPerUnit: p.costPerUnit,
      recipe: [],
      salesUnits: [],
      isActive: true,
    });
    productMap[p.name] = created._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${p.name} (${p.currentStock} ${p.baseUnit})`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 9. PRODUCTION LOGS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Production Logs ──');

  const defaultProductionLogs = [
    { key: 'log-1', product: 'Plastik chelak 10L', baseUnit: 'dona', date: daysAgo(20), quantityProduced: 400, notes: 'Chelak 10L — birinchi partiya', worker: 'operator1' },
    { key: 'log-2', product: 'Plastik chelak 10L', baseUnit: 'dona', date: daysAgo(12), quantityProduced: 400, notes: 'Chelak 10L — ikkinchi partiya', worker: 'operator1' },
    { key: 'log-3', product: 'Plastik chelak 20L', baseUnit: 'dona', date: daysAgo(15), quantityProduced: 200, notes: 'Chelak 20L — birinchi partiya', worker: 'operator2' },
    { key: 'log-4', product: 'Plastik chelak 20L', baseUnit: 'dona', date: daysAgo(5), quantityProduced: 150, notes: 'Chelak 20L — ikkinchi partiya', worker: 'operator2' },
    { key: 'log-5', product: 'Plastik truba 50mm', baseUnit: 'metr', date: daysAgo(18), quantityProduced: 1000, notes: 'Truba 50mm — birinchi partiya', worker: 'operator1' },
    { key: 'log-6', product: 'Plastik truba 50mm', baseUnit: 'metr', date: daysAgo(7), quantityProduced: 1000, notes: 'Truba 50mm — ikkinchi partiya', worker: 'operator1' },
    { key: 'log-7', product: 'Plastik truba 100mm', baseUnit: 'metr', date: daysAgo(14), quantityProduced: 500, notes: 'Truba 100mm — birinchi partiya', worker: 'operator2' },
    { key: 'log-8', product: 'Plastik truba 100mm', baseUnit: 'metr', date: daysAgo(3), quantityProduced: 500, notes: 'Truba 100mm — ikkinchi partiya', worker: 'operator2' },
    { key: 'log-9', product: 'Plastik stul', baseUnit: 'dona', date: daysAgo(10), quantityProduced: 100, notes: 'Stul — birinchi partiya', worker: 'operator1' },
    { key: 'log-10', product: 'Plastik stul', baseUnit: 'dona', date: daysAgo(2), quantityProduced: 50, notes: 'Stul — ikkinchi partiya', worker: 'operator1' },
    { key: 'log-11', product: 'Plastik stol', baseUnit: 'dona', date: daysAgo(8), quantityProduced: 40, notes: 'Stol — birinchi partiya', worker: 'operator2' },
    { key: 'log-12', product: 'Plastik stol', baseUnit: 'dona', date: daysAgo(1), quantityProduced: 40, notes: 'Stol — ikkinchi partiya', worker: 'operator2' },
    { key: 'log-13', product: 'PE paket (kichik)', baseUnit: 'dona', date: daysAgo(16), quantityProduced: 10000, notes: 'PE paket kichik — birinchi partiya', worker: 'operator1' },
    { key: 'log-14', product: 'PE paket (kichik)', baseUnit: 'dona', date: daysAgo(6), quantityProduced: 10000, notes: 'PE paket kichik — ikkinchi partiya', worker: 'operator1' },
    { key: 'log-15', product: 'PE paket (katta)', baseUnit: 'dona', date: daysAgo(13), quantityProduced: 8000, notes: 'PE paket katta — birinchi partiya', worker: 'operator2' },
    { key: 'log-16', product: 'PE paket (katta)', baseUnit: 'dona', date: daysAgo(4), quantityProduced: 7000, notes: 'PE paket katta — ikkinchi partiya', worker: 'operator2' },
    { key: 'log-17', product: 'Polistirol qadoq (konteyner)', baseUnit: 'dona', date: daysAgo(11), quantityProduced: 3000, notes: 'Qadoq konteyner — birinchi partiya', worker: 'operator1' },
    { key: 'log-18', product: 'Polistirol qadoq (konteyner)', baseUnit: 'dona', date: daysAgo(2), quantityProduced: 2000, notes: 'Qadoq konteyner — ikkinchi partiya', worker: 'operator1' },
    { key: 'log-19', product: 'Plastik quvur mufta 50mm', baseUnit: 'dona', date: daysAgo(9), quantityProduced: 300, notes: 'Mufta 50mm — birinchi partiya', worker: 'operator2' },
    { key: 'log-20', product: 'Plastik quvur mufta 50mm', baseUnit: 'dona', date: daysAgo(1), quantityProduced: 200, notes: 'Mufta 50mm — ikkinchi partiya', worker: 'operator2' },
  ];

  for (const pl of defaultProductionLogs) {
    const pieceRateAmount = pl.quantityProduced * (defaultProducts.find((p) => p.name === pl.product)?.pieceRate || 0);

    const prodLog = await ProductionLogModel.create({
      product: productMap[pl.product],
      productName: pl.product,
      unit: unitMap[pl.baseUnit],
      unitName: pl.baseUnit,
      date: pl.date,
      quantityProduced: pl.quantityProduced,
      materialsUsed: [],
      totalMaterialCost: 0,
      costPerUnitProduced: 0,
      pieceRateAmount,
      notes: pl.notes,
      worker: userMap[pl.worker],
    });
    prodLogMap[pl.key] = prodLog._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${pl.product} — ${pl.quantityProduced} ${pl.baseUnit} (${pl.date.toLocaleDateString()})`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 10. PRODUCT LOTS (production + purchase)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Product Lots (production) ──');

  for (const pl of defaultProductionLogs) {
    const prod = defaultProducts.find((p) => p.name === pl.product)!;
    const costPerUnit = prod.costPerUnit;
    const totalCost = costPerUnit * pl.quantityProduced;
    const lotNumber = `PROD-${pl.key.replace('log-', '').padStart(3, '0')}`;

    await ProductLotModel.create({
      product: productMap[pl.product],
      lotNumber,
      quantity: pl.quantityProduced,
      unit: unitMap[prod.baseUnit],
      unitCost: costPerUnit,
      totalCost,
      quantityRemaining: pl.quantityProduced,
      source: 'PRODUCTION',
      productionLog: prodLogMap[pl.key],
      createdBy: userMap[pl.worker],
    });
    console.log(`  ✓ ${lotNumber} — ${pl.product} (${pl.quantityProduced})`);
  }

  // ── Purchase lots (tashqaridan xarid qilingan mahsulotlar) ──
  console.log('\n── Product Lots (purchase) ──');

  const purchaseLots = [
    { product: 'Plastik chelak 10L', lotNumber: 'PUR-001', quantity: 200, unit: 'dona', unitCost: 18_000, supplier: 'Toshkent Plastik Zavod', date: daysAgo(25) },
    { product: 'Plastik chelak 10L', lotNumber: 'PUR-002', quantity: 150, unit: 'dona', unitCost: 17_500, supplier: 'Andijon Plastmassa OOO', date: daysAgo(10) },
    { product: 'Plastik chelak 20L', lotNumber: 'PUR-003', quantity: 100, unit: 'dona', unitCost: 30_000, supplier: 'Toshkent Plastik Zavod', date: daysAgo(22) },
    { product: 'Plastik truba 50mm', lotNumber: 'PUR-004', quantity: 500, unit: 'metr', unitCost: 10_000, supplier: 'Navoiy Truba OOO', date: daysAgo(19) },
    { product: 'Plastik truba 100mm', lotNumber: 'PUR-005', quantity: 300, unit: 'metr', unitCost: 20_000, supplier: 'Navoiy Truba OOO', date: daysAgo(16) },
    { product: 'Plastik stul', lotNumber: 'PUR-006', quantity: 80, unit: 'dona', unitCost: 55_000, supplier: 'Samarqand Mebel OOO', date: daysAgo(17) },
    { product: 'Plastik stol', lotNumber: 'PUR-007', quantity: 30, unit: 'dona', unitCost: 95_000, supplier: 'Samarqand Mebel OOO', date: daysAgo(12) },
    { product: 'PE paket (kichik)', lotNumber: 'PUR-008', quantity: 5000, unit: 'dona', unitCost: 150, supplier: 'Buxoro Paket OOO', date: daysAgo(21) },
    { product: 'PE paket (katta)', lotNumber: 'PUR-009', quantity: 3000, unit: 'dona', unitCost: 250, supplier: 'Buxoro Paket OOO', date: daysAgo(14) },
    { product: 'Polistirol qadoq (konteyner)', lotNumber: 'PUR-010', quantity: 1500, unit: 'dona', unitCost: 800, supplier: 'Farg\'ona Qadoq OOO', date: daysAgo(13) },
    { product: 'Plastik quvur mufta 50mm', lotNumber: 'PUR-011', quantity: 200, unit: 'dona', unitCost: 3_000, supplier: 'Navoiy Truba OOO', date: daysAgo(11) },
    { product: 'Plastik chelak 10L', lotNumber: 'PUR-012', quantity: 100, unit: 'dona', unitCost: 19_000, supplier: 'Qo\'qon Plastik', date: daysAgo(4) },
    { product: 'Plastik stul', lotNumber: 'PUR-013', quantity: 40, unit: 'dona', unitCost: 53_000, supplier: 'Samarqand Mebel OOO', date: daysAgo(6) },
    { product: 'Plastik truba 50mm', lotNumber: 'PUR-014', quantity: 300, unit: 'metr', unitCost: 10_500, supplier: 'Jizzax Truba', date: daysAgo(3) },
  ];

  for (const pl of purchaseLots) {
    const totalCost = pl.quantity * pl.unitCost;
    await ProductLotModel.create({
      product: productMap[pl.product],
      lotNumber: pl.lotNumber,
      quantity: pl.quantity,
      unit: unitMap[pl.unit],
      unitCost: pl.unitCost,
      totalCost,
      quantityRemaining: pl.quantity,
      source: 'PURCHASE',
      supplier: pl.supplier,
      createdBy: userMap['warehouse1'],
    });

    // Stock movement for purchase lot
    await StockMovementModel.create({
      type: 'IN',
      product: productMap[pl.product],
      quantity: pl.quantity,
      unit: unitMap[pl.unit],
      reason: `Xarid kirim — ${pl.lotNumber}`,
      reference: pl.lotNumber,
      referenceModel: 'ProductLot',
      createdBy: userMap['warehouse1'],
    });

    console.log(`  ✓ ${pl.lotNumber} — ${pl.product} (${pl.quantity} ${pl.unit}, ${pl.supplier})`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 11. ORDERS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Orders ──');

  const defaultOrders = [
    {
      orderNumber: 'ORD-001',
      customer: 'Toshkent Plastik OOO',
      paymentType: 'CASH',
      status: 'CONFIRMED',
      items: [
        { product: 'Plastik chelak 10L', unit: 'dona', quantity: 300, price: 25_000 },
        { product: 'Plastik chelak 20L', unit: 'dona', quantity: 100, price: 40_000 },
      ],
      paidAmount: 11_500_000,
    },
    {
      orderNumber: 'ORD-002',
      customer: 'Andijon Savdo OOO',
      paymentType: 'DEBT',
      status: 'CONFIRMED',
      items: [
        { product: 'Plastik truba 50mm', unit: 'metr', quantity: 500, price: 15_000 },
        { product: 'Plastik quvur mufta 50mm', unit: 'dona', quantity: 100, price: 5_000 },
      ],
      paidAmount: 3_000_000,
    },
    {
      orderNumber: 'ORD-003',
      customer: 'Samarqand Qurilish OOO',
      paymentType: 'TRANSFER',
      status: 'CONFIRMED',
      items: [
        { product: 'Plastik truba 100mm', unit: 'metr', quantity: 300, price: 28_000 },
      ],
      paidAmount: 8_400_000,
    },
    {
      orderNumber: 'ORD-004',
      customer: 'Buxoro Polimer OOO',
      paymentType: 'CASH',
      status: 'CONFIRMED',
      items: [
        { product: 'Plastik stul', unit: 'dona', quantity: 50, price: 85_000 },
        { product: 'Plastik stol', unit: 'dona', quantity: 20, price: 150_000 },
      ],
      paidAmount: 7_250_000,
    },
    {
      orderNumber: 'ORD-005',
      customer: 'Namangan Market',
      paymentType: 'DEBT',
      status: 'CONFIRMED',
      items: [
        { product: 'PE paket (kichik)', unit: 'dona', quantity: 5000, price: 300 },
        { product: 'PE paket (katta)', unit: 'dona', quantity: 3000, price: 500 },
      ],
      paidAmount: 0,
    },
    {
      orderNumber: 'ORD-006',
      customer: 'Farg\'ona Plastik',
      paymentType: 'TRANSFER',
      status: 'PENDING',
      items: [
        { product: 'Plastik chelak 10L', unit: 'dona', quantity: 200, price: 25_000 },
        { product: 'Plastik stul', unit: 'dona', quantity: 30, price: 85_000 },
      ],
      paidAmount: 0,
    },
    {
      orderNumber: 'ORD-007',
      customer: 'Xorazm Savdo',
      paymentType: 'CASH',
      status: 'CONFIRMED',
      items: [
        { product: 'Polistirol qadoq (konteyner)', unit: 'dona', quantity: 2000, price: 1_500 },
      ],
      paidAmount: 3_000_000,
    },
    {
      orderNumber: 'ORD-008',
      customer: 'Toshkent Plastik OOO',
      paymentType: 'DEBT',
      status: 'CONFIRMED',
      items: [
        { product: 'Plastik stol', unit: 'dona', quantity: 30, price: 150_000 },
        { product: 'Plastik stul', unit: 'dona', quantity: 60, price: 85_000 },
      ],
      paidAmount: 2_000_000,
    },
  ];

  for (const o of defaultOrders) {
    const items = o.items.map((item) => {
      const total = item.quantity * item.price;
      return {
        product: productMap[item.product],
        productName: item.product,
        unit: unitMap[item.unit],
        unitName: item.unit,
        quantity: item.quantity,
        price: item.price,
        total,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    const order = await OrderModel.create({
      orderNumber: o.orderNumber,
      customer: customerMap[o.customer],
      items,
      totalAmount,
      paidAmount: o.paidAmount,
      totalCost: 0,
      grossProfit: totalAmount,
      status: o.status,
      paymentType: o.paymentType,
      createdBy: userMap['manager1'],
    });
    orderMap[o.orderNumber] = order._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${o.orderNumber} — ${o.customer} (${totalAmount.toLocaleString()} UZS, ${o.status})`);
  }

  // Update customer debts for DEBT orders
  // ORD-002: Andijon Savdo — 8,000,000 total, 3,000,000 paid = 5,000,000 debt
  const ord002 = await OrderModel.findOne({ orderNumber: 'ORD-002' }).exec();
  if (ord002) {
    const debt002 = ord002.totalAmount - ord002.paidAmount;
    await CustomerModel.updateOne(
      { _id: customerMap['Andijon Savdo OOO'] },
      { $inc: { currentDebt: debt002 } },
    );
    console.log(`  → Andijon Savdo OOO debt: ${debt002.toLocaleString()} UZS`);
  }

  // ORD-005: Namangan Market — 3,000,000 total, 0 paid
  const ord005 = await OrderModel.findOne({ orderNumber: 'ORD-005' }).exec();
  if (ord005) {
    const debt005 = ord005.totalAmount - ord005.paidAmount;
    await CustomerModel.updateOne(
      { _id: customerMap['Namangan Market'] },
      { $inc: { currentDebt: debt005 } },
    );
    console.log(`  → Namangan Market debt: ${debt005.toLocaleString()} UZS`);
  }

  // ORD-008: Toshkent Plastik — 9,600,000 total, 2,000,000 paid
  const ord008 = await OrderModel.findOne({ orderNumber: 'ORD-008' }).exec();
  if (ord008) {
    const debt008 = ord008.totalAmount - ord008.paidAmount;
    await CustomerModel.updateOne(
      { _id: customerMap['Toshkent Plastik OOO'] },
      { $inc: { currentDebt: debt008 } },
    );
    console.log(`  → Toshkent Plastik OOO debt: ${debt008.toLocaleString()} UZS`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 12. PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Payments ──');

  const defaultPayments = [
    { customer: 'Toshkent Plastik OOO', order: 'ORD-001', amount: 11_500_000, type: 'CASH', notes: 'To\'liq to\'lov — ORD-001' },
    { customer: 'Andijon Savdo OOO', order: 'ORD-002', amount: 3_000_000, type: 'TRANSFER', notes: 'Qisman to\'lov — ORD-002' },
    { customer: 'Samarqand Qurilish OOO', order: 'ORD-003', amount: 8_400_000, type: 'TRANSFER', notes: 'To\'liq to\'lov — ORD-003' },
    { customer: 'Buxoro Polimer OOO', order: 'ORD-004', amount: 7_250_000, type: 'CASH', notes: 'To\'liq to\'lov — ORD-004' },
    { customer: 'Xorazm Savdo', order: 'ORD-007', amount: 3_000_000, type: 'CASH', notes: 'To\'liq to\'lov — ORD-007' },
    { customer: 'Toshkent Plastik OOO', order: 'ORD-008', amount: 2_000_000, type: 'TRANSFER', notes: 'Qisman to\'lov — ORD-008' },
  ];

  for (const p of defaultPayments) {
    await PaymentModel.create({
      customer: customerMap[p.customer],
      order: orderMap[p.order],
      amount: p.amount,
      type: p.type,
      notes: p.notes,
      createdBy: userMap['accountant1'],
    });
    console.log(`  ✓ ${p.customer} — ${p.amount.toLocaleString()} UZS (${p.type})`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 13. ATTENDANCE (last 7 days)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Attendance ──');

  const workers = ['admin', 'manager1', 'operator1', 'operator2', 'warehouse1', 'accountant1'];
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT'];
  const hours = [8, 9, 10, 10, 8, 8];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);

    // Skip weekends
    const dow = date.getDay();
    if (dow === 0) continue; // Sunday

    for (let i = 0; i < workers.length; i++) {
      const status = dayOffset === 3 && workers[i] === 'operator2' ? 'ABSENT' : statuses[i];
      const hw = status === 'ABSENT' ? 0 : hours[i];
      const ot = hw > 8 ? hw - 8 : 0;

      await AttendanceModel.create({
        user: userMap[workers[i]],
        date,
        status,
        hoursWorked: hw,
        overtimeHours: ot,
        notes: status === 'LATE' ? '30 daqiqa kechikdi' : status === 'ABSENT' ? 'Kasal' : undefined,
        markedBy: userMap['admin'],
      });
    }
    console.log(`  ✓ ${date.toLocaleDateString()} — ${workers.length} ta xodim`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 14. EXPENSES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Expenses ──');

  const defaultExpenses = [
    { category: 'Kommunal', description: 'Elektr energiya — Fevral 2026', amount: 2_500_000, date: new Date(2026, 1, 28), paymentMethod: 'bank' },
    { category: 'Kommunal', description: 'Gaz — Fevral 2026', amount: 800_000, date: new Date(2026, 1, 28), paymentMethod: 'bank' },
    { category: 'Kommunal', description: 'Suv — Fevral 2026', amount: 400_000, date: new Date(2026, 1, 28), paymentMethod: 'bank' },
    { category: 'Transport', description: 'Yuk tashish — Toshkent-Andijon', amount: 1_800_000, date: new Date(2026, 2, 1), paymentMethod: 'cash' },
    { category: 'Transport', description: 'Yuk tashish — Toshkent-Samarqand', amount: 2_200_000, date: new Date(2026, 2, 3), paymentMethod: 'cash' },
    { category: 'Ofis', description: 'Ofis jihozlari — printer kartridji', amount: 350_000, date: new Date(2026, 2, 5), paymentMethod: 'card' },
    { category: 'Ta\'mirlash', description: 'Ekstruder ta\'mirlash', amount: 5_000_000, date: new Date(2026, 2, 7), paymentMethod: 'cash' },
    { category: 'Xavfsizlik', description: 'Yong\'in xavfsizligi tekshiruvi', amount: 1_500_000, date: new Date(2026, 2, 8), paymentMethod: 'bank' },
  ];

  for (const e of defaultExpenses) {
    await ExpenseModel.create({
      ...e,
      createdBy: userMap['accountant1'],
    });
    console.log(`  ✓ ${e.category}: ${e.description} (${e.amount.toLocaleString()} UZS)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 15. ADVANCES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Advances ──');

  const defaultAdvances = [
    { user: 'operator1', amount: 2_000_000, date: new Date(2026, 1, 15), status: 'APPROVED', notes: 'Shaxsiy ehtiyoj uchun avans', approvedBy: 'admin' },
    { user: 'operator2', amount: 1_000_000, date: new Date(2026, 1, 20), status: 'APPROVED', notes: 'Oilaviy ehtiyoj', approvedBy: 'admin' },
    { user: 'warehouse1', amount: 1_500_000, date: new Date(2026, 2, 1), status: 'PENDING', notes: 'Oilaviy ehtiyoj uchun avans' },
    { user: 'operator1', amount: 500_000, date: new Date(2026, 2, 5), status: 'REJECTED', notes: 'Ikkinchi avans so\'rovi', approvedBy: 'admin' },
  ];

  for (const a of defaultAdvances) {
    await AdvanceModel.create({
      user: userMap[a.user],
      amount: a.amount,
      date: a.date,
      status: a.status,
      notes: a.notes,
      approvedBy: a.approvedBy ? userMap[a.approvedBy] : undefined,
      createdBy: userMap[a.user],
    });
    console.log(`  ✓ ${a.user} — ${a.amount.toLocaleString()} UZS (${a.status})`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 16. PAYROLL
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Payroll ──');

  const defaultPayrolls = [
    {
      user: 'operator1', year: 2026, month: 2,
      baseSalary: 5_000_000, salaryType: 'PIECE_RATE', workingDays: 22, presentDays: 21, absentDays: 1, lateDays: 0,
      totalHoursWorked: 168, overtimeHours: 12, overtimeAmount: 360_000,
      deductions: 0, advancesTotal: 2_000_000, bonus: 500_000,
      productionEarnings: 0, previousBalance: 0,
      netSalary: 3_860_000,
      totalEarned: 3_860_000 + 0 + 2_000_000,
      paidAmount: 3_860_000, remainingBalance: 0,
    },
    {
      user: 'operator2', year: 2026, month: 2,
      baseSalary: 5_000_000, salaryType: 'PIECE_RATE', workingDays: 22, presentDays: 20, absentDays: 2, lateDays: 0,
      totalHoursWorked: 160, overtimeHours: 8, overtimeAmount: 240_000,
      deductions: 0, advancesTotal: 1_000_000, bonus: 300_000,
      productionEarnings: 0, previousBalance: 0,
      netSalary: 4_540_000,
      totalEarned: 4_540_000 + 0 + 1_000_000,
      paidAmount: 4_540_000, remainingBalance: 0,
    },
    {
      user: 'warehouse1', year: 2026, month: 2,
      baseSalary: 4_500_000, salaryType: 'FIXED', workingDays: 22, presentDays: 20, absentDays: 0, lateDays: 2,
      totalHoursWorked: 158, overtimeHours: 4, overtimeAmount: 120_000,
      deductions: 200_000, advancesTotal: 0, bonus: 0,
      productionEarnings: 0, previousBalance: 0,
      netSalary: 4_420_000,
      totalEarned: 4_420_000 + 200_000 + 0,
      paidAmount: 4_420_000, remainingBalance: 0,
    },
  ];

  for (const p of defaultPayrolls) {
    await PayrollModel.create({
      ...p,
      user: userMap[p.user],
      status: 'DRAFT',
      calculatedBy: userMap['accountant1'],
    });
    console.log(`  ✓ ${p.user} — ${p.year}/${p.month} (${p.netSalary.toLocaleString()} UZS)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 17. SETTINGS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Settings ──');

  const defaultSettings = [
    { key: 'company_name', value: 'Plastmassa OOO', label: 'Kompaniya nomi', group: 'general', type: 'text' },
    { key: 'company_phone', value: '+998712001234', label: 'Kompaniya telefoni', group: 'general', type: 'text' },
    { key: 'company_address', value: 'Toshkent sh., Sanoat ko\'chasi, 100', label: 'Kompaniya manzili', group: 'general', type: 'text' },
    { key: 'overtime_rate', value: 30_000, label: 'Overtime stavkasi (soatiga)', group: 'payroll', type: 'number' },
    { key: 'working_hours', value: 8, label: 'Kunlik ish soati', group: 'payroll', type: 'number' },
  ];

  for (const s of defaultSettings) {
    await SettingModel.create(s);
    console.log(`  ✓ ${s.key} = ${s.value}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════');
  console.log('  Seed completed successfully!');
  console.log('════════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
