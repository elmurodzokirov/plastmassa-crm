import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Unit } from './unit.schema';

export type UnitConversionDocument = HydratedDocument<UnitConversion>;

@Schema({ timestamps: true })
export class UnitConversion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Unit', required: true })
  fromUnit: Unit;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Unit', required: true })
  toUnit: Unit;

  @Prop({ required: true })
  factor: number;

  createdAt: Date;
  updatedAt: Date;
}

export const UnitConversionSchema =
  SchemaFactory.createForClass(UnitConversion);
