import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // Configure OpenAPI Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Triage AI API Documentation')
    .setDescription('Production OpenAPI specifications for Better-Auth, Upstash Redis session storage, and Supabase PostgreSQL.')
    .setVersion('1.0.0')
    .addCookieAuth('triage_ai_session')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Server listening on port http://localhost:${port}`);
  logger.log(`Serving Swagger OpenAPI UI at http://localhost:${port}/api/docs`);
  logger.log(`Serving API health check at http://localhost:${port}/api/health`);
}
bootstrap();
