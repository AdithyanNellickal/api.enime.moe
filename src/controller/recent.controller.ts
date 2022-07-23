import { CacheTTL, Controller, Get, Param } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';
import { createPaginator } from 'prisma-pagination';

@SkipThrottle()
@Controller("/recent")
export default class RecentController {
    episodePaginator = undefined;

    constructor(private readonly databaseService: DatabaseService) {
        this.episodePaginator = createPaginator({ perPage: 50 })
    }

    @Get(":page")
    @CacheTTL(300)
    async recent(@Param("page") page: number) {
        if (page <= 0) page = 1;

        const recent = await this.episodePaginator<Prisma.Episode, Prisma.EpisodeFindManyArgs>(this.databaseService.episode, {
            orderBy: {
                updatedAt: "desc"
            },
            include: {
                anime: true,
                sources: {
                    select: {
                        id: true,
                        url: true
                    }
                }
            },
        }, { page: page })

        return recent.data;
    }
}