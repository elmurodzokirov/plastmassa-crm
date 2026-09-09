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
import { ProductLotsService } from './product-lots.service';
import { CreateProductLotDto } from './dto/create-product-lot.dto';
import { CreateProductLotBatchDto } from './dto/create-product-lot-batch.dto';
import { UpdateProductLotBatchDto } from './dto/update-product-lot-batch.dto';
import { QueryProductLotDto } from './dto/query-product-lot.dto';
import { QueryProductLotBatchDto } from './dto/query-product-lot-batch.dto';
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

  // NOTE: these two must stay ABOVE the generic ":id" route below — otherwise
  // "/product-lots/batches" would be matched as findOne({ id: 'batches' }).
  @Get('batches')
  async findAllBatches(@Query() query: QueryProductLotBatchDto) {
    return this.productLotsService.findAllBatches(query);
  }

  @Get('batches/:batchNumber')
  async findBatchDetail(@Param('batchNumber') batchNumber: string) {
    return this.productLotsService.findBatchDetail(batchNumber);
  }

  @Patch('batches/:batchNumber')
  @Permissions('stock:create')
  async updateBatch(
    @Param('batchNumber') batchNumber: string,
    @Body() updateProductLotBatchDto: UpdateProductLotBatchDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.productLotsService.updateBatch(batchNumber, updateProductLotBatchDto, userId);
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

  @Post('batch')
  @Permissions('stock:create')
  async createBatch(
    @Body() createProductLotBatchDto: CreateProductLotBatchDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.productLotsService.createBatch(createProductLotBatchDto, userId);
  }
}
