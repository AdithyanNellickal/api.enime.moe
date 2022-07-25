import { CacheTTL, Controller, Get, Param, Query } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';
import { createPaginator, PaginateFunction } from 'prisma-pagination';
import Prisma from '@prisma/client';

@SkipThrottle()
@Controller("/recent")
export default class RecentController {
    episodePaginator: PaginateFunction = undefined;

    constructor(private readonly databaseService: DatabaseService) {
        this.episodePaginator = createPaginator({})
    }

    @Get()
    @CacheTTL(300)
    async recent(@Query("page") page: number, @Query("perPage") perPage: number) {
        if (!page || page <= 0) page = 1;
        if (!perPage || perPage <= 0) perPage = 20;
        perPage = Math.min(100, perPage);

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
        }, { page: page, perPage: perPage })

        recent.data = recent.data.map(episode => {
            // @ts-ignore
            delete episode.anime["title_english"];
            // @ts-ignore
            delete episode.anime["title_romaji"];

            return {
                ...episode,
                // @ts-ignore
                sources: episode.sources.map(source => {
                    return {
                        ...source,
                        url: `https://api.enime.moe/proxy/source/${source.id}`
                    }
                })
            }
        });

        return recent;
    }
}