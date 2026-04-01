import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { UnitsModule } from './modules/units/units.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductLotsModule } from './modules/product-lots/product-lots.module';
import { ProductionModule } from './modules/production/production.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CustomerPricesModule } from './modules/customer-prices/customer-prices.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AuditLogMiddleware } from './common/middleware/audit-log.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        console.log(`[MongoDB] Connecting to: ${uri ? uri.replace(/\/\/.*@/, '//<credentials>@') : 'NOT SET'}`);
        return {
          uri,
          connectionFactory: (connection: unknown) => {
            const conn = connection as { readyState: number; host: string; port: number; name: string };
            console.log(`[MongoDB] Connected! host=${conn.host}:${conn.port} db=${conn.name} state=${conn.readyState}`);
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    TelegramModule,
    AuthModule,
    UsersModule,
    RolesModule,
    UnitsModule,
    CustomersModule,
    ProductsModule,
    StockModule,
    OrdersModule,
    PaymentsModule,
    ProductLotsModule,
    ProductionModule,
    AttendanceModule,
    PayrollModule,
    ExpensesModule,
    FinanceModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    CustomerPricesModule,
    ReturnsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogMiddleware).forRoutes('*');
  }
}
