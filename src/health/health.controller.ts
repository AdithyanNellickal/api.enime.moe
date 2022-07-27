import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, HealthCheck, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicator/prisma-health-indicator';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller("health")
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly http: HttpHealthIndicator,
        private readonly prisma: PrismaHealthIndicator,
        private readonly memory: MemoryHealthIndicator
    ) {}

    @Get()
    @HealthCheck()
    @ApiExcludeEndpoint()
    check() {
        return this.health.check([
            () => this.http.pingCheck("api-server", "https://api.enime.moe"),
            () => this.prisma.isHealthy("database"),
            () => this.memory.checkHeap("memory", 150 * 1024 * 1024)
        ]);
    }
}