import 'module-alias/register';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const host = configService.get<string>('HOST') || '0.0.0.0';
  const port = (configService.get<string | number>('PORT') as number) || 5002;

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor (get from app context for DI)
  const transformInterceptor = app.get(TransformInterceptor);
  app.useGlobalInterceptors(transformInterceptor);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      enableDebugMessages: false,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      transform: true,
    }),
  );

  // CORS configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins?.split(',') || ['*'];
  app.enableCors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API documentation for the custom boilerplate backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Roles', 'Role management endpoints')
    .addTag('Permissions', 'Permission management endpoints')
    .addTag('Folders', 'Folder management endpoints')
    .addTag('Files', 'File management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(Number(port), host);
  logger.log(`Application is running on: http://${host}:${port}`);
  logger.log(`Swagger documentation available at: http://${host}:${port}/api/docs`);
}

void bootstrap();
