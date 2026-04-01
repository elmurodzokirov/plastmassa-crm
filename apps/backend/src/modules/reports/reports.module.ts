import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { ProductionLog, ProductionLogSchema } from '../production/schemas/production-log.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: ProductionLog.name, schema: ProductionLogSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
