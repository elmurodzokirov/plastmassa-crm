import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from './schemas/setting.schema';

const DEFAULT_SETTINGS = [
  { key: 'company.name', value: 'PLASTMASSA MChJ', label: 'Kompaniya nomi', group: 'company', type: 'text' },
  { key: 'company.phone', value: '', label: 'Telefon raqam', group: 'company', type: 'text' },
  { key: 'company.address', value: '', label: 'Manzil', group: 'company', type: 'text' },
  { key: 'company.director', value: '', label: 'Direktor', group: 'company', type: 'text' },
  { key: 'finance.currency', value: 'UZS', label: 'Valyuta', group: 'finance', type: 'text' },
  { key: 'finance.taxRate', value: 12, label: 'Soliq stavkasi (%)', group: 'finance', type: 'number' },
  { key: 'production.workingDays', value: 26, label: 'Oylik ish kunlari', group: 'production', type: 'number' },
  { key: 'production.workingHours', value: 8, label: 'Kunlik ish soatlari', group: 'production', type: 'number' },
  { key: 'production.overtimeRate', value: 1.5, label: "Qo'shimcha ish stavkasi", group: 'production', type: 'number' },
];

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name)
    private readonly settingModel: Model<SettingDocument>,
  ) {}

  async findAll() {
    const settings = await this.settingModel.find().sort({ group: 1, key: 1 }).exec();

    const grouped: Record<string, any[]> = {};
    for (const setting of settings) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = [];
      }
      grouped[setting.group].push(setting);
    }

    return grouped;
  }

  async findByKey(key: string) {
    const setting = await this.settingModel.findOne({ key }).exec();
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
    return setting;
  }

  async updateByKey(key: string, value: any) {
    const setting = await this.settingModel
      .findOneAndUpdate({ key }, { value }, { new: true })
      .exec();

    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    return setting;
  }

  async seed() {
    const operations = DEFAULT_SETTINGS.map((setting) => ({
      updateOne: {
        filter: { key: setting.key },
        update: { $setOnInsert: setting },
        upsert: true,
      },
    }));

    await this.settingModel.bulkWrite(operations);

    return { message: 'Default settings seeded successfully' };
  }
}
