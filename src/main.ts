import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

if (import.meta.env.PROD) {
  (async () => {
    const app = await NestFactory.create(AppModule);
    const port = import.meta.env.PORT;

    await app.listen(port || 3000);
  })();
}

export const enimeNodeApp = NestFactory.create(AppModule);