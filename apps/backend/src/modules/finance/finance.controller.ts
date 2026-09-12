import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('debtors')
  async getDebtors() {
    return this.financeService.getDebtors();
  }

  @Get('creditors')
  async getCreditors() {
    return this.financeService.getCreditors();
  }

  @Get('cash-flow')
  async getCashFlow(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.financeService.getCashFlow(dateFrom, dateTo);
  }

  @Get('cash-flow/monthly')
  async getMonthlyCashFlow(@Query('year') year: string) {
    return this.financeService.getMonthlyCashFlow(parseInt(year));
  }

  @Get('transactions/today')
  async getTodayTransactions() {
    return this.financeService.getTodayTransactions();
  }

  @Get('transactions')
  async getTransactions(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.financeService.getTransactions(dateFrom, dateTo);
  }

  @Get('summary')
  async getSummary() {
    return this.financeService.getSummary();
  }

  @Get('p-and-l')
  async getProfitAndLoss(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.financeService.getProfitAndLoss(dateFrom, dateTo);
  }
}
