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

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
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
  ): Promise<ProductDocument> {
    const { ...updateData } = updateProductDto;
    delete (updateData as any).currentStock;
    delete (updateData as any).costPerUnit;
    delete (updateData as any).costPrice;

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('baseUnit')
      .populate('salesUnits.unit')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return updatedProduct;
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
