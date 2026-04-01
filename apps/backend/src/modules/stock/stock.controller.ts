import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryStockMovementDto } from './dto/query-stock-movement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('stock/movements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  async findAll(@Query() query: QueryStockMovementDto) {
    return this.stockService.findAll(query);
  }

  @Get('product/:productId')
  async getMovementsByProduct(
    @Param('productId') productId: string,
    @Query() query: QueryStockMovementDto,
  ) {
    return this.stockService.getMovementsByProduct(productId, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.stockService.findById(id);
  }

  @Post()
  @Permissions('stock:create')
  async create(
    @Body() createStockMovementDto: CreateStockMovementDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.stockService.create(createStockMovementDto, userId);
  }
}
