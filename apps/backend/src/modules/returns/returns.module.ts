import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { Return, ReturnSchema } from './schemas/return.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { StockMovement, StockMovementSchema } from '../stock/schemas/stock-movement.schema';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { ProductLotsModule } from '../product-lots/product-lots.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Return.name, schema: ReturnSchema },
      { name: Order.name, schema: OrderSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    ProductsModule,
    CustomersModule,
    ProductLotsModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
