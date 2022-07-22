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
import ProxyController from './controller/proxy.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './guard/throtller-behind-proxy.guard';

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
      }),
      ThrottlerModule.forRoot({
          ttl: 60,
          limit: 60,
          storage: new ThrottlerStorageRedisService({
              host: process.env.REDIS_HOST,
              port: Number(process.env.REDIS_PORT),
              password: process.env.REDIS_PASSWORD
          }),
      })
  ],
  controllers: [AppController, AnimeController, ProxyController],
  providers: [AppService, DatabaseService, ProxyService,
      {
          provide: APP_GUARD,
          useClass: ThrottlerBehindProxyGuard,
      }
  ],
})
export class AppModule {}
