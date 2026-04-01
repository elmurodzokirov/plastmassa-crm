# Plastmassa CRM — Tizimda nima qilish mumkin

Bu hujjat har bir rol uchun tizimning imkoniyatlarini amaliy tarzda tavsiflaydi.

---

## 1. Direktor

Direktor tizimning barcha bo'limlariga kirishi mumkin.

### Bosh sahifa (Dashboard)
- Bugungi statistikani ko'rish: faol buyurtmalar, oylik daromad, oylik xarajat, jami mijozlar
- Sof foydani hisoblash (daromad minus xarajat)
- Jami qarz, bugungi ishlab chiqarish, faol xodimlar sonini ko'rish
- Savdo va daromad grafigini yillar, oylar yoki kunlar kesimida ko'rish
- Savdo tarkibini donut diagrammada ko'rish (daromad va tannarx nisbati)
- Oxirgi 5 ta buyurtma va to'lovni ko'rish

### Foydalanuvchilar boshqaruvi
- Yangi xodim qo'shish (ism, telefon, username, parol, rol belgilash)
- Xodim ma'lumotlarini tahrirlash
- Xodimni faol emas qilish (o'chirish)
- Har bir xodimga ish haqi turini belgilash: oylikchi (FIXED) yoki ishbaychi (PIECE_RATE)

### Rollar boshqaruvi
- Yangi rol yaratish
- Mavjud rollarga ruxsat qo'shish yoki olib tashlash
- Rolni o'chirish (tizim rollaridan tashqari)
- 12 ta sohada 35+ ruxsatni boshqarish

### Sozlamalar
- Kompaniya nomi, telefoni, manzili, direktor ismini o'zgartirish
- Soliq stavkasini belgilash
- Ish kunlari soni, kunlik ish soati, overtime koeffitsientini sozlash

---

## 2. Sotuv menejeri

### Mijozlar bilan ishlash
- Yangi mijoz qo'shish: ism, telefon, manzil, qarz limiti, izoh
- Mijoz ma'lumotlarini tahrirlash
- Mijozni o'chirish (faol emas qilish)
- Mijozlar ro'yxatini qidirish (ism yoki telefon bo'yicha)
- Faqat qarzdorlarni filtrlash
- Mijoz sahifasida: joriy qarz, qarz limiti, qarz foizini ko'rish

### Buyurtma yaratish (sotuv)
- Mijozni tanlash
- Mahsulotlar ro'yxatidan tanlash (POS ko'rinishida)
- Har bir mahsulotga miqdor belgilash
- Sotish birligini tanlash (kg, dona, metr va boshqa)
- **Narxni o'zgartirish** — har bir mijoz uchun narx boshqacha bo'lishi mumkin
- To'lov turini tanlash:
  - **Naqd** — to'liq to'lov, qarz oshmaslik
  - **O'tkazma** — to'liq to'lov, qarz oshmaslik
  - **Qarzga** — qisman to'lov mumkin, qolgan qismi mijoz qarziga qo'shiladi
- Qarz limiti nazorati — limit oshsa ogohlantirish ko'rsatiladi
- Buyurtmani tasdiqlash yoki bekor qilish

### Buyurtmalar ro'yxati
- Barcha buyurtmalarni ko'rish
- Mijoz, holat, to'lov turi, sana bo'yicha filtrlash
- Buyurtma tafsilotlarini ko'rish: elementlar, narxlar, tannarx, foyda
- Buyurtma holatini o'zgartirish: Kutilmoqda → Tasdiqlangan → Bekor qilingan
- Bekor qilinganda: mahsulot stocki tiklanadi, qarz qaytariladi

### Mahsulotlar va stock (faqat ko'rish)
- Mahsulotlar ro'yxatini ko'rish: nom, narx, tannarx, stock
- Stock holatini ko'rish

### Hisobotlar (faqat ko'rish)
- Sotuv hisobotini ko'rish

---

## 3. Kassir

### To'lov qabul qilish
- Mijoz tanlash
- To'lov summasi kiritish
- To'lov usulini belgilash: naqd, o'tkazma, karta
- Buyurtmaga bog'lab to'lov qilish (ixtiyoriy)
- Buyurtmasiz umumiy qarz to'lash
- To'lov qilinganda mijoz qarzi avtomatik kamayadi

### Xarajatlar
- Yangi xarajat kiritish: kategoriya, summa, sana, to'lov usuli, izoh
- Xarajatlar ro'yxatini ko'rish
- Kategoriya va oy bo'yicha xarajat statistikasini ko'rish

