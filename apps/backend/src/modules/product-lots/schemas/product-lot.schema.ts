import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductLotDocument = ProductLot & Document;

@Schema({ timestamps: true })
export class ProductLot {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true, trim: true })
  lotNumber: string;

  @Prop({ required: true, min: 0.001 })
  quantity: number;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  unit: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  unitCost: number;

  @Prop({ required: true, min: 0 })
  totalCost: number;

  @Prop({ required: true, min: 0 })
  quantityRemaining: number;

  @Prop({ required: true, enum: ['PURCHASE', 'PRODUCTION'], default: 'PURCHASE' })
  source: string;

  @Prop({ type: Types.ObjectId, ref: 'ProductionLog' })
  productionLog: Types.ObjectId;

  @Prop({ min: 0 })
  purchaseQuantity: number;

  @Prop({ type: Types.ObjectId, ref: 'Unit' })
  purchaseUnit: Types.ObjectId;

  @Prop({ trim: true })
  supplier: string;

  @Prop({ trim: true })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductLotSchema = SchemaFactory.createForClass(ProductLot);

ProductLotSchema.index({ product: 1, quantityRemaining: 1, createdAt: 1 });
