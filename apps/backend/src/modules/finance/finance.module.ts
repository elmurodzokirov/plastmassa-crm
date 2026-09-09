import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Supplier, SupplierSchema } from '../suppliers/schemas/supplier.schema';
import {
  SupplierPayment,
  SupplierPaymentSchema,
} from '../suppliers/schemas/supplier-payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: SupplierPayment.name, schema: SupplierPaymentSchema },
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
