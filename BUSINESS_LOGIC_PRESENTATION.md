# Plastmassa CRM — Biznes logika tavsifi

---

## Kirish

Plastmassa CRM — plastmassa ishlab chiqarish korxonasi uchun yaratilgan to'liq boshqaruv tizimi. Tizim mijozlar, buyurtmalar, to'lovlar, xom ashyo va tayyor mahsulot ombori, ishlab chiqarish jarayoni, xodimlar davomati, ish haqi hisob-kitobi hamda moliyaviy hisobotlarni boshqaradi. Har bir xodim o'z roliga mos ruxsatlar asosida tizimdan foydalanadi.

---

## 1. Tizimga kirish

Tizimga kirishning ikkita yo'li mavjud.

Asosiy usul — Telegram orqali bir martalik kod (OTP). Xodim telefon raqamini kiritadi, tizim unga Telegram bot orqali 6 xonali kod yuboradi. Kod 5 daqiqa ichida amal qiladi va maksimum 3 marta noto'g'ri kiritish mumkin. Agar 3 marta xato kiritilsa yoki vaqt o'tsa, yangi kod so'rash kerak bo'ladi. Har safar yangi kod so'ralganda avvalgi ishlatilmagan kodlar bekor qilinadi.

Ikkinchi usul — foydalanuvchi nomi va parol orqali kirish. Bu usul faqat administrator uchun zaxira variant sifatida mavjud.

Muvaffaqiyatli kirishdan so'ng tizim ikkita token beradi. Access token 1 kun, refresh token 7 kun amal qiladi. Token ichida foydalanuvchining barcha ruxsatlari va rol nomi saqlanadi. Token yaratishdan oldin rol har doim bazadan qayta yuklanadi — bu xodim ruxsatlari o'zgarganda eski tokenlar bilan ishlashning oldini oladi.

Telegram bot bilan bog'lanish uchun xodim avval botga /start buyrug'ini yuboradi, so'ng telefon raqamini ulashadi. Bot faqat xodimning o'z telefon raqamini qabul qiladi — boshqa odamning raqamini yuborish mumkin emas. Agar telefon raqam tizimda topilmasa, xodimga administrator bilan bog'lanish tavsiya etiladi.

---

## 2. Foydalanuvchilar va rollar

Har bir foydalanuvchining foydalanuvchi nomi va telefon raqami yagona bo'lishi shart. Parollar bcrypt algoritmi orqali shifrlangan holda saqlanadi. Foydalanuvchi o'chirilganda u bazadan o'chirilmaydi — faqat faol emas deb belgilanadi. Bu barcha tarixiy ma'lumotlar saqlanib qolishi uchun muhim.

Tizimda rollar bazada saqlanadi va dinamik ravishda boshqariladi. Har bir rolga alohida ruxsatlar beriladi. Ruxsatlar tizimi 12 ta soha bo'yicha tashkil etilgan: foydalanuvchilar, mijozlar, mahsulotlar, xom ashyolar, buyurtmalar, ombor, ishlab chiqarish, davomat, ish haqi, moliya, hisobotlar va sozlamalar. Har bir sohada yaratish, ko'rish, tahrirlash va o'chirish amallari mavjud, lekin ba'zi sohalarda o'chirish ruxsati yo'q.

Tizimda to'rtta tayyor rol mavjud. Boshliq — barcha ruxsatlarga ega, tizim roli sifatida himoyalangan, o'zgartirish yoki o'chirish mumkin emas. Boshqaruvchi — foydalanuvchilarni boshqarishdan tashqari barcha imkoniyatlarga ega. Kassir — faqat buyurtmalar va mijozlarni ko'rish, moliya bilan ishlash, ish haqini ko'rish va hisobotlarni ko'rish mumkin. Omborchi — xom ashyo bilan to'liq ishlash, mahsulotlarni ko'rish, ombor harakatlari va ishlab chiqarishni ko'rish mumkin.

Administrator yangi rollar yaratishi va mavjud rollarga ruxsatlar berishi mumkin. Faqat tizim rollari himoyalangan — ularni o'zgartirish va o'chirish taqiqlangan.

---

## 3. Mijozlar va qarz boshqaruvi

Mijozlar ro'yxati ism, telefon raqam va boshqa ma'lumotlar bilan saqlanadi. Har bir mijozning joriy qarzi va qarz limiti mavjud. Mijoz o'chirilganda u faol emas deb belgilanadi.

