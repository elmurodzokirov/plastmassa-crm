import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceStatusDto } from './dto/update-advance-status.dto';
import { QueryAdvanceDto } from './dto/query-advance.dto';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { BulkCalculatePayrollDto } from './dto/bulk-calculate-payroll.dto';
import { UpdatePayrollStatusDto } from './dto/update-payroll-status.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ─── Advance Routes ────────────────────────────────────────────

  @Get('advances')
  async findAllAdvances(@Query() query: QueryAdvanceDto) {
    return this.payrollService.findAllAdvances(query);
  }

  @Get('advances/user/:userId')
  async getAdvancesByUser(
    @Param('userId') userId: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.payrollService.getAdvancesByUser(userId, +year, +month);
  }

  @Get('advances/:id')
  async findAdvanceById(@Param('id') id: string) {
    return this.payrollService.findAdvanceById(id);
  }

  @Post('advances')
  @Permissions('payroll:create')
  async createAdvance(
    @Body() dto: CreateAdvanceDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.payrollService.createAdvance(dto, userId);
  }

  @Patch('advances/:id/status')
  @Permissions('payroll:update')
  async updateAdvanceStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdvanceStatusDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.payrollService.updateAdvanceStatus(id, dto, userId);
  }

  // ─── Payroll Routes ────────────────────────────────────────────

  @Get()
  async findAll(@Query() query: QueryPayrollDto) {
    return this.payrollService.findAll(query);
  }

  @Get('month/:year/:month')
  async getPayrollByMonth(
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.payrollService.getPayrollByMonth(+year, +month);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.payrollService.findById(id);
  }

  @Get(':id/slip')
  async getPayrollSlip(@Param('id') id: string) {
    return this.payrollService.getPayrollSlip(id);
  }

  @Post('calculate')
  @Permissions('payroll:create')
  async calculate(
    @Body() dto: CalculatePayrollDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.payrollService.calculate(dto, userId);
  }

  @Post('calculate/bulk')
  @Permissions('payroll:create')
  async bulkCalculate(
    @Body() dto: BulkCalculatePayrollDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.payrollService.bulkCalculate(dto, userId);
  }

  @Patch(':id/status')
  @Permissions('payroll:update')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollStatusDto,
  ) {
    return this.payrollService.updateStatus(id, dto);
  }
}
