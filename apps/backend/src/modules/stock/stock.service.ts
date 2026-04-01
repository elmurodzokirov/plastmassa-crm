import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StockMovement,
  StockMovementDocument,
} from './schemas/stock-movement.schema';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class StockService {
  constructor(
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async create(
    createStockMovementDto: CreateStockMovementDto,
    userId: string,
  ): Promise<StockMovementDocument> {
    const { type, product, quantity } = createStockMovementDto;

    if (!product) {
      throw new BadRequestException('Product must be provided');
    }

    const productDoc = await this.productsService.findById(product);

    if (type === 'OUT') {
      if (productDoc.currentStock < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${productDoc.currentStock}, Requested: ${quantity}`,
        );
      }
      await this.productsService.updateStock(product, -quantity);
    } else if (type === 'IN') {
      await this.productsService.updateStock(product, quantity);
    } else if (type === 'ADJUSTMENT') {
      const currentStock = productDoc.currentStock;
      const diff = quantity - currentStock;
      await this.productsService.updateStock(product, diff);
    }

    const stockMovement = new this.stockMovementModel({
      ...createStockMovementDto,
      createdBy: userId,
    });

    return stockMovement.save();
  }

  async findAll(query: QueryStockMovementDto) {
    const {
      page = 1,
      limit = 20,
      type,
      product,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (product) {
      filter.product = product;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.stockMovementModel
        .find(filter)
        .populate('product')
        .populate('unit')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockMovementModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<StockMovementDocument> {
    const stockMovement = await this.stockMovementModel
      .findById(id)
      .populate('product')
      .populate('unit')
      .populate('createdBy', 'name email')
      .exec();

    if (!stockMovement) {
      throw new NotFoundException(`Stock movement with ID "${id}" not found`);
    }

    return stockMovement;
  }

  async getMovementsByProduct(productId: string, query: QueryStockMovementDto) {
    return this.findAll({ ...query, product: productId });
  }

}
