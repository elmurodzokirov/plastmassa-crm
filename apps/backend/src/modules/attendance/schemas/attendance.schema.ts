import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'], default: 'PRESENT' })
  status: string;

  @Prop({ default: 0, min: 0, max: 24 })
  hoursWorked: number;

  @Prop({ default: 0, min: 0 })
  overtimeHours: number;

  @Prop({ trim: true })
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  markedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Compound index: one record per user per date
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });
