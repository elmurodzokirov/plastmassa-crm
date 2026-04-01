import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReturnDocument = Return & Document;

@Schema({ _id: false })
export class ReturnItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  unit: Types.ObjectId;

  @Prop({ required: true })
  unitName: string;

  @Prop({ required: true, min: 0.001 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  total: number;
}

export const ReturnItemSchema = SchemaFactory.createForClass(ReturnItem);

@Schema({ timestamps: true })
export class Return {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId;

  @Prop({ type: [ReturnItemSchema], required: true })
  items: ReturnItem[];

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ enum: ['PENDING', 'APPROVED'], default: 'PENDING' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const ReturnSchema = SchemaFactory.createForClass(Return);
