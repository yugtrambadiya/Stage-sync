import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Request ID on every request
  const reqIdMiddleware = new RequestIdMiddleware();
  app.use((req: any, res: any, next: any) => reqIdMiddleware.use(req, res, next));

  // Global validation — whitelist + forbid unknown fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: false },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('StageSync API')
    .setDescription('Real-time stage management — backend core endpoints. See API_CONTRACT.md for integration notes.')
    .setVersion('1.0')
    .addTag('Events')
    .addTag('Speakers')
    .addTag('Agenda')
    .addTag('Schedule Changes')
    .addTag('Demo Tools')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
  console.log(`🚀 API running on http://localhost:${process.env.PORT ?? 4000}`);
  console.log(`📖 Swagger: http://localhost:${process.env.PORT ?? 4000}/docs`);
}

bootstrap();
