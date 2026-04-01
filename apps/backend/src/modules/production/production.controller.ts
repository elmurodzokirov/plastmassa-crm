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
