import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async create(
    dto: CreateExpenseDto,
    createdById: string,
  ): Promise<ExpenseDocument> {
    const expense = new this.expenseModel({
      category: dto.category,
      description: dto.description,
      amount: dto.amount,
      date: new Date(dto.date),
      paidBy: dto.paidBy ? new Types.ObjectId(dto.paidBy) : undefined,
      paymentMethod: dto.paymentMethod ?? 'cash',
      notes: dto.notes ?? '',
      createdBy: new Types.ObjectId(createdById),
    });

    return expense.save();
  }

  async findAll(query: QueryExpenseDto) {
    const {
      page = 1,
      limit = 20,
      category,
      dateFrom,
      dateTo,
      paymentMethod,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (category) {
      filter.category = category;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        filter.date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.date.$lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .populate('paidBy', 'fullName username')
        .populate('createdBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.expenseModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ExpenseDocument> {
    const expense = await this.expenseModel
      .findById(id)
      .populate('paidBy', 'fullName username')
      .populate('createdBy', 'fullName username')
      .exec();

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" not found`);
    }

    return expense;
  }

  async update(
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseDocument> {
    const updateData: any = { ...dto };

    if (dto.date) {
      updateData.date = new Date(dto.date);
    }

    if (dto.paidBy) {
      updateData.paidBy = new Types.ObjectId(dto.paidBy);
    }

    const expense = await this.expenseModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('paidBy', 'fullName username')
      .populate('createdBy', 'fullName username')
      .exec();

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" not found`);
    }

    return expense;
  }

  async remove(id: string): Promise<ExpenseDocument> {
    const expense = await this.expenseModel.findByIdAndDelete(id).exec();

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${id}" not found`);
    }

    return expense;
  }

  async getStats(dateFrom?: string, dateTo?: string) {
    const matchStage: any = {};

    if (dateFrom || dateTo) {
      matchStage.date = {};
      if (dateFrom) {
        matchStage.date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        matchStage.date.$lte = new Date(dateTo);
      }
    }

    const pipeline: any[] = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    const [byCategory, byMonth, grandTotalResult] = await Promise.all([
      this.expenseModel
        .aggregate([
          ...pipeline,
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .exec(),
      this.expenseModel
        .aggregate([
          ...pipeline,
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' },
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
        ])
        .exec(),
      this.expenseModel
        .aggregate([
          ...pipeline,
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    const grandTotal =
      grandTotalResult.length > 0 ? grandTotalResult[0].total : 0;
    const totalCount =
      grandTotalResult.length > 0 ? grandTotalResult[0].count : 0;

    return {
      byCategory: byCategory.map((item: any) => ({
        category: item._id,
        total: item.total,
        count: item.count,
      })),
      byMonth: byMonth.map((item: any) => ({
        year: item._id.year,
        month: item._id.month,
        total: item.total,
        count: item.count,
      })),
      grandTotal,
      totalCount,
    };
  }
}
