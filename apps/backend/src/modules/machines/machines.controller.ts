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
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('machines')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @Permissions('production:read')
  async findAll() {
    return this.machinesService.findAll();
  }

  @Post()
  @Permissions('production:create')
  async create(@Body() dto: CreateMachineDto) {
    return this.machinesService.create(dto);
  }

  @Patch(':id')
  @Permissions('production:update')
  async update(@Param('id') id: string, @Body() dto: UpdateMachineDto) {
    return this.machinesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('production:update')
  async remove(@Param('id') id: string) {
    return this.machinesService.remove(id);
  }
}
