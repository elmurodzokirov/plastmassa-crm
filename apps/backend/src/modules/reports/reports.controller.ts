import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { QuerySalesReportDto } from './dto/query-sales-report.dto';
import { QueryProductionReportDto } from './dto/query-production-report.dto';
import { QueryAttendanceReportDto } from './dto/query-attendance-report.dto';
import { QuerySupplierReconciliationDto } from './dto/query-supplier-reconciliation.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('reports:read')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  async getSalesReport(@Query() query: QuerySalesReportDto) {
    return this.reportsService.getSalesReport(
      query.dateFrom,
      query.dateTo,
      query.groupBy || 'month',
    );
  }

  @Get('production')
  async getProductionReport(@Query() query: QueryProductionReportDto) {
    return this.reportsService.getProductionReport(
      query.dateFrom,
      query.dateTo,
    );
  }

  @Get('stock')
  async getStockReport() {
    return this.reportsService.getStockReport();
  }

  @Get('attendance')
  async getAttendanceReport(@Query() query: QueryAttendanceReportDto) {
    return this.reportsService.getAttendanceReport(
      query.year ? parseInt(query.year, 10) : undefined,
      query.month ? parseInt(query.month, 10) : undefined,
    );
  }

  @Get('supplier-reconciliation')
  async getSupplierReconciliation(@Query() query: QuerySupplierReconciliationDto) {
    return this.reportsService.getSupplierReconciliation(
      query.supplier,
      query.dateFrom,
      query.dateTo,
    );
  }
}
