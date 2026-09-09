import client from './client';
import type { Product, PaginatedResponse, ProductStats } from '@plastmassa/shared';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  category?: string;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductSalesUnitInput {
  unit: string;
  conversionFactor: number;
  price: number;
}

export interface ProductUpsertInput {
  name: string;
  baseUnit: string;
  price: number;
  costPrice?: number;
  pieceRate?: number;
  category?: string;
  minStock?: number;
  salesUnits?: ProductSalesUnitInput[];
  image?: File | null;
  removeImage?: boolean;
}

function buildProductFormData(data: ProductUpsertInput) {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('baseUnit', data.baseUnit);
  formData.append('price', String(data.price));
  formData.append('costPrice', String(data.costPrice ?? 0));
  formData.append('pieceRate', String(data.pieceRate ?? 0));
  formData.append('minStock', String(data.minStock ?? 0));
  if (data.category) {
    formData.append('category', data.category);
  }
  formData.append('salesUnits', JSON.stringify(data.salesUnits ?? []));

  if (data.image) {
    formData.append('image', data.image);
  }

  if (data.removeImage) {
    formData.append('removeImage', 'true');
  }

  return formData;
}

export const productsApi = {
  getAll: (params?: ProductQuery) =>
    client.get<PaginatedResponse<Product>>('/products', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<Product>(`/products/${id}`).then((r) => r.data),
  getStats: () =>
    client.get<ProductStats>('/products/stats').then((r) => r.data),
  getCategories: () =>
    client.get<string[]>('/products/categories').then((r) => r.data),
  create: (data: ProductUpsertInput) =>
    client.post<Product>('/products', buildProductFormData(data), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data),
  update: (id: string, data: ProductUpsertInput) =>
    client.patch<Product>(`/products/${id}`, buildProductFormData(data), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data),
  delete: (id: string) =>
    client.delete(`/products/${id}`).then((r) => r.data),
};
