import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecipeDocument = Recipe & Document;

@Schema({ _id: false })
export class RecipeItem {
  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  material: Types.ObjectId;

  @Prop({ required: true, min: 0.0001 })
  quantityPerUnit: number;

  @Prop({ default: 0, min: 0, max: 100 })
  wastagePercent: number;
}

export const RecipeItemSchema = SchemaFactory.createForClass(RecipeItem);

@Schema({ timestamps: true })
export class Recipe {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: [RecipeItemSchema], default: [] })
  items: RecipeItem[];

  @Prop({ default: 0 })
  laborCostPerUnit: number;

  @Prop({ default: 0, min: 0 })
  overheadPercent: number;

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);

RecipeSchema.index({ product: 1, isActive: 1 });
