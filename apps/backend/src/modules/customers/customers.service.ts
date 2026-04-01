import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerDocument> {
    const createdCustomer = new this.customerModel(createCustomerDto);
    return createdCustomer.save();
  }

  async findAll(query: QueryCustomerDto) {
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
      this.customerModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id).exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerDocument> {
    // Remove currentDebt from update payload — it can only be changed via updateDebt()
    const { ...updateData } = updateCustomerDto;
    delete (updateData as any).currentDebt;

    const updatedCustomer = await this.customerModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updatedCustomer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return updatedCustomer;
  }

  async remove(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return customer;
  }

  async updateDebt(id: string, amount: number): Promise<CustomerDocument> {
    const customer = await this.customerModel
      .findByIdAndUpdate(id, { $inc: { currentDebt: amount } }, { new: true })
      .exec();

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return customer;
  }

  async getDebtors(): Promise<CustomerDocument[]> {
    return this.customerModel
      .find({ currentDebt: { $gt: 0 } })
      .sort({ currentDebt: -1 })
      .exec();
  }

  async getDebtSummary() {
    const result = await this.customerModel.aggregate([
      { $match: { currentDebt: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: '$currentDebt' },
          debtorCount: { $sum: 1 },
          averageDebt: { $avg: '$currentDebt' },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        totalDebt: 0,
        debtorCount: 0,
        averageDebt: 0,
      };
    }

    return {
      totalDebt: result[0].totalDebt,
      debtorCount: result[0].debtorCount,
      averageDebt: Math.round(result[0].averageDebt),
    };
  }
}
