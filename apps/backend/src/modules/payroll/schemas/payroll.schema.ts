import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PayrollDocument = Payroll & Document;

@Schema({ timestamps: true })
export class Payroll {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, min: 1, max: 12 })
  month: number;

  @Prop({ default: 0 })
  baseSalary: number;

  @Prop({ enum: ['FIXED', 'PIECE_RATE'], default: 'FIXED' })
  salaryType: string;

  @Prop({ default: 0 })
  workingDays: number;

  @Prop({ default: 0 })
  presentDays: number;

  @Prop({ default: 0 })
  absentDays: number;

  @Prop({ default: 0 })
  lateDays: number;

  @Prop({ default: 0 })
  totalHoursWorked: number;

  @Prop({ default: 0 })
  overtimeHours: number;

  @Prop({ default: 0 })
  overtimeAmount: number;

  @Prop({ default: 0 })
  deductions: number;

  @Prop({ default: 0 })
  advancesTotal: number;

  @Prop({ default: 0 })
  bonus: number;

  @Prop({ default: 0 })
  productionEarnings: number;

  @Prop({ default: 0 })
  previousBalance: number;

  @Prop({ default: 0 })
  totalEarned: number;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop({ default: 0 })
  remainingBalance: number;

  @Prop({ default: 0 })
  netSalary: number;

  @Prop({ required: true, enum: ['DRAFT', 'CONFIRMED', 'PAID'], default: 'DRAFT' })
  status: string;

  @Prop({ trim: true })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  calculatedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);

PayrollSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });
