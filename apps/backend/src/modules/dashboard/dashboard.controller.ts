import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('recent-orders')
  async getRecentOrders(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentOrders(
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get('recent-payments')
  async getRecentPayments(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentPayments(
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get('monthly-revenue')
  async getMonthlyRevenue(@Query('months') months?: string) {
    return this.dashboardService.getMonthlyRevenue(
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('sales-chart')
  async getSalesChart(
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.dashboardService.getSalesChart(
      (period as 'year' | 'month' | 'day') || 'month',
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }
}
