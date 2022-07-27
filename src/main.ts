import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import DatabaseService from './database/database.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import path from 'path';

export const bootstrap = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        trustProxy: true
      })
  );
  const port = process.env.PORT;

  if (!process.env.PRODUCTION) {
    const options = new DocumentBuilder()
        .setTitle("Enime API")
        .setDescription("An open source API service for developers to access anime info (as well as their video sources)")
        .setContact("Enime Team", "https://api.enime.moe", "team@enime.moe")
        .addTag("anime")
        .addTag("recent")
        .addTag("episode")
        .addTag("search")
        .addTag("proxy")
        .setVersion("1.0")
        .build();

    const document = SwaggerModule.createDocument(app, options);

    console.log(document)
    fs.writeFileSync(path.join(__dirname, "../api-definition.json"), JSON.stringify(document));
  }

  const databaseService: DatabaseService = app.get(DatabaseService);
  await databaseService.enableShutdownHooks(app);

  app.enableCors();

  await app.listen(port || 3000, "0.0.0.0");

  return app;
}

if (!process.env.HMR) {
  bootstrap();
}
