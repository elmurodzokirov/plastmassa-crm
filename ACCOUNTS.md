# Plastmassa CRM — Foydalanuvchi hisoblar

## Login sahifasi

`http://localhost:6001/login`

## Hisoblar

| Rol | Username | Parol | Ism | Telefon |
|-----|----------|-------|-----|---------|
| **Direktor** | admin | admin123 | Administrator | +998900000000 |
| **Sotuv menejeri** | sales1 | password123 | Aziz Karimov | +998901111111 |
| **Operator** | operator1 | password123 | Bobur Toshmatov | +998902222222 |
| **Operator** | operator2 | password123 | Jasur Mirzayev | +998902222233 |
| **Omborchi** | warehouse1 | password123 | Sardor Aliyev | +998903333333 |
| **Kassir** | cashier1 | password123 | Nilufar Rahimova | +998904444444 |
| **Ish.chiq. boshlig'i** | production1 | password123 | Rustam Ergashev | +998905555555 |
| **Hisobchi** | accountant1 | password123 | Madina Yusupova | +998906666666 |

## Rollar va ruxsatlar

### Direktor
Barcha ruxsatlarga ega (tizim roli, o'zgartirib bo'lmaydi)

### Sotuv menejeri
- Mijozlar: yaratish, ko'rish, tahrirlash, o'chirish
- Buyurtmalar: yaratish, ko'rish, tahrirlash, o'chirish
- Mahsulotlar: ko'rish
- Ombor: ko'rish
- Hisobotlar: ko'rish

### Kassir
- Moliya: yaratish, ko'rish, tahrirlash (to'lov, xarajat)
- Mijozlar: ko'rish
- Buyurtmalar: ko'rish
- Ish haqi: ko'rish
- Hisobotlar: ko'rish

### Omborchi
- Mahsulotlar: yaratish, ko'rish, tahrirlash, o'chirish
- Ombor: yaratish, ko'rish, tahrirlash
- Ishlab chiqarish: ko'rish
- Buyurtmalar: ko'rish
- Hisobotlar: ko'rish

### Ishlab chiqarish boshlig'i
- Ishlab chiqarish: yaratish, ko'rish, tahrirlash
- Mahsulotlar: ko'rish
- Ombor: ko'rish
- Davomat: yaratish, ko'rish, tahrirlash
- Hisobotlar: ko'rish

### Hisobchi
- Ish haqi: yaratish, ko'rish, tahrirlash
- Moliya: yaratish, ko'rish, tahrirlash
- Davomat: ko'rish
- Mijozlar: ko'rish
- Buyurtmalar: ko'rish
- Hisobotlar: ko'rish
- Foydalanuvchilar: ko'rish

### Operator
- Ishlab chiqarish: ko'rish
- Davomat: ko'rish

## Seed ishga tushirish

```bash
npm run seed
```

> Diqqat: seed ishga tushirishdan oldin MongoDB da `plastmassa_crm` bazasi bo'sh bo'lishi kerak.
