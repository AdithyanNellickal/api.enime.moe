import { CacheTTL, Controller, Get, Param, Query } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { createPaginator } from 'prisma-pagination';
import { PaginateFunction } from 'prisma-pagination/src';
import Prisma from '@prisma/client';
import { clearAnimeField } from '../helper/model';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import Search from '../entity/search.entity';

@Controller("/search")
@ApiTags("search")
export default class SearchController {
    searchPaginator: PaginateFunction = undefined;

    constructor(private readonly databaseService: DatabaseService) {
        this.searchPaginator = createPaginator({ })
    }

    @Get(":query")
    @CacheTTL(300)
    @Throttle(5, 60)
    @ApiOperation({ summary: "Search anime based on query" })
    @ApiResponse({
        status: 200,
        description: "The list of anime matched from search query"
    })
    async search(@Param("query") query: string, @Query("page") page: number, @Query("perPage") perPage: number): Promise<Search> {
        if (!page || page <= 0) page = 1;
        if (!perPage || perPage <= 0) perPage = 20;
        perPage = Math.min(100, perPage);

        const results = await this.searchPaginator<Prisma.Anime, Prisma.AnimeFindManyArgs>(this.databaseService.anime, {
            orderBy: {
                updatedAt: "desc"
            },
            where: {
                OR: [
                    {
                        AND: query.split(" ").map(q => {
                            return {
                                title_english: {
                                    contains: q,
                                    mode: "insensitive"
                                }
                            }
                        })
                    },
                    {
                        AND: query.split(" ").map(q => {
                            return {
                                title_romaji: {
                                    contains: q,
                                    mode: "insensitive"
                                }
                            }
                        })
                    }
                ]
            }
        }, { page: page, perPage: perPage })

        results.data = results.data.map(anime => {
            clearAnimeField(anime);

            return {
                ...anime
            }
        })

        // @ts-ignore
        return results;
    }
}