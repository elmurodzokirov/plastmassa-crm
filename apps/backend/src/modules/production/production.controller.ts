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
import { ProductionService } from './production.service';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { QueryProductionLogDto } from './dto/query-production-log.dto';
import { CreateProductionLogBatchDto } from './dto/create-production-log-batch.dto';
import { UpdateProductionLogBatchDto } from './dto/update-production-log-batch.dto';
import { QueryProductionLogBatchDto } from './dto/query-production-log-batch.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('production')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('logs')
  async findAllLogs(@Query() query: QueryProductionLogDto) {
    return this.productionService.findAllLogs(query);
  }

  @Get('logs/daily')
  async getDailyProduction(@Query('date') date: string) {
    return this.productionService.getDailyProduction(date);
  }

  // NOTE: these three must stay ABOVE the generic "logs/:id" route below —
  // otherwise "/production/logs/batches" would be matched as findLogById({ id: 'batches' }).
  @Get('logs/batches')
  async findAllBatches(@Query() query: QueryProductionLogBatchDto) {
    return this.productionService.findAllBatches(query);
  }

  @Get('logs/batches/:batchNumber')
  async findBatchDetail(@Param('batchNumber') batchNumber: string) {
    return this.productionService.findBatchDetail(batchNumber);
  }

  @Patch('logs/batches/:batchNumber')
  @Permissions('production:create')
  async updateBatch(
    @Param('batchNumber') batchNumber: string,
    @Body() dto: UpdateProductionLogBatchDto,
    @CurrentUser('_id') userId: string,
    @CurrentUser('fullName') userName: string,
  ) {
    return this.productionService.updateBatch(batchNumber, dto, userId, userName);
  }

  @Post('logs/batch')
  @Permissions('production:create')
  async createLogsBatch(
    @Body() dto: CreateProductionLogBatchDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.productionService.createLogsBatch(dto, userId);
  }

  @Patch('logs/:id/approve')
  @Permissions('production:update')
  async approveLog(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.productionService.approveLog(id, userId);
  }

  @Get('logs/:id')
  async findLogById(@Param('id') id: string) {
    return this.productionService.findLogById(id);
  }

  @Post('logs')
  @Permissions('production:create')
  async createLog(
    @Body() dto: CreateProductionLogDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.productionService.createLog(dto, userId);
  }
}
