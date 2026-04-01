import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CustomerPricesService } from './customer-prices.service';
import { BulkUpsertCustomerPriceDto } from './dto/upsert-customer-price.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('customer-prices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerPricesController {
  constructor(private readonly customerPricesService: CustomerPricesService) {}

  @Get(':customerId')
  @Permissions('customers:read')
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.customerPricesService.findByCustomer(customerId);
  }

  @Post('bulk')
  @Permissions('customers:update')
  async bulkUpsert(@Body() dto: BulkUpsertCustomerPriceDto) {
    return this.customerPricesService.bulkUpsert(dto);
  }

  @Delete(':id')
  @Permissions('customers:update')
  async remove(@Param('id') id: string) {
    return this.customerPricesService.remove(id);
  }
}
