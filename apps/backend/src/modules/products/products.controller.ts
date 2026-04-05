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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @Permissions('products:create')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() imageFile?: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
    },
  ) {
    return this.productsService.create(createProductDto, imageFile);
  }

  @Patch(':id')
  @Permissions('products:update')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() imageFile?: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
    },
  ) {
    return this.productsService.update(id, updateProductDto, imageFile);
  }

  @Delete(':id')
  @Permissions('products:delete')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
