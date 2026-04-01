import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Schemas (minimal for migration) ─────────────────────────────────────────

const MaterialLotSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
    lotNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    quantityRemaining: { type: Number },
    purchaseQuantity: { type: Number },
    purchaseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    supplier: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const ProductLotSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    lotNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    quantityRemaining: { type: Number },
    source: { type: String, enum: ['PURCHASE', 'PRODUCTION'], default: 'PURCHASE' },
    productionLog: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionLog' },
    purchaseQuantity: { type: Number },
    purchaseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    supplier: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const MaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    baseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    currentStock: { type: Number, default: 0 },
    avgCostPerUnit: { type: Number, default: 0 },
    minStock: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    baseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    currentStock: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [{ type: mongoose.Schema.Types.Mixed }],
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    status: { type: String },
    paymentType: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const ProductionLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    unitName: { type: String, required: true },
    date: { type: Date, required: true },
    quantityProduced: { type: Number, required: true },
    materialsUsed: [{ type: mongoose.Schema.Types.Mixed }],
    totalMaterialCost: { type: Number, default: 0 },
    costPerUnitProduced: { type: Number, default: 0 },
    earnedAmount: { type: Number, default: 0 },
    notes: { type: String },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// ─── Models ──────────────────────────────────────────────────────────────────

const MaterialLot = mongoose.model('MaterialLot', MaterialLotSchema);
const ProductLot = mongoose.model('ProductLot', ProductLotSchema);
const Material = mongoose.model('Material', MaterialSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);
const ProductionLog = mongoose.model('ProductionLog', ProductionLogSchema);

// ─── Migration ───────────────────────────────────────────────────────────────

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plastmassa_crm';
  console.log(`Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // 1. Migrate MaterialLots — set quantityRemaining
  console.log('\n--- Migrating Material Lots ---');
  const materials = await Material.find().exec();

  for (const material of materials) {
    const lots = await MaterialLot.find({ material: material._id })
      .sort({ createdAt: 1 })
      .exec();

    if (lots.length === 0) continue;

    const totalLotQuantity = lots.reduce((sum, l) => sum + l.quantity, 0);
    const currentStock = material.currentStock || 0;
    let consumed = totalLotQuantity - currentStock;

    console.log(`  Material: ${material.name} — lots: ${lots.length}, totalLotQty: ${totalLotQuantity}, currentStock: ${currentStock}, consumed: ${consumed}`);

    for (const lot of lots) {
      if (consumed <= 0) {
        // All remaining lots are fully available
        await MaterialLot.findByIdAndUpdate(lot._id, {
          $set: { quantityRemaining: lot.quantity },
        });
      } else {
        const takeFromLot = Math.min(consumed, lot.quantity);
        const remaining = lot.quantity - takeFromLot;
        await MaterialLot.findByIdAndUpdate(lot._id, {
          $set: { quantityRemaining: remaining },
        });
        consumed -= takeFromLot;
      }
    }
  }

  // 2. Migrate ProductLots — set quantityRemaining and source
  console.log('\n--- Migrating Product Lots ---');
  const products = await Product.find().exec();

  for (const product of products) {
    const lots = await ProductLot.find({ product: product._id })
      .sort({ createdAt: 1 })
      .exec();

    if (lots.length === 0) continue;

    const totalLotQuantity = lots.reduce((sum, l) => sum + l.quantity, 0);
    const currentStock = product.currentStock || 0;
    let consumed = totalLotQuantity - currentStock;

    console.log(`  Product: ${product.name} — lots: ${lots.length}, totalLotQty: ${totalLotQuantity}, currentStock: ${currentStock}, consumed: ${consumed}`);

    for (const lot of lots) {
      const updates: any = {};

      // Set source if not already set
      if (!lot.source) {
        updates.source = 'PURCHASE';
      }

      if (consumed <= 0) {
        updates.quantityRemaining = lot.quantity;
      } else {
        const takeFromLot = Math.min(consumed, lot.quantity);
        updates.quantityRemaining = lot.quantity - takeFromLot;
        consumed -= takeFromLot;
      }

      await ProductLot.findByIdAndUpdate(lot._id, { $set: updates });
    }
  }

  // 3. Migrate Orders — set totalCost=0, grossProfit=totalAmount for old orders
  console.log('\n--- Migrating Orders ---');
  const ordersResult = await Order.updateMany(
    { totalCost: { $exists: false } },
    [
      {
        $set: {
          totalCost: 0,
          grossProfit: '$totalAmount',
        },
      },
    ],
  );
  console.log(`  Updated ${ordersResult.modifiedCount} orders`);

  // 4. Migrate ProductionLogs — set costPerUnitProduced=0
  console.log('\n--- Migrating Production Logs ---');
  const logsResult = await ProductionLog.updateMany(
    { costPerUnitProduced: { $exists: false } },
    { $set: { costPerUnitProduced: 0 } },
  );
  console.log(`  Updated ${logsResult.modifiedCount} production logs`);

  console.log('\n✅ Migration completed successfully!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
