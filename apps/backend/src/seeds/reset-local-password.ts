/**
 * Mahalliy dev muhit uchun: tiklangan (restored) production ma'lumotlariga
 * tegmasdan, faqat bitta foydalanuvchining parolini ma'lum qiymatga o'zgartiradi.
 *
 * Ishlatish:
 *   npx ts-node src/seeds/reset-local-password.ts <username> <yangi_parol>
 *
 * Misol:
 *   npx ts-node src/seeds/reset-local-password.ts admin admin123
 *
 * Agar <username> berilmasa, birinchi topilgan (eng birinchi yaratilgan) userni oladi.
 */
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const UserSchema = new mongoose.Schema(
  {
    fullName: String,
    username: { type: String, unique: true },
    password: String,
    phone: String,
    role: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
  },
  { timestamps: true, strict: false },
);

async function main() {
  const [, , usernameArg, passwordArg] = process.argv;
  const newPassword = passwordArg || 'admin123';

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plastmassa_crm';
  await mongoose.connect(uri);
  console.log('Ulandi:', uri);

  const UserModel = mongoose.model('User', UserSchema, 'users');

  const user = usernameArg
    ? await UserModel.findOne({ username: usernameArg })
    : await UserModel.findOne().sort({ createdAt: 1 });

  if (!user) {
    console.error('Foydalanuvchi topilmadi. Mavjud usernamelar:');
    const all = await UserModel.find({}, 'username fullName').lean();
    all.forEach((u: any) => console.log(' -', u.username, '(' + u.fullName + ')'));
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(newPassword, salt);
  user.password = hashed;
  await user.save();

  console.log(`✓ "${user.username}" foydalanuvchisining paroli "${newPassword}" ga o'zgartirildi.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
