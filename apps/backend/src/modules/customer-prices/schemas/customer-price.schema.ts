import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerPriceDocument = CustomerPrice & Document;

@Schema({ timestamps: true })
export class CustomerPrice {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;
}

export const CustomerPriceSchema = SchemaFactory.createForClass(CustomerPrice);
CustomerPriceSchema.index({ customer: 1, product: 1 }, { unique: true });
