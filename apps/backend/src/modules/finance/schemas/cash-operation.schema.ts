import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CashOperationDocument = CashOperation & Document;

export const CASH_IN_KINDS = ['OPENING', 'CAPITAL_IN', 'LOAN_IN', 'OTHER_IN'] as const;
export const CASH_OUT_KINDS = ['WITHDRAWAL', 'LOAN_REPAYMENT', 'OTHER_OUT'] as const;
export const CASH_ACCOUNTS = ['CASH', 'BANK', 'CARD'] as const;

/** Manual cash-book entry that isn't tied to an order/expense/supplier — the
 *  opening balance, owner top-ups/withdrawals, loans, etc. */
@Schema({ timestamps: true })
export class CashOperation {
  @Prop({
    required: true,
    enum: [...CASH_IN_KINDS, ...CASH_OUT_KINDS],
  })
  kind: string;

  @Prop({ required: true, enum: ['IN', 'OUT'] })
  direction: string;

  @Prop({ required: true, enum: [...CASH_ACCOUNTS], default: 'CASH' })
  account: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  date: Date;

  @Prop({ trim: true })
  notes: string;

  @Prop({ enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' })
  status: string;

  @Prop()
  cancelledAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy: Types.ObjectId;

  @Prop({ trim: true })
  cancelReason: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const CashOperationSchema = SchemaFactory.createForClass(CashOperation);

CashOperationSchema.index({ date: 1 });
