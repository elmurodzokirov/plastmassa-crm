import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class LotConsumption {
  @Prop({ type: Types.ObjectId, ref: 'ProductLot', required: true })
  lot: Types.ObjectId;

  @Prop({ required: true })
  lotNumber: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitCost: number;

  @Prop({ required: true, min: 0 })
  totalCost: number;
}

export const LotConsumptionSchema = SchemaFactory.createForClass(LotConsumption);

@Schema({ _id: false })
export class OrderItem {
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

  @Prop({ required: true, min: 0.001 })
  baseQuantity: number;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  baseUnit: Types.ObjectId;

  @Prop({ required: true })
  baseUnitName: string;

  @Prop({ default: 0 })
  originalPrice: number;

  @Prop({ default: 0, min: 0, max: 100 })
  discountPercent: number;

  @Prop({ default: 0 })
  discountAmount: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ default: 0 })
  costPerUnit: number;

  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ type: [LotConsumptionSchema], default: [] })
  lotConsumptions: LotConsumption[];
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ default: 0, min: 0 })
  initialPaidAmount: number;

  @Prop({ default: 0, min: 0 })
  paidAmount: number;

  @Prop({
    required: true,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    default: 'PENDING',
  })
  status: string;

  @Prop({ required: true, enum: ['CASH', 'TRANSFER', 'DEBT'] })
  paymentType: string;

  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ default: 0 })
  grossProfit: number;

  @Prop({ type: Date })
  dueDate: Date;

  @Prop({ trim: true })
  deliveredTo: string;

  @Prop({ type: Date })
  deliveredAt: Date;

  @Prop({ trim: true })
  deliveryNotes: string;

  @Prop({ unique: true, sparse: true })
  invoiceNumber: string;

  @Prop({ trim: true })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