Qarz boshqaruvi tizimning eng muhim qoidalaridan biri. Mijozning joriy qarz summasi faqat ikkita joy orqali o'zgarishi mumkin — buyurtmalar va to'lovlar. Boshqa hech qaysi modul qarzni bevosita o'zgartira olmaydi. Qarz summasi oddiygina yangi qiymatga o'zgartirilmaydi, balki atomik ravishda oshiriladi yoki kamaytiriladi. Bu parallel so'rovlarda ma'lumot yo'qolishining oldini oladi.

Qarzli buyurtma yaratilganda qarz oshadi. To'lov qabul qilinganda qarz kamayadi. Buyurtma bekor qilinganda qarz tiklanadi.

Tizim qarzdorlar ro'yxatini ko'rsatish imkoniyatiga ega — eng ko'p qarzdan kamayish tartibida. Qarz xulosasi umumiy qarz summasi, qarzdorlar soni va o'rtacha qarzni ko'rsatadi.

---

## 4. O'lchov birliklari

Tizimda to'rt turdagi o'lchov birligi mavjud: og'irlik, uzunlik, soni va hajm. Birliklar orasida konvertatsiya koeffitsientlari saqlanadi. Konvertatsiya ikki tomonlama ishlaydi — agar A dan B ga koeffitsient mavjud bo'lsa, B dan A ga avtomatik teskari hisob qilinadi. Bir xil birlik bo'lsa, qiymat o'zgarmaydi. Konvertatsiya topilmasa, tizim xato beradi.

Birliklar boshqa modullardan farqli ravishda bazadan to'liq o'chiriladi.

---

## 5. Xom ashyo boshqaruvi

Har bir xom ashyo asosiy o'lchov birligida saqlanadi. Joriy zaxira miqdori va o'rtacha tannarx himoyalangan maydonlar — ularni oddiy tahrirlash orqali o'zgartirish mumkin emas. Faqat maxsus ichki metodlar orqali o'zgaradi.

Xom ashyo lotlar bilan boshqariladi. Har bir lot kirim qilinganda unikal raqam beriladi — LOT-YYYYMMDD-XXX formatida, har kuni 001 dan boshlanadi. Agar sotib olish birligi xom ashyoning asosiy birligidan farq qilsa, miqdor avtomatik konvertatsiya qilinadi va birlik narxi qayta hisoblanadi. Masalan, 100 kg sotib olingan bo'lsa, lekin asosiy birlik tonna bo'lsa — miqdor 0.1 tonnaga, narx esa tonnaga qayta hisoblanadi. Bunda umumiy summa o'zgarmaydi.

Xom ashyo iste'mol qilinganda FIFO (birinchi kirgan — birinchi chiqdi) usuli qo'llaniladi. Eng avval kirim qilingan lotdan boshlab iste'mol qilinadi. Agar bitta lot yetarli bo'lmasa, keyingisiga o'tiladi. Har bir lotdan qancha olinganini va uning narxi saqlanadi. Agar barcha lotlardagi jami miqdor yetarli bo'lmasa, tizim barcha olingan miqdorlarni qaytaradi va xato beradi — bu holda hech narsa o'zgarmaydi.

---

## 6. Mahsulotlar boshqaruvi

Har bir mahsulotning asosiy narxi, asosiy birligi va ixtiyoriy ishbay stavkasi mavjud. Mahsulotda retsept belgilanishi mumkin — qaysi xom ashyodan qancha kerak. Retsept yaratilganda xom ashyo nomlari va birlik nomlari snapshot sifatida saqlanadi. Bu degani, keyinchalik xom ashyo nomi o'zgarsa ham, retseptdagi nom o'zgarmaydi.

Mahsulotda bir nechta sotish birligi bo'lishi mumkin, har birining o'z konvertatsiya koeffitsienti va narxi bor. Masalan, mahsulot kilogrammda saqlanishi, lekin dona yoki qop sifatida sotilishi mumkin.

Mahsulot lotlari ham FIFO usulida boshqariladi. Lotlar ikki manbadan kelib tushadi — sotib olish yoki ishlab chiqarish. Sotib olish orqali lot yaratilganda mahsulot zaxirasi avtomatik oshadi. Ishlab chiqarish orqali lot yaratilganda esa zaxirani ishlab chiqarish moduli boshqaradi.

