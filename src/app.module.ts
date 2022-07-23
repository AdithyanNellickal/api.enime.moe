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
import * as redisStore from 'cache-manager-redis-store';
import { BullModule } from '@nestjs/bull';
import AnimeController from './controller/anime.controller';
import ProxyController from './controller/proxy.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './guard/throtller-behind-proxy.guard';
import ScraperService from './scraper/scraper.service';
import { EnimeCacheInterceptor } from './cache/enime-cache.interceptor';
import EpisodeController from './controller/episode.controller';
import RecentController from './controller/recent.controller';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true
  }), ScheduleModule.forRoot(), ScraperModule, InformationModule, HealthModule,
      CacheModule.register({
          store: redisStore,
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD
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
  controllers: [AppController, AnimeController, ProxyController, RecentController, EpisodeController],
  providers: [AppService, DatabaseService, ProxyService, ScraperService,
      {
          provide: APP_GUARD,
          useClass: ThrottlerBehindProxyGuard,
      },
      {
          provide: APP_INTERCEPTOR,
          useClass: EnimeCacheInterceptor,
      }
  ],
})
export class AppModule {}
