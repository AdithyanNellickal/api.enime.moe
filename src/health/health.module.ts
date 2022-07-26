import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicator/prisma-health-indicator';
import DatabaseService from '../database/database.service';
import { HttpModule } from '@nestjs/axios';
import DatabaseModule from '../database/database.module';

@Module({
    controllers: [HealthController],
    imports: [HttpModule, DatabaseModule, TerminusModule],
    providers: [PrismaHealthIndicator]
})
export default class HealthModule {}