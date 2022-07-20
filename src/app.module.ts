import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import DatabaseService from './database/database.service';
import ProxyService from './proxy/proxy.service';
import ScraperModule from './scraper/scraper.module';
import InformationModule from './information/information.module';
import HealthModule from './health/health.module';
import * as redisStore from 'cache-manager-ioredis';
import { BullModule } from '@nestjs/bull';
import AnimeController from './controller/anime.controller';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true
  }), ScheduleModule.forRoot(), ScraperModule, InformationModule, HealthModule,
      CacheModule.register({
          store: redisStore,
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD,
          isGlobal: true
      }),
      BullModule.forRoot({
        redis: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD
        }
      })
  ],
  controllers: [AppController, AnimeController],
  providers: [AppService, DatabaseService, ProxyService],
})
export class AppModule {}
