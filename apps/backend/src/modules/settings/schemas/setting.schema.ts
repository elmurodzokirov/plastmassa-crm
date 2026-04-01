import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema({ timestamps: true })
export class Setting {
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  value: any;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ required: true, trim: true })
  group: string;

  @Prop({ default: 'text', enum: ['text', 'number', 'boolean', 'json'] })
  type: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);

SettingSchema.index({ group: 1 });
