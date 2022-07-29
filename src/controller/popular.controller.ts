import { CacheTTL, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginateFunction } from 'prisma-pagination/src';
import DatabaseService from '../database/database.service';
import { createPaginator } from 'prisma-pagination';
import Prisma from '@prisma/client';
import { clearAnimeField } from '../helper/model';
import Popular from '../entity/popular.entity';

@Controller("/popular")
@ApiTags("popular")
export default class PopularController {
    popularPaginator: PaginateFunction = undefined;

    constructor(private readonly databaseService: DatabaseService) {
        this.popularPaginator = createPaginator({ })
    }

    @Get()
    @CacheTTL(300)
    @ApiOperation({ operationId: "List popular", summary: "List currently releasing anime sorted by popularity" })
    @ApiResponse({
        status: 200,
        description: "The list of anime matched from popularity query",
        type: Popular
    })
    @ApiQuery({
        type: Number,
        name: "page",
        required: false,
        description: "The page number of popularity list, default to 1"
    })
    @ApiQuery({
        type: Number,
        name: "perPage",
        required: false,
        description: "How many elements per page should this response have? Minimum: 1, maximum: 100"
    })
    async popular(@Param("query") query: string, @Query("page") page: number, @Query("perPage") perPage: number): Promise<Popular> {
        if (!page || page <= 0) page = 1;
        if (!perPage || perPage <= 0) perPage = 20;
        perPage = Math.min(100, perPage);

        const results = await this.popularPaginator<Prisma.Anime, Prisma.AnimeFindManyArgs>(this.databaseService.anime, {
            where: {
                status: "RELEASING"
            },
            orderBy: {
                popularity: "desc"
            },
            include: {
                genre: {
                    select: {
                        name: true
                    }
                }
            }
        }, { page: page, perPage: perPage })

        results.data = results.data.map(anime => {
            clearAnimeField(anime);

            return {
                ...anime,
                // @ts-ignore
                genre: anime.genre.map(g => g.name)
            }
        })

        // @ts-ignore
        return results;
    }
}