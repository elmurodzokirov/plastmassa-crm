import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const corsOrigins = process.env.CORS_ORIGINS;
  const isDev = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map((s) => s.trim())
      : isDev
        ? true
        : ['http://localhost:6001'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 6000;
  await app.listen(port);
  console.log(`Plastmassa CRM API running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
}
bootstrap();
