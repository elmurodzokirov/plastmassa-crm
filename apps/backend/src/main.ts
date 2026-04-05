import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { PRODUCT_IMAGES_DIR, UPLOADS_ROOT } from './modules/products/product-image.utils';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  logger.log(`PORT: ${process.env.PORT || '6000 (default)'}`);
  logger.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
  logger.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
  logger.log(`CORS_ORIGINS: ${process.env.CORS_ORIGINS || 'not set'}`);
  logger.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET'}`);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
  app.useStaticAssets(UPLOADS_ROOT, {
    prefix: '/api/uploads/',
  });

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

  const origins = corsOrigins
    ? corsOrigins.split(',').map((s) => s.trim())
    : isDev
      ? true
      : ['http://localhost:6001'];

  logger.log(`CORS origins: ${JSON.stringify(origins)}`);

  app.enableCors({
    origin: origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 6000;
  await app.listen(port);
  logger.log(`Plastmassa CRM API running on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
