import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { Advance, AdvanceSchema } from './schemas/advance.schema';
import { Payroll, PayrollSchema } from './schemas/payroll.schema';
import { ProductionLog, ProductionLogSchema } from '../production/schemas/production-log.schema';
import { AttendanceModule } from '../attendance/attendance.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advance.name, schema: AdvanceSchema },
      { name: Payroll.name, schema: PayrollSchema },
      { name: ProductionLog.name, schema: ProductionLogSchema },
    ]),
    AttendanceModule,
    UsersModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
