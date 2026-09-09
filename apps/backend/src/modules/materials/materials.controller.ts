import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('materials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async findAll(@Query() query: QueryMaterialDto) {
    return this.materialsService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.materialsService.getStats();
  }

  @Get('categories')
  async getCategories() {
    return this.materialsService.getCategories();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.materialsService.findById(id);
  }

  @Post()
  @Permissions('products:create')
  async create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Patch(':id')
  @Permissions('products:update')
  async update(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('products:delete')
  async remove(@Param('id') id: string) {
    return this.materialsService.remove(id);
  }
}