### Moliyaviy ko'rsatkichlar
- Pul oqimi: daromad va xarajat (belgilangan davr uchun)
- Oylik pul oqimi (12 oy)
- Moliyaviy xulosa: jami daromad, jami xarajat, jami qarz, sof foyda
- Foyda va zarar hisoboti

### Qarz nazorati
- Mijozlar ro'yxatini ko'rish
- Qarz summalarini ko'rish
- Buyurtmalar ro'yxatini ko'rish (qaysi buyurtmaga to'lov kerak)
- Ish haqi summalarini ko'rish (qancha to'lash kerak)

### Hisobotlar (faqat ko'rish)
- Barcha hisobotlarni ko'rish

---

## 4. Omborchi

### Mahsulotlar boshqaruvi
- Yangi mahsulot qo'shish: nom, asosiy birlik, sotuv narxi, tannarx, ishbay stavkasi
- Mahsulot ma'lumotlarini tahrirlash
- Sotish birliklarini sozlash (kg, dona, qop — har birining konvertatsiya koeffitsienti va narxi)
- Mahsulotni o'chirish (faol emas qilish)

### Mahsulot lotlari
- Yangi lot kirim qilish (sotib olish): miqdor, narx, yetkazib beruvchi
- Sotish birligidan asosiy birlikka avtomatik konvertatsiya
- Lot raqami avtomatik generatsiya (PLOT-YYYYMMDD-XXX)
- Lot ro'yxatini ko'rish

### Ombor harakatlari
- **Kirim** (IN) — mahsulot stockiga qo'shish
- **Chiqim** (OUT) — mahsulot stockidan ayirish (yetarli stock tekshiriladi)
- **Tuzatish** (ADJUSTMENT) — inventarizatsiya natijasida stockni aniq miqdorga olib kelish
- Har bir harakatga sabab yozish (audit izi)
- Harakatlar tarixini ko'rish

### Ko'rish imkoniyatlari
- Ishlab chiqarish loglarini ko'rish (nima ishlab chiqarilgan)
- Buyurtmalar ro'yxatini ko'rish (nima sotilgan)
- Hisobotlar: stock hisoboti

---

## 5. Ishlab chiqarish boshlig'i

### Ishlab chiqarish logi yaratish
- Mahsulotni tanlash
- Ishchini (operator) tanlash
- Ishlab chiqarilgan miqdorni kiritish
- Sanani belgilash
- Izoh qo'shish
- Log yaratilganda avtomatik:
  - Mahsulot stocki oshadi
  - Mahsulot loti yaratiladi
  - Ombor kirim harakati qayd etiladi
  - Ishbay summasi hisoblanadi (miqdor × mahsulot.pieceRate)

### Ishlab chiqarish tarixi
- Barcha loglarni ko'rish
- Mahsulot, ishchi, sana bo'yicha filtrlash
- Har bir logda: mahsulot, miqdor, ishchi, ishbay summasi

### Davomat boshqaruvi
- Har bir ishchining davomatini belgilash:
  - **Keldi** (PRESENT) — 8 soat
  - **Yarim kun** (HALF_DAY) — 4 soat
  - **Kechikdi** (LATE) — 7 soat
  - **Kelmadi** (ABSENT) — 0 soat
  - **Ta'tilda** (LEAVE) — 0 soat
- Ish soatini qo'lda o'zgartirish mumkin
- Qo'shimcha ish soatini kiritish (overtime)
- Bir kunlik yoki ommaviy (bulk) davomat belgilash
- Oylik davomat hisobotini ko'rish

### Ko'rish imkoniyatlari
- Mahsulotlar ro'yxati (nima ishlab chiqarish kerak)
- Stock holati (qancha mahsulot bor)
- Hisobotlar: ishlab chiqarish va davomat hisoboti

---

## 6. Hisobchi

### Ish haqi hisoblash

#### Oylikchi (FIXED) xodimlar uchun:
- Davomat ma'lumotlarini ko'rish (kelgan, kechikkan, yarim kun, kelmagan)
- Tizim avtomatik hisoblaydi:
  - Kunlik stavka = oylik maosh / 26
  - Hisoblangan = (kunlik × kelgan kunlar) + (kunlik × 0.5 × kechikkan) + (kunlik × 0.5 × yarim kun)
  - Overtime = (kunlik / 8) × 1.5 × overtime soatlar
  - Jami = hisoblangan + overtime + bonus
- Ushlamalar kiritish
- Bonus kiritish

#### Ishbaychi (PIECE_RATE) xodimlar uchun:
- Tizim avtomatik hisoblaydi:
  - Ishlab chiqarish daromadi = shu oydagi barcha ishlab chiqarish loglarining ishbay summalari yig'indisi
  - Jami = ishlab chiqarish daromadi + bonus
- Ushlamalar kiritish
- Bonus kiritish

#### Yakuniy hisob (ikkala tur uchun):
- Oldingi oy qoldig'i avtomatik keladi
- To'lanadigan = jami + oldingi qoldiq − ushlamalar − avanslar
- Qoldiq = jami + oldingi qoldiq − ushlamalar − avanslar − to'langan
- Qoldiq keyingi oyga o'tadi

### Ish haqi holatlari
- **Qoralama** (DRAFT) — hisoblangan, tasdiqlanmagan
- **Tasdiqlangan** (CONFIRMED) — to'lashga tayyor
- **To'langan** (PAID) — yakuniy

### Avanslar boshqaruvi
- Avans so'rovini ko'rish
- Tasdiqlash yoki rad etish
- Tasdiqlangan avanslar ish haqidan avtomatik ushlanadi

### Moliyaviy hisobotlar
- Pul oqimi (daromad vs xarajat)
- Foyda va zarar
- Xarajat statistikasi (kategoriya bo'yicha, oy bo'yicha)

### Ko'rish imkoniyatlari
- Xodimlar ro'yxati
- Mijozlar ro'yxati (qarz holati)
- Buyurtmalar ro'yxati (sotuv summalarini tekshirish)
- Davomat ma'lumotlari
- Barcha hisobotlar

---

## 7. Operator

### Ko'rish imkoniyatlari
- O'z ishlab chiqarish loglarini ko'rish (nima ishlab chiqargan, qancha ishbay hisoblangan)
- O'z davomatini ko'rish (qaysi kunlar kelgan, soatlari)

> Operator tizimda hech narsa yarata olmaydi yoki o'zgartira olmaydi. Faqat o'ziga tegishli ma'lumotlarni ko'radi.

---

## Umumiy tizim imkoniyatlari

### Sotuv jarayoni
```
Sotuv menejeri: Mijoz tanlash → Mahsulot tanlash → Narx belgilash → To'lov turi → Buyurtma yaratish
                                                                                         ↓
Kassir: To'lov qabul qilish → Mijoz qarzi kamayadi ← ← ← ← ← ← ← ← ← ← ← (qarzga bo'lsa)
```

### Ishlab chiqarish jarayoni
```
Ish.chiq. boshlig'i: Mahsulot tanlash → Ishchi tanlash → Miqdor kiritish → Log yaratish
                                                                                  ↓
                                                              Mahsulot stocki oshadi
                                                              Ishbay summasi hisoblanadi
                                                              Lot yaratiladi
```

### Ish haqi jarayoni
```
Ish.chiq. boshlig'i: Davomat belgilash (har kuni)
                           ↓
Hisobchi: Ish haqi hisoblash → Tasdiqlash → To'lash
          (davomat + ishlab chiqarish + avanslar asosida)
```

### Moliya jarayoni
```
Kassir: To'lov qabul qilish → Daromad oshadi, Qarz kamayadi
Kassir: Xarajat kiritish → Xarajat oshadi
Hisobchi: Hisobotlar ko'rish → Foyda/zarar tahlili
Direktor: Dashboard → Barcha ko'rsatkichlar bir joyda
```

### Narx tizimi
- Har bir mahsulotda ikki narx:
  - **Tannarx** (costPrice) — mahsulotning tayyor bo'lish narxi
  - **Sotuv narxi** (price) — default sotuv narxi
- Sotuv paytida sotuv menejeri narxni **har bir mijoz uchun alohida o'zgartirishi** mumkin
- Foyda avtomatik hisoblanadi: sotuv narxi − tannarx

### Qarz tizimi
- Har bir mijozga qarz limiti belgilanadi
- Qarzga buyurtma berilganda: limit tekshiriladi, qarz oshadi
- To'lov qilinganda: qarz kamayadi
- Buyurtma bekor qilinganda: qarz tiklanadi
- Kassir va direktor qarzdorlar ro'yxatini ko'rishi mumkin

### Buyurtma holatlari
```
Kutilmoqda (PENDING) → Tasdiqlangan (CONFIRMED)
                    ↘ Bekor qilingan (CANCELLED) — stock tiklanadi, qarz qaytariladi
```
Bekor qilingan buyurtma qayta o'zgartirilmaydi.
