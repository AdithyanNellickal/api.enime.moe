import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import DatabaseService from './database/database.service';

export const bootstrap = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter()
  );
  const port = process.env.PORT;

  const databaseService: DatabaseService = app.get(DatabaseService);
  await databaseService.enableShutdownHooks(app);

  await app.listen(port || 3000, "0.0.0.0");

  return app;
}

if (!process.env.HMR) {
  bootstrap();
}
