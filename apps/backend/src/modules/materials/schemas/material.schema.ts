import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaterialDocument = Material & Document;

@Schema({ timestamps: true })
export class Material {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  baseUnit: Types.ObjectId;

  @Prop({ default: 0 })
  currentStock: number;

  @Prop({ default: 0 })
  costPrice: number;

  @Prop({ default: 0 })
  minStock: number;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  defaultSupplier?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
