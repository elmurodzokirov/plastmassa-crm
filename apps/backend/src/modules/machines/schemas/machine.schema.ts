import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MachineDocument = HydratedDocument<Machine>;

@Schema({ timestamps: true })
export class Machine {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  model?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const MachineSchema = SchemaFactory.createForClass(Machine);
