import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductLotsService } from './product-lots.service';
import { CreateProductLotDto } from './dto/create-product-lot.dto';
import { QueryProductLotDto } from './dto/query-product-lot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('product-lots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductLotsController {
  constructor(private readonly productLotsService: ProductLotsService) {}

  @Get()
  async findAll(@Query() query: QueryProductLotDto) {
    return this.productLotsService.findAll(query);
  }

  @Get('product/:productId')
  async getLotsByProduct(
    @Param('productId') productId: string,
    @Query() query: QueryProductLotDto,
  ) {
    return this.productLotsService.getLotsByProduct(productId, query);
  }

  @Get('product/:productId/cost-history')
  async getProductCostHistory(
    @Param('productId') productId: string,
  ) {
    return this.productLotsService.getProductCostHistory(productId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productLotsService.findById(id);
  }

  @Post()
  @Permissions('stock:create')
  async create(
    @Body() createProductLotDto: CreateProductLotDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.productLotsService.create(createProductLotDto, userId);
  }
}
