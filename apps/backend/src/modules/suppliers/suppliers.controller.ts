import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { QuerySupplierPaymentDto } from './dto/query-supplier-payment.dto';
import { SetSupplierBalanceDto } from './dto/set-balance.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Permissions('products:create')
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @Permissions('products:read')
  findAll(@Query() query: QuerySupplierDto) {
    return this.suppliersService.findAll(query);
  }

  @Get('creditors')
  @Permissions('finance:read')
  getCreditors() {
    return this.suppliersService.getCreditors();
  }

  @Get('payments')
  @Permissions('finance:read')
  findPayments(@Query() query: QuerySupplierPaymentDto) {
    return this.suppliersService.findPayments(query);
  }

  @Post('payments')
  @Permissions('finance:create')
  createPayment(
    @Body() dto: CreateSupplierPaymentDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.suppliersService.createPayment(dto, userId);
  }

  @Get(':id')
  @Permissions('products:read')
  findById(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Patch(':id')
  @Permissions('products:update')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Patch(':id/balance')
  @Permissions('products:update')
  setBalance(@Param('id') id: string, @Body() dto: SetSupplierBalanceDto) {
    return this.suppliersService.setBalance(id, dto.amount);
  }

  @Delete(':id')
  @Permissions('products:delete')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
