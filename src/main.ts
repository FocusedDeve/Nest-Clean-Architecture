import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppLogger } from '@shared/logger/logger.service';

function setupSwagger(app: INestApplication, path: string) {
  const config = new DocumentBuilder()
    .setTitle('Clean Architecture API')
    .setDescription(
      [
        'NestJS + Clean Architecture template.',
        '',
        '**Reading the responses:** every route resolves with a `CoreResponse` envelope',
        '(`{ code, data, errors }`) and never throws, so the HTTP status is always 200 —',
        '201 on POST. The real outcome is the `code` field inside the body; each operation',
        'lists the `code` values it can return.',
        '',
        'The only exception is a non-numeric `:id`, rejected by `ParseIntPipe` with a genuine HTTP 400.',
      ].join('\n'),
    )
    .setVersion('0.0.1')
    .addTag('app', 'Scaffold route, outside the CoreResponse convention')
    .addTag('user', 'User CRUD')
    .addTag('product', 'Product CRUD, plus users joined with their products')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(path, app, document, {
    jsonDocumentUrl: `${path}/json`,
    swaggerOptions: {
      docExpansion: 'list',
      tagsSorter: 'alpha',
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  app.useLogger(new AppLogger());

  const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';

  if (swaggerEnabled) {
    setupSwagger(app, swaggerPath);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  if (swaggerEnabled) {
    new Logger('Swagger').log(`Docs available on http://localhost:${port}/${swaggerPath}`);
  }
}
bootstrap();
