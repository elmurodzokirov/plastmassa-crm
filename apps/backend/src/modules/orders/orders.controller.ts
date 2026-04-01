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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Get('overdue-debts')
  async getOverdueDebts() {
    return this.ordersService.getOverdueDebts();
  }

  @Get('customer/:customerId')
  async getOrdersByCustomer(
    @Param('customerId') customerId: string,
    @Query() query: QueryOrderDto,
  ) {
    return this.ordersService.getOrdersByCustomer(customerId, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Get(':id/check')
  async getCheckData(@Param('id') id: string) {
    return this.ordersService.getCheckData(id);
  }

  @Post()
  @Permissions('orders:create')
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.ordersService.create(createOrderDto, userId);
  }

  @Patch(':id/deliver')
  @Permissions('orders:update')
  async markDelivered(@Param('id') id: string, @Body() dto: DeliverOrderDto) {
    return this.ordersService.markDelivered(id, dto);
  }

  @Patch(':id/edit')
  @Permissions('orders:update')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.ordersService.update(id, updateOrderDto, userId);
  }

  @Patch(':id/status')
  @Permissions('orders:update')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, userId);
  }
}
