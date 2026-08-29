# Sardoba Ko'za Plast CRM — Hisoblar haqida

## Birinchi ishga tushirish

Tizimda hech qanday foydalanuvchi bo'lmasa, login sahifasi o'rniga avtomatik
ravishda **"Tizimni sozlash"** (`/setup`) sahifasi ochiladi. Shu yerda bosh
administrator (Direktor rolidagi) hisobi yaratiladi:

- To'liq ism
- Login (username)
- Telefon raqam
- Parol (kamida 6 belgi)

Bu forma faqat `users` kolleksiyasi bo'sh bo'lganda ishlaydi — birinchi hisob
yaratilgandan so'ng avtomatik yopiladi.

## Keyingi xodimlarni qo'shish

Administrator kirgandan so'ng **Kadrlar → Xodimlar → Yangi xodim** orqali
qo'shimcha foydalanuvchilar (login, telefon, parol, rol) qo'shiladi.

## Kirish usullari

- **Telefon + Telegram OTP** (asosiy usul): xodim botga `/start` bosib
  telefon raqamini ulaydi, kirishda Telegram orqali tasdiqlash kodi keladi.
- **Login/Parol** (zaxira usul): login sahifasida "Login/Parol bilan kirish"
  tugmasi orqali.

## Rollar va ruxsatlar

Standart rollar (Direktor, Sotuv menejeri, Kassir, Omborchi, Ishlab chiqarish
boshlig'i, Hisobchi, Operator) va ularning ruxsatlari **Tizim → Rollar**
bo'limida ko'rish va tahrirlash mumkin.

## Mahalliy dev muhitda parolni tiklash

Agar mahalliy (localhost) muhitda mavjud foydalanuvchining parolini
unutgan bo'lsangiz, quyidagi skript orqali qayta o'rnatish mumkin (faqat
`.env`dagi `MONGODB_URI` ko'rsatgan bazaga ta'sir qiladi):

```bash
cd apps/backend
npx ts-node src/seeds/reset-local-password.ts <username> <yangi_parol>
```

> Diqqat: bu skriptni productionga qarshi ehtiyotkorlik bilan ishlating —
> to'g'ridan-to'g'ri bazadagi parolni almashtiradi.