Buyurtma bekor qilinganda mahsulot lotlari teskari tartibda tiklanadi — eng oxirgi lotlardan boshlab. Bu LIFO (oxirgi kirgan — birinchi chiqdi) usuli, faqat tiklash uchun.

---

## 7. Ombor harakatlari

Barcha zaxira o'zgarishlari ombor harakatlari orqali qayd etiladi. Uch turdagi harakat mavjud.

Kirim harakati zaxirani oshiradi. Chiqim harakati zaxirani kamaytiradi — bunda avval yetarli zaxira borligini tekshiradi, yetarli bo'lmasa xato beradi. Tuzatish harakati zaxirani berilgan qiymatga olib keladi — masalan, inventarizatsiya natijasida haqiqiy miqdor kiritiladi.

Har bir harakatda faqat bitta — yoki mahsulot, yoki xom ashyo ko'rsatiladi. Ikkalasi bir vaqtda bo'lishi mumkin emas. Har bir harakatda sabab ko'rsatilishi shart — bu audit izi uchun muhim. Harakatga bog'langan hujjat ham saqlanadi — masalan, buyurtma raqami yoki ishlab chiqarish logi.

Muhim nuqta — ombor harakati faqat qayd mexanizmi. U lotlarni iste'mol qilmaydi va narxlarni o'zgartirmaydi. Bu ishlarni tegishli modullar bajaradi.

---

## 8. Buyurtmalar

Har bir buyurtmaga unikal raqam beriladi — ORD-YYYYMMDD-XXX formatida, har kuni 001 dan boshlanadi.

Buyurtma yaratilganda har bir element uchun mahsulot tekshiriladi. Narx elementda ko'rsatilgan bo'lsa o'sha ishlatiladi, aks holda mahsulotning joriy narxi olinadi. Bu narxni buyurtma paytida o'zgartirish imkonini beradi. Mahsulot nomi, birlik nomi va narx snapshot sifatida saqlanadi — keyinchalik mahsulot nomi yoki narxi o'zgarsa ham, buyurtma tarixida asl qiymatlar ko'rinadi.

Har bir element uchun mahsulot lotlari FIFO tartibda iste'mol qilinadi. Bu orqali tannarx aniqlanadi — qaysi lotlardan qancha olingan va ular qancha turgan. Umumiy tannarx, birlik tannarxi va yalpi foyda hisoblanadi. Yalpi foyda — buyurtma summasi minus tannarx.

Mahsulot zaxirasi kamaytiriladi va chiqim harakati qayd etiladi.

To'lov turi bo'yicha uchta variant mavjud. Naqd va o'tkazma to'lovlarda to'langan summa buyurtma summasiga teng deb hisoblanadi. Qarzga buyurtmada to'langan summa alohida ko'rsatiladi — farqi mijozning qarziga qo'shiladi.

Buyurtma holatlari: kutilmoqda, tasdiqlangan, yetkazilgan va bekor qilingan. Bekor qilingan buyurtma qayta o'zgartirilmaydi — bu yakuniy holat. Yetkazilgan buyurtmani bekor qilish mumkin emas.

Buyurtma bekor qilinganda barcha jarayonlar teskari bajariladi. Mahsulot zaxirasi tiklanadi, lotlar teskari tartibda tiklanadi, kirim harakati qayd etiladi. Agar qarzga buyurtma bo'lsa, mijoz qarzi kamaytiriladi.

---

## 9. To'lovlar

To'lov yaratilganda mijoz topilishi va faol bo'lishi kerak. Agar buyurtma ko'rsatilgan bo'lsa, u ham topilishi va aynan shu mijozga tegishli bo'lishi kerak.

To'lov har doim mijozning joriy qarzini kamaytiradi. Agar buyurtma ko'rsatilgan bo'lsa, buyurtmaning to'langan summasi ham oshiriladi.

Bitta buyurtmaga bir nechta to'lov qilish mumkin. Shuningdek, buyurtmasiz to'lov ham mumkin — bu mijozning umumiy qarzini to'lash uchun.

---

## 10. Ishlab chiqarish

Ishlab chiqarish logi yaratilganda mahsulot va ishlab chiqarilgan miqdor ko'rsatiladi. Materiallar ikki yo'l bilan aniqlanadi. Agar to'g'ridan to'g'ri ko'rsatilsa, aynan o'sha materiallar ishlatiladi. Aks holda mahsulotning retseptidan avtomatik hisoblanadi — har bir xom ashyoning birlikdagi miqdori ishlab chiqarilgan miqdorga ko'paytiriladi.

