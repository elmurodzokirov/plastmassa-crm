import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Advance, AdvanceDocument } from './schemas/advance.schema';
import { Payroll, PayrollDocument } from './schemas/payroll.schema';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceStatusDto } from './dto/update-advance-status.dto';
import { QueryAdvanceDto } from './dto/query-advance.dto';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { BulkCalculatePayrollDto } from './dto/bulk-calculate-payroll.dto';
import { UpdatePayrollStatusDto } from './dto/update-payroll-status.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { UsersService } from '../users/users.service';
import { ProductionLog, ProductionLogDocument } from '../production/schemas/production-log.schema';

const DEFAULT_WORKING_DAYS = 26;

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Advance.name)
    private readonly advanceModel: Model<AdvanceDocument>,
    @InjectModel(Payroll.name)
    private readonly payrollModel: Model<PayrollDocument>,
    @InjectModel(ProductionLog.name)
    private readonly productionLogModel: Model<ProductionLogDocument>,
    private readonly attendanceService: AttendanceService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Advance Methods ───────────────────────────────────────────

  async createAdvance(
    dto: CreateAdvanceDto,
    createdById: string,
  ): Promise<AdvanceDocument> {
    await this.usersService.findById(dto.user);

    const advance = new this.advanceModel({
      user: new Types.ObjectId(dto.user),
      amount: dto.amount,
      date: new Date(dto.date),
      notes: dto.notes ?? '',
      status: 'PENDING',
      createdBy: new Types.ObjectId(createdById),
    });

    return advance.save();
  }

  async findAllAdvances(query: QueryAdvanceDto) {
    const {
      page = 1,
      limit = 20,
      user,
      status,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (user) {
      filter.user = new Types.ObjectId(user);
    }

    if (status) {
      filter.status = status;
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
      this.advanceModel
        .find(filter)
        .populate('user', 'fullName username phone role')
        .populate('approvedBy', 'fullName username')
        .populate('createdBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.advanceModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAdvanceById(id: string): Promise<AdvanceDocument> {
    const advance = await this.advanceModel
      .findById(id)
      .populate('user', 'fullName username phone role')
      .populate('approvedBy', 'fullName username')
      .populate('createdBy', 'fullName username')
      .exec();

    if (!advance) {
      throw new NotFoundException(`Advance with ID "${id}" not found`);
    }

    return advance;
  }

  async updateAdvanceStatus(
    id: string,
    dto: UpdateAdvanceStatusDto,
    approvedById: string,
  ): Promise<AdvanceDocument> {
    const advance = await this.advanceModel.findById(id).exec();

    if (!advance) {
      throw new NotFoundException(`Advance with ID "${id}" not found`);
    }

    if (advance.status !== 'PENDING') {
      throw new BadRequestException(
        `Advance is already "${advance.status}" and cannot be updated`,
      );
    }

    advance.status = dto.status;
    advance.approvedBy = new Types.ObjectId(approvedById);

    return advance.save();
  }

  async getAdvancesByUser(
    userId: string,
    year: number,
    month: number,
  ): Promise<AdvanceDocument[]> {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return this.advanceModel
      .find({
        user: new Types.ObjectId(userId),
        status: 'APPROVED',
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('user', 'fullName username phone role')
      .sort({ date: 1 })
      .exec();
  }

  async getAdvancesTotal(
    userId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const result = await this.advanceModel
      .aggregate([
        {
          $match: {
            user: new Types.ObjectId(userId),
            status: 'APPROVED',
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private async getPreviousBalance(
    userId: string,
    year: number,
    month: number,
  ): Promise<number> {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const prevPayroll = await this.payrollModel
      .findOne({
        user: new Types.ObjectId(userId),
        year: prevYear,
        month: prevMonth,
      })
      .exec();

    return prevPayroll ? prevPayroll.remainingBalance || 0 : 0;
  }

  private async getProductionEarnings(
    userId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const result = await this.productionLogModel
      .aggregate([
        {
          $match: {
            worker: new Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate },
            status: 'APPROVED',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pieceRateAmount' },
          },
        },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  // ─── Payroll Methods ───────────────────────────────────────────

  private extractExceptionMessage(error: unknown): string {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as { message?: string | string[] }).message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string') {
          return message;
        }
      }
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Payroll hisoblashda noma'lum xatolik yuz berdi.";
  }

  async calculate(
    dto: CalculatePayrollDto,
    calculatedById: string,
  ): Promise<PayrollDocument> {
    const user = await this.usersService.findById(dto.user);
    const salaryType = (user as any).salaryType || 'FIXED';

    const previousBalance = await this.getPreviousBalance(
      dto.user,
      dto.year,
      dto.month,
    );

    const advancesTotal = await this.getAdvancesTotal(
      dto.user,
      dto.year,
      dto.month,
    );

    const bonus = dto.bonus ?? 0;
    const deductions = dto.deductions ?? 0;

    let baseSalary = 0;
    let workingDays = DEFAULT_WORKING_DAYS;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let totalHoursWorked = 0;
    let overtimeHours = 0;
    let overtimeAmount = 0;
    let productionEarnings = 0;
    let totalEarned = 0;

    if (salaryType === 'FIXED') {
      baseSalary = dto.baseSalary ?? 0;

      const attendanceReport = await this.attendanceService.getMonthlyReport(
        dto.user,
        dto.year,
        dto.month,
      );

      const { summary } = attendanceReport;
      if (summary.totalDays === 0) {
        throw new BadRequestException(
          'Bu xodim uchun tanlangan oy bo‘yicha davomat kiritilmagan. Oylikni hisoblashdan oldin davomatni saqlang.',
        );
      }
      presentDays = summary.presentDays;
      absentDays = summary.absentDays;
      lateDays = summary.lateDays;
      totalHoursWorked = summary.totalHoursWorked;
      overtimeHours = summary.totalOvertimeHours;

      const dailyRate = baseSalary / workingDays;
      const earnedSalary =
        dailyRate * presentDays +
        dailyRate * 0.5 * lateDays +
        dailyRate * 0.5 * (summary.halfDays || 0);

      const overtimeRate = (dailyRate / 8) * 1.5;
      overtimeAmount = Math.round(overtimeHours * overtimeRate);

      totalEarned = earnedSalary + overtimeAmount + bonus;
      productionEarnings = 0;
    } else {
      // PIECE_RATE
      productionEarnings = await this.getProductionEarnings(
        dto.user,
        dto.year,
        dto.month,
      );
      totalEarned = productionEarnings + bonus;
      baseSalary = 0;
      overtimeAmount = 0;
    }

    const defaultPaidAmount = totalEarned + previousBalance - deductions - advancesTotal;
    const paidAmount = dto.paidAmount ?? defaultPaidAmount;
    const remainingBalance = totalEarned + previousBalance - deductions - advancesTotal - paidAmount;
    const netSalary = paidAmount;

    const payrollData = {
      user: new Types.ObjectId(dto.user),
      year: dto.year,
      month: dto.month,
      baseSalary,
      salaryType,
      workingDays,
      presentDays,
      absentDays,
      lateDays,
      totalHoursWorked,
      overtimeHours,
      overtimeAmount,
      deductions,
      advancesTotal,
      bonus,
      productionEarnings,
      previousBalance,
      totalEarned: Math.round(totalEarned),
      paidAmount: Math.round(paidAmount),
      remainingBalance: Math.round(remainingBalance),
      netSalary: Math.round(netSalary),
      status: 'DRAFT',
      notes: dto.notes ?? '',
      calculatedBy: new Types.ObjectId(calculatedById),
    };

    const payroll = await this.payrollModel
      .findOneAndUpdate(
        {
          user: new Types.ObjectId(dto.user),
          year: dto.year,
          month: dto.month,
        },
        { $set: payrollData },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return payroll;
  }

  async bulkCalculate(
    bulkDto: BulkCalculatePayrollDto,
    calculatedById: string,
  ): Promise<{
    processed: PayrollDocument[];
    skipped: Array<{ user: string; fullName?: string; reason: string }>;
  }> {
    const processed: PayrollDocument[] = [];
    const skipped: Array<{ user: string; fullName?: string; reason: string }> = [];

    for (const item of bulkDto.items) {
      const dto: CalculatePayrollDto = {
        user: item.user,
        year: bulkDto.year,
        month: bulkDto.month,
        baseSalary: item.baseSalary,
        bonus: item.bonus,
        deductions: item.deductions,
      };

      try {
        const payroll = await this.calculate(dto, calculatedById);
        processed.push(payroll);
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          let fullName: string | undefined;

          try {
            const user = await this.usersService.findById(item.user);
            fullName = (user as any)?.fullName;
          } catch {
            fullName = undefined;
          }

          skipped.push({
            user: item.user,
            fullName,
            reason: this.extractExceptionMessage(error),
          });
          continue;
        }

        throw error;
      }
    }

    return {
      processed,
      skipped,
    };
  }

  async findAll(query: QueryPayrollDto) {
    const {
      page = 1,
      limit = 20,
      user,
      year,
      month,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (user) {
      filter.user = new Types.ObjectId(user);
    }

    if (year) {
      filter.year = year;
    }

    if (month) {
      filter.month = month;
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.payrollModel
        .find(filter)
        .populate({
          path: 'user',
          select: 'fullName username phone role salaryType',
          populate: { path: 'role', select: 'name' },
        })
        .populate('calculatedBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.payrollModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<PayrollDocument> {
    const payroll = await this.payrollModel
      .findById(id)
      .populate({
        path: 'user',
        select: 'fullName username phone role salaryType',
        populate: { path: 'role', select: 'name' },
      })
      .populate('calculatedBy', 'fullName username')
      .exec();

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID "${id}" not found`);
    }

    return payroll;
  }

  async updateStatus(
    id: string,
    dto: UpdatePayrollStatusDto,
  ): Promise<PayrollDocument> {
    const payroll = await this.payrollModel.findById(id).exec();

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID "${id}" not found`);
    }

    const validTransitions: Record<string, string[]> = {
      DRAFT: ['CONFIRMED'],
      CONFIRMED: ['PAID'],
      PAID: [],
    };

    if (!validTransitions[payroll.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition payroll status from "${payroll.status}" to "${dto.status}"`,
      );
    }

    payroll.status = dto.status;

    return payroll.save();
  }

  async getPayrollByMonth(
    year: number,
    month: number,
  ): Promise<PayrollDocument[]> {
    return this.payrollModel
      .find({ year, month })
      .populate({
        path: 'user',
        select: 'fullName username phone role salaryType',
        populate: { path: 'role', select: 'name' },
      })
      .populate('calculatedBy', 'fullName username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPayrollSlip(id: string): Promise<any> {
    const payroll = await this.payrollModel
      .findById(id)
      .populate({
        path: 'user',
        select: 'fullName username phone role salaryType',
        populate: { path: 'role', select: 'name' },
      })
      .populate('calculatedBy', 'fullName username')
      .exec();

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID "${id}" not found`);
    }

    const payrollObject = payroll.toObject() as any;
    const salaryType =
      payrollObject.salaryType ||
      (typeof payrollObject.user === 'object' && payrollObject.user !== null ? payrollObject.user.salaryType : undefined) ||
      'FIXED';

    if (salaryType === 'FIXED') {
      const userId = typeof payrollObject.user === 'string'
        ? payrollObject.user
        : payrollObject.user?._id?.toString();

      if (userId) {
        const attendanceReport = await this.attendanceService.getMonthlyReport(
          userId,
          payrollObject.year,
          payrollObject.month,
        );

        payrollObject.liveAttendanceSummary = attendanceReport.summary;
      }
    }

    return payrollObject;
  }
}
