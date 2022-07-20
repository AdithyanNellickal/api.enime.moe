import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import DatabaseService from '../../database/database.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
    constructor(private readonly databaseService: DatabaseService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.databaseService.$queryRaw`SELECT 1`;
            return this.getStatus(key, true);
        } catch (e) {
            throw new HealthCheckError("Prisma check failed", e);
        }
    }
}