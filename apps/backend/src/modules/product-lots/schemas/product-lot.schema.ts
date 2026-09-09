import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductLotDocument = ProductLot & Document;

@Schema({ timestamps: true })
export class ProductLot {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true, trim: true })
  lotNumber: string;

  // Shared by every lot created in the same "Yangi kirim" submission, so the
  // purchase-invoice UI can group and edit them together. Absent on lots created
  // before this field existed, and on production/adjustment lots (they aren't invoices).
  @Prop({ trim: true, index: true })
  batchNumber?: string;

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

  @Prop({ required: true, enum: ['PURCHASE', 'PRODUCTION', 'ADJUSTMENT'], default: 'PURCHASE' })
  source: string;

  @Prop({ type: Types.ObjectId, ref: 'ProductionLog' })
  productionLog: Types.ObjectId;

  @Prop({ min: 0 })
  purchaseQuantity: number;

  @Prop({ type: Types.ObjectId, ref: 'Unit' })
  purchaseUnit: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplier: Types.ObjectId;

  @Prop({ trim: true })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductLotSchema = SchemaFactory.createForClass(ProductLot);

ProductLotSchema.index({ product: 1, quantityRemaining: 1, createdAt: 1 });
