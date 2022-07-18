import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import DatabaseService from './database/database.service';
import ProxyService from './proxy/proxy.service';
import ScraperModule from './scraper/scraper.module';
import InformationModule from './information/information.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true
  }), ScheduleModule.forRoot(), ScraperModule, InformationModule],
  controllers: [AppController],
  providers: [AppService, DatabaseService, ProxyService],
})
export class AppModule {}
