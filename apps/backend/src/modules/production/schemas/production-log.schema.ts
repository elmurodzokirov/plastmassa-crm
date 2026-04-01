import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductionLogDocument = ProductionLog & Document;

@Schema({ _id: false })
export class LotConsumption {
  @Prop({ type: Types.ObjectId, ref: 'MaterialLot', required: true })
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
export class MaterialUsed {
  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  material: Types.ObjectId;

  @Prop({ required: true })
  materialName: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  unit: Types.ObjectId;

  @Prop({ required: true })
  unitName: string;

  @Prop({ default: 0 })
  cost: number;

  @Prop({ type: [LotConsumptionSchema], default: [] })
  lotsConsumed: LotConsumption[];
}

export const MaterialUsedSchema = SchemaFactory.createForClass(MaterialUsed);

@Schema({ timestamps: true })
export class ProductionLog {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  unit: Types.ObjectId;

  @Prop({ required: true })
  unitName: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, min: 0 })
  quantityProduced: number;

  @Prop({ type: [MaterialUsedSchema], default: [] })
  materialsUsed: MaterialUsed[];

  @Prop({ default: 0 })
  totalMaterialCost: number;

  @Prop({ default: 0 })
  costPerUnitProduced: number;

  @Prop({ default: 0 })
  earnedAmount: number;

  @Prop({ default: 0 })
  pieceRateAmount: number;

  @Prop({ trim: true })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  worker: Types.ObjectId;

  @Prop({ enum: ['PENDING', 'APPROVED'], default: 'APPROVED' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductionLogSchema = SchemaFactory.createForClass(ProductionLog);