Har bir xom ashyo uchun lotlar FIFO tartibda iste'mol qilinadi va tannarx hisoblanadi. Xom ashyo zaxirasi kamaytiriladi. So'ng mahsulot loti yaratiladi — uning birlik tannarxi barcha xom ashyo tannarxlarining yig'indisi bo'lingan ishlab chiqarilgan miqdorga teng. Mahsulot zaxirasi oshiriladi.

Moliyaviy ko'rsatkichlar ham hisoblanadi. Hisoblangan daromad — ishlab chiqarilgan miqdor ko'paytirilgan mahsulot narxiga. Ishbay summasi — ishlab chiqarilgan miqdor ko'paytirilgan mahsulotning ishbay stavkasiga. Bu ish haqi hisob-kitobida ishlatiladi.

Barcha o'zgarishlar ombor harakatlari orqali qayd etiladi — har bir xom ashyo uchun chiqim va mahsulot uchun kirim.

---

## 11. Davomat

Xodimning davomati besh holatda qayd etiladi: ishga kelgan, yarim kun, kechikkan, kelmagan va ta'tilda. Har bir holatga mos default ish soatlari belgilangan — kelgan 8 soat, yarim kun 4 soat, kechikkan 7 soat, kelmagan va ta'tilda 0 soat. Agar aniq ish soati ko'rsatilsa, u ishlatiladi.

Sana har doim UTC ning boshiga normalizatsiya qilinadi — bu bitta kunga bitta yozuv bo'lishini ta'minlaydi. Agar bir xil xodim va sana uchun yozuv mavjud bo'lsa, u yangilanadi.

Oylik hisobot har bir holat bo'yicha kunlar sonini, jami ish soatlari va qo'shimcha ish soatlarini hisoblaydi.

---

## 12. Avanslar

Avans yaratilganda u kutilmoqda holatida bo'ladi. Undan faqat tasdiqlangan yoki rad etilgan holatga o'tish mumkin. Bir marta qaror qabul qilingandan keyin uni o'zgartirish mumkin emas. Tasdiqlagan xodim ham saqlanadi.

Faqat tasdiqlangan avanslar ish haqi hisob-kitobida hisobga olinadi.

---

## 13. Ish haqi hisob-kitobi

Tizimda ikkita ish haqi turi mavjud — oylikchi va ishbaychi.

Oylikchi xodimlar uchun kunlik stavka oylik maosh bo'lingan 26 ish kuniga teng. Hisoblangan ish haqi — kunlik stavka ko'paytirilgan ishga kelgan kunlar soniga, qo'shimcha yarim stavkada kechikkan va yarim kun ishlagan kunlar. Qo'shimcha ish soatlari alohida hisoblanadi — kunlik stavkaning soatlik qismiga 1.5 koeffitsient qo'llaniladi. Jami hisoblangan summa — asosiy ish haqi, qo'shimcha ish haqi va bonus yig'indisi.

Ishbaychi xodimlar uchun ish haqi shu oydagi barcha ishlab chiqarish loglaridan ishbay summalarining yig'indisi hisoblanadi. Asosiy maosh va qo'shimcha ish haqi hisoblanmaydi. Jami — ishlab chiqarish daromadi va bonus yig'indisi.

Yakuniy hisob-kitob ikkala tur uchun bir xil. To'lanadigan summa — jami hisoblangan summa, qo'shimcha oldingi oy qoldig'i, minus ushlamalar va avanslar. Qoldiq — jami hisoblangandan to'langanni ayirgandagi farq. Bu qoldiq keyingi oyga o'tadi.

Barcha pul qiymatlari butun songacha yaxlitlanadi.

Ish haqi holatlari: qoralama, tasdiqlangan va to'langan. To'langan holatdan boshqa holatga o'tish mumkin emas. Bitta xodim uchun bitta oyda bitta ish haqi yozuvi bo'ladi — mavjud bo'lsa yangilanadi.

---

## 14. Xarajatlar

Xarajatlar kategoriya, summa va sana bilan qayd etiladi. To'lov usuli ko'rsatilmasa naqd deb hisoblanadi. Xarajatlar bazadan to'liq o'chirilishi mumkin — bu boshqa modullardan farqli.

