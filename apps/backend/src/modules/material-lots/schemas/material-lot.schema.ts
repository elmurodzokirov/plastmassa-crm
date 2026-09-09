import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaterialLotDocument = MaterialLot & Document;

@Schema({ timestamps: true })
export class MaterialLot {
  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  material: Types.ObjectId;

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

  @Prop({ required: true, enum: ['PURCHASE', 'ADJUSTMENT'], default: 'PURCHASE' })
  source: string;

  @Prop({ min: 0 })
  purchaseQuantity?: number;

  @Prop({ type: Types.ObjectId, ref: 'Unit' })
  purchaseUnit?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplier?: Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const MaterialLotSchema = SchemaFactory.createForClass(MaterialLot);

MaterialLotSchema.index({ material: 1, quantityRemaining: 1, createdAt: 1 });
