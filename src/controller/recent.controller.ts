import { CacheTTL, Controller, Get, Param, Query } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';
import { createPaginator, PaginateFunction } from 'prisma-pagination';
import Prisma from '@prisma/client';
import { clearAnimeField } from '../helper/model';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
    @ApiQuery({
        type: Number,
        name: "page",
        required: false,
        description: "The page number of search list, default to 1"
    })
    @ApiQuery({
        type: Number,
        name: "perPage",
        required: false,
        description: "How many elements per page should this response have? Minimum: 1, maximum: 100"
    })
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
                        website: {
                            select: {
                                name: true,
                                priority: true,
                                subtitle: true
                            }
                        }
                    }
                }
            },
        }, { page: page, perPage: perPage })

        recent.data = recent.data.filter(episode => episode.sources?.length).map(episode => {
            const sources = episode.sources.map(source => {
                return {
                    id: source.id,
                    url: `https://api.enime.moe/proxy/source/${source.id}`,
                    website: source.website.name,
                    priority: source.website.priority,
                    subtitle: source.website.subtitle
                }
            });

            sources.sort((a, b) => a.priority < b.priority);

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
                sources: sources
            }
        });

        // @ts-ignore
        return recent;
    }
}