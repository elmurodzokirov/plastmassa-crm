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

@Schema({ _id: false })
export class ProductionLogEdit {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  changedAt: Date;

  @Prop({ required: true })
  field: string;

  @Prop()
  oldValue: string;

  @Prop()
  newValue: string;
}

export const ProductionLogEditSchema = SchemaFactory.createForClass(ProductionLogEdit);

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

  // Shared by every log created together in one "Yangi ishlab chiqarish yozuvi"
  // submission, so the production list can group and edit them together as a
  // single document. Absent on logs created before this field existed.
  @Prop({ trim: true, index: true })
  batchNumber?: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, min: 0 })
  quantityProduced: number;

  // Simplified stanok/smena tracking (OEE-lite): machine + shift + hours worked are
  // shared across every line of one batch/document (like worker/date), while
  // quantityDefective is per-line (like quantityProduced), since defect counts can
  // differ by product within the same shift. Purely additive — none of this affects
  // stock, lots, StockMovement records, or earnedAmount/pieceRateAmount math.
  @Prop({ type: Types.ObjectId, ref: 'Machine' })
  machine?: Types.ObjectId;

  @Prop({ trim: true })
  machineName?: string;

  @Prop({ enum: ['DAY', 'NIGHT'] })
  shift?: string;

  @Prop({ min: 0 })
  hoursWorked?: number;

  @Prop({ default: 0, min: 0 })
  quantityDefective: number;

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

  // Audit trail: who changed what, and when, after this log was first created.
  @Prop({ type: [ProductionLogEditSchema], default: [] })
  editHistory: ProductionLogEdit[];

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
