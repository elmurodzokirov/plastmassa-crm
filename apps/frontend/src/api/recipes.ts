import client from './client';
import type { Recipe, PlannedCostBreakdown } from '@plastmassa/shared';

export interface RecipeItemInput {
  material: string;
  quantityPerUnit: number;
  wastagePercent?: number;
}

export interface RecipeUpsertInput {
  product: string;
  items: RecipeItemInput[];
  laborCostPerUnit?: number;
  overheadPercent?: number;
  notes?: string;
}

export const recipesApi = {
  getAllActive: () =>
    client.get<Recipe[]>('/recipes').then((r) => r.data),
  getActiveByProduct: (productId: string) =>
    client.get<Recipe | null>(`/recipes/product/${productId}`).then((r) => r.data),
  getHistory: (productId: string) =>
    client.get<Recipe[]>(`/recipes/product/${productId}/history`).then((r) => r.data),
  getPlannedCost: (productId: string) =>
    client.get<PlannedCostBreakdown | null>(`/recipes/product/${productId}/cost`).then((r) => r.data),
  upsert: (data: RecipeUpsertInput) =>
    client.post<Recipe>('/recipes', data).then((r) => r.data),
};
