import { CacheTTL, Controller, Get, Param, Query } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';
import { createPaginator, PaginateFunction } from 'prisma-pagination';
import Prisma from '@prisma/client';
import { clearAnimeField } from '../helper/model';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import Recent from '../entity/recent.entity';

@SkipThrottle()
@Controller("/recent")
@ApiTags("recent")
export default class RecentController {
    episodePaginator: PaginateFunction = undefined;

    constructor(private readonly databaseService: DatabaseService) {
        this.episodePaginator = createPaginator({})
    }

    @Get()
    @CacheTTL(300)
    @ApiOperation({ operationId: "Fetch recent episode releases", summary: "Get recent episode releases" })
    @ApiResponse({
        status: 200,
        description: "The list of recent episode releases, paginated",
        type: Recent
    })
    async recent(@Query("page") page: number, @Query("perPage") perPage: number): Promise<Recent> {
        if (!page || page <= 0) page = 1;
        if (!perPage || perPage <= 0) perPage = 20;
        perPage = Math.min(100, perPage);

        const recent = await this.episodePaginator<Prisma.Episode, Prisma.EpisodeFindManyArgs>(this.databaseService.episode, {
            orderBy: {
                createdAt: "desc"
            },
            where: {
              sources: {
                  some: {}
              }
            },
            include: {
                anime: {
                    include: {
                        genre: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                sources: {
                    select: {
                        id: true,
                        url: true
                    }
                }
            },
        }, { page: page, perPage: perPage })

        recent.data = recent.data.map(episode => {
            return {
                ...episode,
                // @ts-ignore
                anime: {
                    // @ts-ignore
                    ...clearAnimeField(episode.anime),
                    // @ts-ignore
                    genre: episode.anime.genre.map(g => g.name)
                },
                // @ts-ignore
                sources: episode.sources.map(source => {
                    return {
                        ...source,
                        url: `https://api.enime.moe/proxy/source/${source.id}`
                    }
                })
            }
        });

        // @ts-ignore
        return recent;
    }
}