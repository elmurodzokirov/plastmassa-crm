import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplierPaymentDocument = SupplierPayment & Document;

@Schema({ timestamps: true })
export class SupplierPayment {
  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplier: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, enum: ['CASH', 'TRANSFER', 'CARD'] })
  type: string;

  @Prop({ trim: true })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const SupplierPaymentSchema = SchemaFactory.createForClass(SupplierPayment);
