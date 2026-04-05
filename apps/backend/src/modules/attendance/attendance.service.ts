import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { UsersService } from '../users/users.service';

const DEFAULT_HOURS: Record<string, number> = {
  PRESENT: 8,
  HALF_DAY: 4,
  LATE: 7,
  ABSENT: 0,
  LEAVE: 0,
};

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateAttendanceDto,
    markedById: string,
  ): Promise<AttendanceDocument> {
    await this.usersService.findById(dto.user);

    const hoursWorked =
      dto.hoursWorked !== undefined ? dto.hoursWorked : DEFAULT_HOURS[dto.status] ?? 0;

    const dateOnly = new Date(dto.date);
    dateOnly.setUTCHours(0, 0, 0, 0);

    const record = await this.attendanceModel.findOneAndUpdate(
      { user: new Types.ObjectId(dto.user), date: dateOnly },
      {
        $set: {
          user: new Types.ObjectId(dto.user),
          date: dateOnly,
          status: dto.status,
          hoursWorked,
          overtimeHours: dto.overtimeHours ?? 0,
          notes: dto.notes ?? '',
          markedBy: new Types.ObjectId(markedById),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    return record;
  }

  async bulkCreate(
    bulkDto: BulkAttendanceDto,
    markedById: string,
  ): Promise<{ count: number }> {
    const dateOnly = new Date(bulkDto.date);
    dateOnly.setUTCHours(0, 0, 0, 0);

    const operations = bulkDto.records.map((item) => {
      const hoursWorked =
        item.hoursWorked !== undefined ? item.hoursWorked : DEFAULT_HOURS[item.status] ?? 0;

      return {
        updateOne: {
          filter: { user: new Types.ObjectId(item.user), date: dateOnly },
          update: {
            $set: {
              user: new Types.ObjectId(item.user),
              date: dateOnly,
              status: item.status,
              hoursWorked,
              overtimeHours: item.overtimeHours ?? 0,
              notes: item.notes ?? '',
              markedBy: new Types.ObjectId(markedById),
            },
          },
          upsert: true,
        },
      };
    });

    const result = await this.attendanceModel.bulkWrite(operations);

    return {
      count: (result.upsertedCount || 0) + (result.modifiedCount || 0),
    };
  }

  async findAll(query: QueryAttendanceDto) {
    const {
      page = 1,
      limit = 20,
      user,
      dateFrom,
      dateTo,
      status,
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
      this.attendanceModel
        .find(filter)
        .populate('user', 'fullName username phone role')
        .populate('markedBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.attendanceModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<AttendanceDocument> {
    const record = await this.attendanceModel
      .findById(id)
      .populate('user', 'fullName username phone role')
      .populate('markedBy', 'fullName username')
      .exec();

    if (!record) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found`);
    }

    return record;
  }

  async findByDate(date: string) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const records = await this.attendanceModel
      .find({ date: { $gte: startOfDay, $lte: endOfDay } })
      .populate('user', 'fullName username phone role')
      .populate('markedBy', 'fullName username')
      .sort({ createdAt: -1 })
      .exec();

    return records;
  }

  async findByUser(userId: string, query: QueryAttendanceDto) {
    return this.findAll({ ...query, user: userId });
  }

  async getMonthlyReport(userId: string, year: number, month: number) {
    await this.usersService.findById(userId);

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const records = await this.attendanceModel
      .find({
        user: new Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('user', 'fullName username phone role')
      .sort({ date: 1 })
      .exec();

    const summary = {
      totalDays: records.length,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      halfDays: 0,
      leaveDays: 0,
      totalHoursWorked: 0,
      totalOvertimeHours: 0,
    };

    for (const record of records) {
      switch (record.status) {
        case 'PRESENT':
          summary.presentDays++;
          break;
        case 'ABSENT':
          summary.absentDays++;
          break;
        case 'LATE':
          summary.lateDays++;
          break;
        case 'HALF_DAY':
          summary.halfDays++;
          break;
        case 'LEAVE':
          summary.leaveDays++;
          break;
      }
      summary.totalHoursWorked += record.hoursWorked || 0;
      summary.totalOvertimeHours += record.overtimeHours || 0;
    }

    return { records, summary };
  }

  async getDateSummary(date: string) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const records = await this.attendanceModel
      .find({ date: { $gte: startOfDay, $lte: endOfDay } })
      .exec();

    const summary = {
      total: records.length,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      leave: 0,
    };

    for (const record of records) {
      switch (record.status) {
        case 'PRESENT':
          summary.present++;
          break;
        case 'ABSENT':
          summary.absent++;
          break;
        case 'LATE':
          summary.late++;
          break;
        case 'HALF_DAY':
          summary.halfDay++;
          break;
        case 'LEAVE':
          summary.leave++;
          break;
      }
    }

    return summary;
  }
}
