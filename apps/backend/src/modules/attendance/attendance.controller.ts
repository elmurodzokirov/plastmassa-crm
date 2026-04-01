import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async findAll(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.findAll(query);
  }

  @Get('date/:date')
  async findByDate(@Param('date') date: string) {
    return this.attendanceService.findByDate(date);
  }

  @Get('date/:date/summary')
  async getDateSummary(@Param('date') date: string) {
    return this.attendanceService.getDateSummary(date);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendanceService.findByUser(userId, query);
  }

  @Get('user/:userId/monthly')
  async getMonthlyReport(
    @Param('userId') userId: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.attendanceService.getMonthlyReport(userId, +year, +month);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.attendanceService.findById(id);
  }

  @Post()
  @Permissions('attendance:create')
  async create(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.attendanceService.create(dto, userId);
  }

  @Post('bulk')
  @Permissions('attendance:create')
  async bulkCreate(
    @Body() dto: BulkAttendanceDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.attendanceService.bulkCreate(dto, userId);
  }
}
