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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { CancelDto } from '../../common/dto/cancel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }

  @Get('customer/:customerId')
  async getPaymentsByCustomer(@Param('customerId') customerId: string) {
    return this.paymentsService.getPaymentsByCustomer(customerId);
  }

  @Get('order/:orderId')
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentsByOrder(orderId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Post()
  @Permissions('finance:create')
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.paymentsService.create(createPaymentDto, userId);
  }

  @Patch(':id/cancel')
  @Permissions('finance:update')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.paymentsService.cancel(id, dto, userId);
  }
}