Statistika kategoriya bo'yicha va oy bo'yicha guruhlangan holda taqdim etiladi.

---

## 15. Moliyaviy hisobotlar

Pul oqimi hisoboti belgilangan davr uchun barcha to'lovlar yig'indisini daromad, barcha xarajatlar yig'indisini chiqim sifatida ko'rsatadi. Sof pul oqimi — daromad minus chiqim. Oylik pul oqimi yil davomida 12 oy uchun alohida ko'rsatiladi.

Moliyaviy xulosa umumiy daromad, umumiy xarajat, umumiy qarz va sof foydani o'z ichiga oladi.

Foyda va zarar hisoboti daromadni mahsulotlar bo'yicha, xarajatlarni kategoriyalar bo'yicha taqsimlaydi. Bekor qilingan buyurtmalar hisobga olinmaydi.

---

## 16. Dashboard

Bosh sahifa quyidagi ko'rsatkichlarni real vaqtda ko'rsatadi: jami mijozlar soni, faol buyurtmalar soni, joriy oydagi daromad va xarajat, umumiy qarz, bugungi ishlab chiqarish soni, faol xodimlar soni va zaxirasi kam qolgan mahsulotlar soni.

Oxirgi 5 ta buyurtma va to'lov ko'rsatiladi. Daromad trendi oxirgi 6 oy uchun oylik grafik shaklida taqdim etiladi.

---

## 17. Hisobotlar

Sotuv hisoboti buyurtmalarni kun, hafta yoki oy bo'yicha guruhlaydi. Bekor qilingan buyurtmalar chiqarib tashlanadi. Eng ko'p sotilgan 10 ta mahsulot va eng ko'p xarid qilgan 10 ta mijoz alohida ko'rsatiladi.

Ishlab chiqarish hisoboti mahsulot bo'yicha va ishchi bo'yicha jami miqdor va daromadni, kunlik taqsimotni ko'rsatadi.

Ombor hisoboti mahsulot va xom ashyo zaxiralarini, zaxirasi kam qolgan materiallarni ko'rsatadi. Kam qolgan deb faqat minimal zaxira belgilangan va unga yetmagan materiallar hisoblanadi.

Davomat hisoboti har bir faol xodim uchun kelgan, kelmagan, kechikkan kunlar soni, ish soatlari va qo'shimcha ish soatlarini ko'rsatadi. Umumiy davomat foizi ham hisoblanadi.

---

## 18. Sozlamalar

Tizimda kompaniya ma'lumotlari, moliyaviy sozlamalar va ishlab chiqarish sozlamalari mavjud. Kompaniya nomi, telefoni, manzili va direktor ismi saqlanadi. Moliyaviy sozlamalar valyuta va soliq stavkasini o'z ichiga oladi. Ishlab chiqarish sozlamalari oydagi ish kunlari soni, kunlik ish soatlari va qo'shimcha ish koeffitsientini belgilaydi.

Barcha sozlamalar boshlang'ich qiymatlari bilan yaratiladi va xavfsiz qayta ishga tushirish mumkin.

---

## Asosiy tizim qoidalari xulosasi

Birinchidan, barcha zaxira o'zgarishlari lotlar orqali kuzatiladi. Xom ashyo va mahsulotlar FIFO usulida iste'mol qilinadi — eng eski lotdan boshlanadi. Bu tannarxni aniq hisoblash imkonini beradi.

Ikkinchidan, qarz faqat buyurtma va to'lov orqali o'zgaradi. Boshqa hech qanday modul qarzga tegishi mumkin emas.

Uchinchidan, buyurtma va ishlab chiqarish paytida narxlar, nomlar va birliklar snapshot sifatida saqlanadi. Bu tarixiy aniqlikni ta'minlaydi.

To'rtinchidan, bekor qilish barcha jarayonlarni teskari bajaradi — zaxira tiklanadi, lotlar tiklanadi, qarz tiklanadi.

Beshinchidan, barcha pul qiymatlari O'zbek so'mida, butun sonda saqlanadi. Tiyin ishlatilmaydi.

Oltinchidan, aksariyat ma'lumotlar soft delete orqali o'chiriladi — bazada qoladi, lekin faol emas deb belgilanadi. Faqat o'lchov birliklari va xarajatlar to'liq o'chiriladi.
