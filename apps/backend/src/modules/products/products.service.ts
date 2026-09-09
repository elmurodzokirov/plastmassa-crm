import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import {
  deleteProductImage,
  saveProductImage,
  validateProductImage,
} from './product-image.utils';

type ProductImageUpload = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    imageFile?: ProductImageUpload,
  ): Promise<ProductDocument> {
    let imageUrl: string | undefined;

    try {
      validateProductImage(imageFile);

      if (imageFile) {
        imageUrl = await saveProductImage(imageFile, createProductDto.name);
      }

      const createdProduct = new this.productModel({
        ...createProductDto,
        ...(imageUrl ? { imageUrl } : {}),
      });

      return await createdProduct.save();
    } catch (error) {
      if (imageUrl) {
        await deleteProductImage(imageUrl);
      }
      throw error;
    }
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      category,
      lowStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (category) {
      filter.category = category;
    }

    if (lowStock) {
      filter.$expr = {
        $and: [
          { $gt: ['$minStock', 0] },
          { $lte: ['$currentStock', '$minStock'] },
        ],
      };
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('baseUnit')
        .populate('salesUnits.unit')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate('baseUnit')
      .populate('salesUnits.unit')
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    imageFile?: ProductImageUpload,
  ): Promise<ProductDocument> {
    const existingProduct = await this.productModel.findById(id).exec();
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const { ...updateData } = updateProductDto;
    delete (updateData as any).currentStock;
    delete (updateData as any).costPerUnit;
    delete (updateData as any).removeImage;

    validateProductImage(imageFile);

    let uploadedImageUrl: string | undefined;
    let shouldRemoveExistingImage = updateProductDto.removeImage === true;

    if (imageFile) {
      uploadedImageUrl = await saveProductImage(
        imageFile,
        updateProductDto.name || existingProduct.name,
      );
      shouldRemoveExistingImage = false;
    }

    const $set: Record<string, unknown> = { ...updateData };
    const updateOps: Record<string, Record<string, unknown>> = { $set };

    if (uploadedImageUrl) {
      $set.imageUrl = uploadedImageUrl;
    }

    if (shouldRemoveExistingImage) {
      updateOps.$unset = { imageUrl: 1 };
    }

    try {
      const updatedProduct = await this.productModel
        .findByIdAndUpdate(id, updateOps, { new: true })
        .populate('baseUnit')
        .populate('salesUnits.unit')
        .exec();

      if (!updatedProduct) {
        throw new NotFoundException(`Product with ID "${id}" not found`);
      }

      if (uploadedImageUrl && existingProduct.imageUrl) {
        await deleteProductImage(existingProduct.imageUrl);
      }

      if (shouldRemoveExistingImage && existingProduct.imageUrl) {
        await deleteProductImage(existingProduct.imageUrl);
      }

      return updatedProduct;
    } catch (error) {
      if (uploadedImageUrl) {
        await deleteProductImage(uploadedImageUrl);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async updateCostPrice(id: string, costPrice: number): Promise<ProductDocument> {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { costPrice },
      { new: true },
    ).exec();
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return product;
  }

  async getStats() {
    const [agg] = await this.productModel.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalStock: { $sum: '$currentStock' },
          inventoryValue: {
            $sum: { $multiply: ['$currentStock', '$costPrice'] },
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$minStock', 0] },
                    { $lte: ['$currentStock', '$minStock'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return {
      totalProducts: agg?.totalProducts || 0,
      activeProducts: agg?.activeProducts || 0,
      totalStock: agg?.totalStock || 0,
      inventoryValue: agg?.inventoryValue || 0,
      lowStockCount: agg?.lowStockCount || 0,
    };
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.productModel
      .distinct('category', { category: { $nin: [null, ''] } })
      .exec();
    return categories.sort();
  }

  async updateStock(id: string, quantity: number, costPerUnit?: number): Promise<ProductDocument> {
    const updateOps: any = { $inc: { currentStock: quantity } };
    if (costPerUnit !== undefined) {
      updateOps.$set = { costPerUnit };
    }

    const product = await this.productModel
      .findByIdAndUpdate(id, updateOps, { new: true })
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }
}
