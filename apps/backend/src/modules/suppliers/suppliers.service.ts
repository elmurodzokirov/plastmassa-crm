import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import {
  SupplierPayment,
  SupplierPaymentDocument,
} from './schemas/supplier-payment.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { QuerySupplierPaymentDto } from './dto/query-supplier-payment.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(SupplierPayment.name)
    private readonly supplierPaymentModel: Model<SupplierPaymentDocument>,
  ) {}

  async create(dto: CreateSupplierDto): Promise<SupplierDocument> {
    const supplier = new this.supplierModel(dto);
    return supplier.save();
  }

  async findAll(query: QuerySupplierDto) {
    const {
      page = 1,
      limit = 20,
      search,
      hasDebt,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (hasDebt === true) {
      filter.currentDebt = { $gt: 0 };
    } else if (hasDebt === false) {
      filter.currentDebt = { $lte: 0 };
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.supplierModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.supplierModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<SupplierDocument> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierDocument> {
    const updateData = { ...dto };
    delete (updateData as any).currentDebt;

    const supplier = await this.supplierModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }
    return supplier;
  }

  async remove(id: string): Promise<SupplierDocument> {
    const supplier = await this.supplierModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }
    return supplier;
  }

  async updateDebt(id: string, amount: number): Promise<SupplierDocument> {
    const supplier = await this.supplierModel
      .findByIdAndUpdate(id, { $inc: { currentDebt: amount } }, { new: true })
      .exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }
    return supplier;
  }

  // Saldoni to'g'ridan-to'g'ri belgilash (masalan, boshlang'ich saldo kiritish/tuzatish uchun)
  async setBalance(id: string, amount: number): Promise<SupplierDocument> {
    const supplier = await this.supplierModel
      .findByIdAndUpdate(id, { $set: { currentDebt: amount } }, { new: true })
      .exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }
    return supplier;
  }

  async getCreditors(): Promise<SupplierDocument[]> {
    return this.supplierModel
      .find({ currentDebt: { $gt: 0 } })
      .sort({ currentDebt: -1 })
      .exec();
  }

  async createPayment(
    dto: CreateSupplierPaymentDto,
    userId: string,
  ): Promise<SupplierPaymentDocument> {
    const supplier = await this.findById(dto.supplier);

    if (dto.amount > Math.max(supplier.currentDebt, 0)) {
      throw new BadRequestException(
        "To'lov summasi mavjud qarzdorlikdan oshib ketmoqda",
      );
    }

    const payment = new this.supplierPaymentModel({
      supplier: dto.supplier,
      amount: dto.amount,
      type: dto.type,
      notes: dto.notes,
      createdBy: userId,
    });

    const savedPayment = await payment.save();
    await this.updateDebt(dto.supplier, -dto.amount);

    return savedPayment;
  }

  async findPayments(query: QuerySupplierPaymentDto) {
    const {
      page = 1,
      limit = 20,
      supplier,
      type,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (supplier) filter.supplier = supplier;
    if (type) filter.type = type;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.supplierPaymentModel
        .find(filter)
        .populate('supplier')
        .populate('createdBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.supplierPaymentModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
