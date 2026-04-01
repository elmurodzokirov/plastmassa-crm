import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ _id: false })
export class SalesUnit {
  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  unit: Types.ObjectId;

  @Prop({ required: true })
  conversionFactor: number;

  @Prop({ required: true })
  price: number;
}

export const SalesUnitSchema = SchemaFactory.createForClass(SalesUnit);

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  baseUnit: Types.ObjectId;

  @Prop({ type: [SalesUnitSchema], default: [] })
  salesUnits: SalesUnit[];

  @Prop({ default: 0 })
  currentStock: number;

  @Prop({ default: 0 })
  costPrice: number;

  @Prop({ default: 0 })
  costPerUnit: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  pieceRate: number;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
