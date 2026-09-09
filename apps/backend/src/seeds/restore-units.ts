/**
 * restore-units.ts
 *
 * Xavfsiz, IDEMPOTENT skript — faqat "units" kolleksiyasi bo'sh bo'lgandagina
 * standart o'lchov birliklari va ularning konversiyalarini qayta yaratadi.
 *
 * Agar "units" kolleksiyasida allaqachon hujjatlar bo'lsa, skript HECH NARSA
 * YOZMAYDI — faqat mavjud birliklarni chop etadi va to'xtaydi. Bu boshqa
 * ma'lumotlarni tasodifan ikki marta yaratib qo'yishning oldini oladi.
 *
 * Ishga tushirish (production serverda, backend papkasi ichidan):
 *   npx ts-node src/seeds/restore-units.ts
 *
 * yoki agar loyiha allaqachon build qilingan bo'lsa:
 *   node -r ts-node/register src/seeds/restore-units.ts
 */
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Schemalar (mavjud ilova schemalariga aynan mos) ───────────────────────

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
    fromUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    toUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    factor: { type: Number, required: true },
  },
  { timestamps: true },
);

const UnitModel = mongoose.model('Unit', UnitSchema);
const UnitConversionModel = mongoose.model('UnitConversion', UnitConversionSchema);

// Faqat orphan-tekshiruv uchun, minimal shakl (yozish uchun ishlatilmaydi)
const ProductModel = mongoose.model(
  'Product',
  new mongoose.Schema({ name: String, baseUnit: mongoose.Schema.Types.ObjectId }, { strict: false }),
);
const MaterialModel = mongoose.model(
  'Material',
  new mongoose.Schema({ name: String, baseUnit: mongoose.Schema.Types.ObjectId }, { strict: false }),
);

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

const defaultConversions = [
  { from: 'kg', to: 'g', factor: 1000 },
  { from: 'tonna', to: 'kg', factor: 1000 },
  { from: 'metr', to: 'sm', factor: 100 },
  { from: 'litr', to: 'ml', factor: 1000 },
];

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plastmassa_crm';
  console.log(`MongoDB'ga ulanmoqda: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
  await mongoose.connect(mongoUri);
  console.log('Ulandi.\n');

  const existingCount = await UnitModel.countDocuments();

  if (existingCount > 0) {
    console.log(`⚠ "units" kolleksiyasida allaqachon ${existingCount} ta hujjat bor — hech narsa o'zgartirilmadi.`);
    const existing = await UnitModel.find().lean();
    console.log('Mavjud birliklar:');
    for (const u of existing) {
      console.log(`  - ${u.name} (${u.symbol}) [${u._id}]`);
    }
  } else {
    console.log('── Units yaratilmoqda ──');
    const unitMap: Record<string, any> = {};
    for (const u of defaultUnits) {
      const created = await UnitModel.create(u);
      unitMap[u.symbol] = created._id as mongoose.Types.ObjectId;
      console.log(`  ✓ ${u.name} (${u.symbol})`);
    }

    console.log('\n── Unit Conversions yaratilmoqda ──');
    const existingConversions = await UnitConversionModel.countDocuments();
    if (existingConversions > 0) {
      console.log(`  ⚠ "unitconversions" kolleksiyasida ${existingConversions} ta hujjat bor — konversiyalar qo'shilmadi.`);
    } else {
      for (const c of defaultConversions) {
        await UnitConversionModel.create({
          fromUnit: unitMap[c.from],
          toUnit: unitMap[c.to],
          factor: c.factor,
        });
        console.log(`  ✓ ${c.from} → ${c.to} (×${c.factor})`);
      }
    }
    console.log('\n✅ Units va Unit Conversions muvaffaqiyatli tiklandi.');
  }

  // ── Orphan tekshiruvi: baseUnit hozirgi Unit hujjatlariga ishora qilmayotgan mahsulot/xom-ashyolar ──
  console.log('\n── Orphan tekshiruvi (eski mahsulot/xom-ashyolarning baseUnit havolasi) ──');
  const validUnitIds = new Set((await UnitModel.find().select('_id').lean()).map((u) => String(u._id)));

  const orphanProducts = (await ProductModel.find().select('name baseUnit').lean()).filter(
    (p: any) => p.baseUnit && !validUnitIds.has(String(p.baseUnit)),
  );
  const orphanMaterials = (await MaterialModel.find().select('name baseUnit').lean()).filter(
    (m: any) => m.baseUnit && !validUnitIds.has(String(m.baseUnit)),
  );

  if (orphanProducts.length === 0 && orphanMaterials.length === 0) {
    console.log('  Orphan topilmadi (yoki Product/Material kolleksiyalari bo\'sh).');
  } else {
    if (orphanProducts.length > 0) {
      console.log(`  ⚠ ${orphanProducts.length} ta mahsulotning baseUnit havolasi o'chirilgan birlikka ishora qiladi:`);
      for (const p of orphanProducts) console.log(`     - ${p.name} [${p._id}] baseUnit=${p.baseUnit}`);
    }
    if (orphanMaterials.length > 0) {
      console.log(`  ⚠ ${orphanMaterials.length} ta xom-ashyoning baseUnit havolasi o'chirilgan birlikka ishora qiladi:`);
      for (const m of orphanMaterials) console.log(`     - ${m.name} [${m._id}] baseUnit=${m.baseUnit}`);
    }
    console.log('\n  Bularni to\'g\'irlash uchun admin panelda (Mahsulotlar/Xom-ashyolar tahrirlash) har birining');
    console.log('  o\'lchov birligini qo\'lda to\'g\'ri qiymatga qayta tanlash kerak bo\'ladi.');
  }

  await mongoose.disconnect();
  console.log('\nUlanish yopildi.');
}

run().catch((err) => {
  console.error('XATOLIK:', err);
  process.exit(1);
});
