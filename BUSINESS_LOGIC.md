# Plastmassa CRM — Business Logic

Ushbu hujjat tizimdagi barcha biznes qoidalar, validatsiyalar, hisob-kitoblar va side-effectlarni tavsiflaydi.

---

## 1. Autentifikatsiya (Auth)

### 1.1 OTP orqali kirish (asosiy)

1. **`POST /auth/send-otp`** — telefon raqam yuboriladi
   - User topilishi kerak, `isActive: true`, `telegramChatId` bo'lishi shart
   - Avvalgi ishlatilmagan OTP'lar `isUsed: true` qilinadi
   - 6 xonali tasodifiy kod generatsiya qilinadi (100000–999999)
   - Kod Telegram bot orqali yuboriladi
   - **Muddati:** 5 daqiqa (konfiguratsiya orqali o'zgartiriladi)
   - **Urinishlar:** maksimum 3 ta (konfiguratsiya orqali)

2. **`POST /auth/verify-otp`** — kod tekshiriladi
   - Eng oxirgi ishlatilmagan, muddati o'tmagan, urinishlari tugamagan OTP topiladi
   - Kod noto'g'ri bo'lsa → `attempts` +1, xato qaytariladi
   - Kod to'g'ri bo'lsa → `isUsed: true`, tokenlar generatsiya qilinadi

### 1.2 Parol orqali kirish (admin fallback)

- **`POST /auth/login`** — username + password
- User topilishi, `isActive: true`, parol o'rnatilgan bo'lishi kerak
- bcrypt orqali parol tekshiriladi

### 1.3 Token tizimi

- **Access token:** qisqa muddatli (1 kun)
- **Refresh token:** uzoq muddatli (7 kun)
- JWT payload: `sub` (user ID), `phone`, `permissions[]`, `roleName`
- Token generatsiyasidan oldin role **har doim** qayta populate qilinadi (permissions yangiligi uchun)
- Refresh token orqali yangi juft token olinadi

### 1.4 Telegram bot

- `/start` → inline keyboard bilan telefon so'raydi (`request_contact: true`)
- Contact kelganda: `contact.user_id === ctx.from.id` tekshiriladi (faqat o'z raqami)
- Telefon raqam `+` bilan normalizatsiya qilinadi
- User topilmasa → "Bu telefon raqam tizimda topilmadi"
- Bot token yo'q bo'lsa → graceful degradation (log yozadi, xato bermaydi)

---

## 2. Foydalanuvchilar (Users)

### Yaratish
- `username` va `phone` **unikal** bo'lishi shart (ConflictException)
- Parol bcrypt bilan hash qilinadi (salt rounds: 10)

### Yangilash
- Username yoki phone o'zgarsa → unikallik qayta tekshiriladi (o'zini exclude qiladi)
- Parol berilsa → yangi hash qilinadi

### O'chirish
- **Soft delete:** `isActive: false` qo'yiladi, bazadan o'chirilmaydi

### Qidiruv
- `fullName`, `username`, `phone` bo'yicha case-insensitive regex
- Role bo'yicha filter
- Default: `createdAt` DESC, limit 20

---

## 3. Rollar (Roles) — Dinamik, DB-based

### Ruxsatlar tuzilishi
Har bir domen CRUD operatsiyalariga ega:

| Domen | create | read | update | delete |
|-------|--------|------|--------|--------|
| users | ✅ | ✅ | ✅ | ✅ |
| customers | ✅ | ✅ | ✅ | ✅ |
| products | ✅ | ✅ | ✅ | ✅ |
| materials | ✅ | ✅ | ✅ | ✅ |
| orders | ✅ | ✅ | ✅ | ✅ |
| stock | ✅ | ✅ | ✅ | ❌ |
| production | ✅ | ✅ | ✅ | ❌ |
| attendance | ✅ | ✅ | ✅ | ❌ |
| payroll | ✅ | ✅ | ✅ | ❌ |
| finance | ✅ | ✅ | ✅ | ❌ |
| reports | ❌ | ✅ | ❌ | ❌ |
| settings | ❌ | ✅ | ✅ | ❌ |

### Default rollar (seed)

| Rol | Ruxsatlar |
|-----|-----------|
| **Boshliq** (isSystem: true) | Barcha ruxsatlar |
| **Boshqaruvchi** | Hammasi, faqat users:create/update/delete yo'q |
| **Kassir** | orders:read, customers:read, finance:*, payroll:read, reports:read |
| **Omborchi** | materials:*, products:read, stock:*, production:read |

### Qoidalar
- `isSystem: true` rollarni **o'zgartirish va o'chirish mumkin emas**
- Permissionlar faqat `ALL_PERMISSIONS` ro'yxatidagilar bo'lishi kerak
- O'chirish → soft delete (`isActive: false`)

---

## 4. Mijozlar (Customers)

### CRUD
- Yaratish: validatsiya yo'q (DTO asosida)
- Yangilash: `currentDebt` maydonini **o'zgartirish mumkin emas** (payload'dan o'chiriladi)
- O'chirish: soft delete (`isActive: false`)

### Qarz boshqaruvi
- `currentDebt` faqat **atomic `$inc`** orqali o'zgartiriladi
- Faqat 2 ta servis o'zgartira oladi:
  - `OrdersService` — DEBT buyurtma yaratish (+) va bekor qilish (−)
  - `PaymentsService` — to'lov qabul qilish (−)

### Qidiruv
- `name` yoki `phone` bo'yicha regex
- `hasDebt: true` → `currentDebt > 0`
- `isActive` filter

### Qarzdorlar (getDebtors)
- `currentDebt > 0` bo'lgan barcha mijozlar, qarz bo'yicha kamayish tartibida

### Qarz xulosasi (getDebtSummary)
- `totalDebt`: barcha qarzlar yig'indisi
- `debtorCount`: qarzdorlar soni
- `averageDebt`: o'rtacha qarz (butun son)

---

## 5. O'lchov birliklari (Units)

### Turlar
- `WEIGHT`, `LENGTH`, `QUANTITY`, `VOLUME`

### Konvertatsiya
- Ikki tomonlama: A→B topilmasa, B→A qidiriladi va `value / factor` hisoblanadi
- Bir xil birlik → qiymat o'zgarmaydi
- Konvertatsiya topilmasa → BadRequestException
- Upsert: mavjud konvertatsiya yangilanadi, yo'q bo'lsa yaratiladi

### O'chirish
- **Hard delete** (boshqa modullardan farqli)

---

## 6. Materiallar (Materials)

### Himoyalangan maydonlar
- `currentStock` va `avgCostPerUnit` **update orqali o'zgartirilmaydi** (payload'dan o'chiriladi)
- Faqat `updateStock()` metodi orqali o'zgaradi

### O'chirish
- Soft delete (`isActive: false`)

---

## 7. Material lotlar (Material Lots) — FIFO

### Lot yaratish
- **Lot raqam formati:** `LOT-YYYYMMDD-XXX` (kunlik counter)
- Agar sotib olish birligi ≠ baseUnit → konvertatsiya:
  - `quantity` baseUnit'ga o'giriladi
  - `unitCost` qayta hisoblanadi: `(purchaseQuantity × purchaseUnitCost) / convertedQuantity`
- `totalCost = quantity × unitCost`
- `quantityRemaining = quantity`

### FIFO iste'mol (consumeFIFO)
1. `quantityRemaining > 0` bo'lgan lotlar `createdAt ASC` tartibida olinadi
2. Har bir lotdan `min(kerakli, lot.quantityRemaining)` olinadi
3. `lot.quantityRemaining` kamaytiriladi
4. Natija: lot ID, lot raqam, miqdor, unitCost, totalCost
5. **Yetarli emas bo'lsa:**
   - Barcha olingan miqdorlar **rollback** qilinadi
   - BadRequestException: "Xomashyo yetarli emas..."

### Database index
- Compound index: `(material, quantityRemaining, createdAt)` — FIFO query optimizatsiyasi

---

## 8. Mahsulotlar (Products)

### Retsept (Recipe)
- `Product.recipe[]` — har bir elementda: material, `quantityPerUnit`, unit
- Yaratish/yangilashda retsept **snapshot** saqlanadi: `materialName`, `unitName`
- Retsept o'zgarishi mavjud ishlab chiqarish loglariga **ta'sir qilmaydi**

### Sotish birliklari (Sales Units)
- Har bir mahsulotda bir nechta sotish birligi bo'lishi mumkin
- Har birida: `conversionFactor`, `price` (asosiy narxdan farq qilishi mumkin)

### Himoyalangan maydonlar
- `currentStock` va `costPerUnit` faqat `updateStock()` orqali

### O'chirish
- Soft delete (`isActive: false`)

---

## 9. Mahsulot lotlar (Product Lots) — FIFO

### Lot yaratish
- **Lot raqam formati:** `PLOT-YYYYMMDD-XXX`
- Ikki manba:
  - **PURCHASE** — sotib olish (stock avtomatik oshadi)
  - **PRODUCTION** — ishlab chiqarish (stock ProductionService tomonidan oshiriladi)

### FIFO iste'mol (consumeFIFO)
- Material lotlar bilan bir xil mantiq
- Yetarli emas → rollback + BadRequestException: "Mahsulot yetarli emas..."

### FIFO tiklash (restoreFIFO) — buyurtma bekor qilinganda
- **LIFO tartibda** tiklanadi (`createdAt DESC` — eng yangi lotlardan boshlanadi)
- Har bir lotda: `canRestore = quantity - quantityRemaining`
- `min(kerakli, canRestore)` tiklanadi

### Database index
- Compound index: `(product, quantityRemaining, createdAt)`

---

## 10. Ombor harakatlari (Stock Movements)

### Harakat turlari

| Tur | Ta'siri |
|-----|---------|
| **IN** | Stock +quantity |
| **OUT** | Stock −quantity (avval `currentStock >= quantity` tekshiriladi) |
| **ADJUSTMENT** | Stock = berilgan qiymatga olib kelinadi (`diff = quantity - currentStock`) |

### Qoidalar
- Har bir harakatda **faqat bitta** — product YOKI material (ikkalasi emas)
- `reason` majburiy (audit trail uchun)
- OUT harakatda yetarli stock yo'q → "Insufficient stock. Available: X, Requested: Y"
- `reference` va `referenceModel` — bog'langan hujjat (Order, ProductionLog)

### Muhim
- StockMovement **faqat audit/tracking** mexanizmi
- Lotlarni iste'mol qilmaydi, narxlarni o'zgartirmaydi

---

## 11. Buyurtmalar (Orders)

### Buyurtma raqam formati
`ORD-YYYYMMDD-XXX` (kunlik counter, 001 dan boshlanadi)

### Buyurtma yaratish

**Har bir element uchun:**
1. Mahsulot tekshiriladi
2. Narx: `item.price` berilsa → ishlatiladi, aks holda → `product.price`
3. ProductLots FIFO orqali iste'mol qilinadi → tannarx hisoblanadi
4. Mahsulot stock kamaytiriladi
5. StockMovement OUT yaratiladi: "Buyurtma: {orderNumber}"

**Snapshot saqlanadi:** `productName`, `unitName`, `price`, `costPerUnit`

**Hisob-kitoblar:**
```
totalAmount = SUM(item.quantity × item.price)
orderTotalCost = SUM(item.totalCost)  — FIFO lot narxlari asosida
grossProfit = totalAmount − orderTotalCost
```

**To'lov turi bo'yicha:**

| To'lov turi | paidAmount | Qarz |
|-------------|------------|------|
| **CASH** | totalAmount (to'liq) | Yo'q |
| **TRANSFER** | totalAmount (to'liq) | Yo'q |
| **DEBT** | DTO'dan (qisman mumkin) | `debtAmount = totalAmount − paidAmount` → Customer.currentDebt +debtAmount |

### Status o'tishlari

```
PENDING → CONFIRMED → DELIVERED
PENDING → CANCELLED
CONFIRMED → CANCELLED
```

**Cheklovlar:**
- `CANCELLED` → hech qayerga o'tmaydi (final holat)
- `DELIVERED` → `CANCELLED` ga o'tib bo'lmaydi

### Buyurtma bekor qilish (CANCELLED)

1. Har bir element uchun:
   - Mahsulot stock tiklanadi (+quantity)
   - Product lotlar **LIFO** tartibda tiklanadi (restoreFIFO)
   - StockMovement IN yaratiladi: "Buyurtma bekor qilindi: {orderNumber}"
2. Agar to'lov turi DEBT:
   - `debtAmount = totalAmount − paidAmount`
   - Customer.currentDebt −debtAmount

---

## 12. To'lovlar (Payments)

### Yaratish
- Mijoz topilishi kerak
- Buyurtma berilsa → buyurtma topilishi va **shu mijozga tegishli** bo'lishi kerak
- **Side-effectlar:**
  - Customer.currentDebt −amount (har doim)
  - Buyurtma berilsa → Order.paidAmount +amount

### Qoidalar
- Bitta buyurtmaga bir nechta to'lov mumkin
- Buyurtmasiz to'lov mumkin (umumiy qarz to'lash)
- To'lov summasi qarzni har doim kamaytiradi

---

## 13. Ishlab chiqarish (Production)

### Material iste'moli
1. Agar `materialsUsed` DTO'da berilsa → aynan o'sha materiallar ishlatiladi
2. Aks holda → mahsulot retseptidan avtomatik hisoblash:
   - `quantity = quantityPerUnit × quantityProduced`

### Har bir material uchun:
1. MaterialLots.consumeFIFO → lot iste'mollari va narxlar
2. Materials.updateStock(−quantity)

### Mahsulot lot yaratish
```
costPerUnitProduced = totalMaterialCost / quantityProduced
```
- ProductLot yaratiladi (source: PRODUCTION, unitCost: costPerUnitProduced)
- Product stock oshiriladi (+quantityProduced)

### Moliyaviy hisob-kitoblar
```
totalMaterialCost = SUM(barcha lot iste'mollari narxlari)
costPerUnitProduced = totalMaterialCost / quantityProduced
earnedAmount = quantityProduced × product.price
pieceRateAmount = quantityProduced × product.pieceRate
```

### Audit trail
- Har bir material uchun StockMovement OUT: "Ishlab chiqarish: {productName}"
- Mahsulot uchun StockMovement IN: "Ishlab chiqarish: {productName}"
- `reference: productionLog._id`, `referenceModel: 'ProductionLog'`

### Snapshotlar
- `productName`, `unit`, `unitName`, materiallar: `materialName`, `unitName`

---

## 14. Davomat (Attendance)

### Status bo'yicha default soatlar

| Status | Soat |
|--------|------|
| PRESENT | 8 |
| HALF_DAY | 4 |
| LATE | 7 |
| ABSENT | 0 |
| LEAVE | 0 |

### Qoidalar
- `hoursWorked` berilmasa → status bo'yicha default ishlatiladi
- Sana UTC 00:00:00 ga normalizatsiya qilinadi
- **Upsert:** bir xil user + sana uchun mavjud yozuv yangilanadi
- Bulk yozish: `bulkWrite` bilan bir nechta yozuv

### Oylik hisobot
- Status bo'yicha sanash: present, absent, late, halfDay, leave
- Jami soatlar: `totalHoursWorked`, `totalOvertimeHours`
- `totalDays` = yozuvlar soni

---

## 15. Avanslar (Advances)

### Status o'tishlari
```
PENDING → APPROVED
PENDING → REJECTED
```

- Faqat `PENDING` holatdan o'zgartirish mumkin
- `APPROVED` yoki `REJECTED` → o'zgartirib bo'lmaydi
- `approvedBy` — tasdiqlagan user saqlanadi

---

## 16. Ish haqi (Payroll)

### Oylikchi (FIXED) hisob-kitob

```
Kunlik stavka = baseSalary / 26

Hisoblangan ish haqi = (kunlik stavka × ishga kelgan kunlar)
                     + (kunlik stavka × 0.5 × kechikkan kunlar)
                     + (kunlik stavka × 0.5 × yarim kun kunlar)

Overtime stavka = (kunlik stavka / 8) × 1.5
Overtime summasi = ROUND(overtime soatlari × overtime stavka)

Jami hisoblangan = hisoblangan ish haqi + overtime summasi + bonus
```

### Ishbaychi (PIECE_RATE) hisob-kitob

```
Ishlab chiqarish daromadi = SUM(ProductionLog.pieceRateAmount) — shu oy, shu ishchi
Jami hisoblangan = ishlab chiqarish daromadi + bonus
(baseSalary = 0, overtime = 0)
```

### Yakuniy hisob (ikkala tur uchun)

```
To'langan = jami hisoblangan + oldingi oy qoldig'i − ushlamalar − avanslar jami
           (yoki DTO'dan berilgan paidAmount)

Qoldiq = jami hisoblangan + oldingi oy qoldig'i − ushlamalar − avanslar jami − to'langan

Sof ish haqi = to'langan summa
```

**Barcha pul qiymatlari butun songacha yaxlitlanadi (ROUND).**

### Balans uzluksizligi
- `previousBalance` — oldingi oy payroll'dan `remainingBalance` olinadi
- Oldingi oy payroll yo'q bo'lsa → `previousBalance = 0`

### Avanslar
- Faqat **APPROVED** avanslar hisobga olinadi
- Shu oy uchun barcha approved avanslar yig'indisi

### Status o'tishlari
```
DRAFT → CONFIRMED → PAID
```
- PAID → boshqa holatga o'tmaydi
- Noto'g'ri o'tish → BadRequestException

### Upsert
- Bir xil user + year + month uchun mavjud yozuv yangilanadi

---

## 17. Xarajatlar (Expenses)

### CRUD
- Yaratish: category, amount, date majburiy; paymentMethod default: 'cash'
- O'chirish: **hard delete** (bazadan o'chiriladi)

### Statistika
- **Kategoriya bo'yicha:** har bir kategoriyaning jami summasi va soni, kamayish tartibida
- **Oy bo'yicha:** yil+oy bo'yicha guruhlash, jami va soni
- **Umumiy:** barcha xarajatlar yig'indisi (ixtiyoriy sana filteri)

---

## 18. Moliya (Finance)

### Pul oqimi (Cash Flow)
```
Daromad = SUM(Payment.amount) — belgilangan davr
Xarajat = SUM(Expense.amount) — belgilangan davr
Sof = Daromad − Xarajat
```

**Oylik pul oqimi:** 12 oy uchun daromad/xarajat/sof (ma'lumot yo'q oylar uchun 0)

### Moliyaviy xulosa
```
Jami daromad = SUM(barcha to'lovlar)
Jami xarajat = SUM(barcha xarajatlar)
Jami qarz = SUM(Customer.currentDebt > 0)
Sof foyda = Jami daromad − Jami xarajat
```

### Foyda va zarar (P&L)
- **Daromad taqsimoti:** buyurtma elementlari bo'yicha (productName), CANCELLED buyurtmalar chiqarib tashlanadi
- **Xarajat taqsimoti:** kategoriya bo'yicha
- `Yalpi foyda = Daromad jami`
- `Sof foyda = Daromad jami − Xarajat jami`

---

## 19. Dashboard

### Statistikalar
```
Jami mijozlar = COUNT(customers)
Faol buyurtmalar = COUNT(orders WHERE status NOT IN ['COMPLETED', 'CANCELLED'])
Oylik daromad = SUM(Payment.amount) — joriy oy
Oylik xarajat = SUM(Expense.amount) — joriy oy
Jami qarz = SUM(Customer.currentDebt)
Bugungi ishlab chiqarish = COUNT(ProductionLog) — bugun
Faol xodimlar = COUNT(User WHERE isActive=true)
Kam qolgan mahsulotlar = COUNT(Product WHERE currentStock < minStock)
```

### Daromad trendi
- Oxirgi 6 oy (default)
- Oylik Payment summasi aggregatsiyasi
- Ma'lumot yo'q oylar uchun 0

---

## 20. Hisobotlar (Reports)

### Sotuv hisoboti
- CANCELLED buyurtmalar **chiqarib tashlanadi**
- Guruhlash: `day` (YYYY-MM-DD), `week` (YYYY-Www), `month` (YYYY-MM, default)
- **Top 10 mahsulot:** totalAmount bo'yicha kamayish tartibida
- **Top 10 mijoz:** totalAmount bo'yicha kamayish tartibida
- Metriklar: `totalOrders`, `totalAmount`, `averageOrderAmount`

### Ishlab chiqarish hisoboti
- Mahsulot bo'yicha: `totalQuantity`, `totalEarned`
- Ishchi bo'yicha: `totalQuantity`, `totalEarned`
- Kunlik taqsimot: sana bo'yicha `totalQuantity`

### Ombor hisoboti
- Mahsulot stock: name, currentStock, price
- Material stock: name, currentStock, avgCostPerUnit, minStock
- **Kam qolgan materiallar:** `currentStock < minStock` (faqat minStock belgilangan)

### Davomat hisoboti
- Default: joriy oy
- Xodim bo'yicha: presentDays, absentDays, lateDays, totalHours, overtimeHours
- Faqat `isActive: true` xodimlar
- Xulosa: `averageAttendance = ROUND((totalPresent / totalEntries) × 100)%`

---

## 21. Sozlamalar (Settings)

### Default qiymatlar (seed)

| Kalit | Qiymat | Tur |
|-------|--------|-----|
| company.name | "PLASTMASSA MChJ" | text |
| company.phone | "" | text |
| company.address | "" | text |
| company.director | "" | text |
| finance.currency | "UZS" | text |
| finance.taxRate | 12 | number (%) |
| production.workingDays | 26 | number |
| production.workingHours | 8 | number |
| production.overtimeRate | 1.5 | number |

- Seed idempotent (upsert) — qayta ishlatish xavfsiz

---

## Modullararo oqimlar

### Ishlab chiqarish → Sotuv zanjiri

```
Ishlab chiqarish (Production)
  ├─ Materiallar FIFO iste'mol → totalMaterialCost
  ├─ ProductLot yaratish (costPerUnit = totalMaterialCost / quantity)
  ├─ Mahsulot stock ↑
  └─ StockMovement: OUT (materiallar), IN (mahsulot)
        ↓
Buyurtma (Order)
  ├─ ProductLot FIFO iste'mol → itemTotalCost
  ├─ Mahsulot stock ↓
  ├─ grossProfit = totalAmount − totalCost
  └─ StockMovement: OUT (mahsulotlar)
        ↓
Buyurtma bekor qilish
  ├─ Mahsulot stock ↑ (tiklash)
  ├─ ProductLot LIFO tiklash
  ├─ Mijoz qarzi tiklash (DEBT bo'lsa)
  └─ StockMovement: IN (mahsulotlar)
```

### Qarz oqimi

```
DEBT buyurtma (amount=100, paid=30)
  → debtAmount = 70
  → Customer.currentDebt +70

To'lov (amount=40)
  → Customer.currentDebt −40

Buyurtma bekor qilish
  → Customer.currentDebt −70 (tiklash)
```

### Lot hayot sikli

```
MATERIAL LOT:
  Yaratish → quantityRemaining = quantity, material stock ↑
  Iste'mol (FIFO) → quantityRemaining ↓, material stock ↓
  Yetarli emas → ROLLBACK

PRODUCT LOT:
  Yaratish (PURCHASE) → quantityRemaining = quantity, product stock ↑
  Yaratish (PRODUCTION) → costPerUnit = material cost / quantity
  Iste'mol (FIFO) → quantityRemaining ↓, product stock ↓
  Tiklash (LIFO) → quantityRemaining ↑ (buyurtma bekor qilganda)
```

### Ish haqi oqimi

```
Oylikchi (FIXED):
  Davomat → oylik hisobot → kunlar/soatlar → ish haqi hisoblash

Ishbaychi (PIECE_RATE):
  Ishlab chiqarish → pieceRateAmount → oylik jami → ish haqi hisoblash

Ikkalasi uchun:
  Oldingi oy qoldig'i + hisoblangan − ushlamalar − avanslar = to'lanadigan
```

---

## Muhim cheklovlar xulosasi

| Cheklov | Tafsilot |
|---------|----------|
| Qarz faqat 2 servis orqali | OrdersService va PaymentsService |
| FIFO yetarli emas → rollback | Barcha olingan lotlar tiklanadi |
| CANCELLED buyurtma final | Hech qayerga o'tmaydi |
| DELIVERED bekor qilinmaydi | BadRequestException |
| System rollar himoyalangan | O'zgartirish/o'chirish mumkin emas |
| Lot narxi o'zgarmaydi | Yaratilgandan keyin immutable |
| Snapshot pattern | Buyurtma/ishlab chiqarish — nom va narx saqlanadi |
| Pul qiymatlari butun son | Barcha hisob-kitoblar ROUND qilinadi |
| Valyuta: UZS | Tiyin yo'q, faqat butun sonlar |
| Soft delete (aksariyat) | Units va Expenses bundan mustasno (hard delete) |
