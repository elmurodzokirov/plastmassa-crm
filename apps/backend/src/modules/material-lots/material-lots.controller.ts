import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaterialLotsService } from './material-lots.service';
import { CreateMaterialLotDto } from './dto/create-material-lot.dto';
import { QueryMaterialLotDto } from './dto/query-material-lot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('material-lots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialLotsController {
  constructor(private readonly materialLotsService: MaterialLotsService) {}

  @Get()
  async findAll(@Query() query: QueryMaterialLotDto) {
    return this.materialLotsService.findAll(query);
  }

  @Get('material/:materialId')
  async getLotsByMaterial(
    @Param('materialId') materialId: string,
    @Query() query: QueryMaterialLotDto,
  ) {
    return this.materialLotsService.getLotsByMaterial(materialId, query);
  }

  @Get('material/:materialId/average-cost')
  async getWeightedAverageCost(@Param('materialId') materialId: string) {
    const cost = await this.materialLotsService.getWeightedAverageCost(materialId);
    return { cost };
  }

  @Post()
  @Permissions('stock:create')
  async create(
    @Body() dto: CreateMaterialLotDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.materialLotsService.create(dto, userId);
  }
}
