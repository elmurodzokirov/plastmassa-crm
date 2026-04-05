import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { StockMovement, StockMovementSchema } from '../stock/schemas/stock-movement.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { ProductLotsModule } from '../product-lots/product-lots.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    CustomersModule,
    ProductsModule,
    ProductLotsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
