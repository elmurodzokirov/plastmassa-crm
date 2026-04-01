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
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { QueryReturnDto } from './dto/query-return.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('returns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  async findAll(@Query() query: QueryReturnDto) {
    return this.returnsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.returnsService.findById(id);
  }

  @Post()
  @Permissions('returns:create')
  async create(
    @Body() createReturnDto: CreateReturnDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.returnsService.create(createReturnDto, userId);
  }

  @Patch(':id/approve')
  @Permissions('returns:update')
  async approve(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.returnsService.approve(id, userId);
  }
}
