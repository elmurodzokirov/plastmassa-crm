import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateUnitConversionDto } from './dto/create-unit-conversion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async findAll() {
    return this.unitsService.findAll();
  }

  @Post()
  async create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ) {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.unitsService.delete(id);
  }

  @Get('conversions')
  async findAllConversions() {
    return this.unitsService.findAllConversions();
  }

  @Post('conversions')
  async createConversion(
    @Body() createConversionDto: CreateUnitConversionDto,
  ) {
    return this.unitsService.createConversion(createConversionDto);
  }
}
