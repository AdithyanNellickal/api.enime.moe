import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicator/prisma-health-indicator';
import DatabaseService from '../database/database.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    controllers: [HealthController],
    imports: [HttpModule, TerminusModule],
    providers: [DatabaseService, PrismaHealthIndicator]
})
export default class HealthModule {}