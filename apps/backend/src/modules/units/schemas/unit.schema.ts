import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UnitDocument = HydratedDocument<Unit>;

export enum UnitTypeEnum {
  WEIGHT = 'WEIGHT',
  LENGTH = 'LENGTH',
  QUANTITY = 'QUANTITY',
  VOLUME = 'VOLUME',
}

@Schema({ timestamps: true })
export class Unit {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true, enum: UnitTypeEnum })
  type: UnitTypeEnum;

  createdAt: Date;
  updatedAt: Date;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);
