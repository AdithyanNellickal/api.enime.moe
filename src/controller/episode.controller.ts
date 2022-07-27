import { SkipThrottle } from '@nestjs/throttler';
import { CacheTTL, Controller, Get, NotFoundException, Param } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { clearAnimeField } from '../helper/model';
import { ApiExtraModels, ApiOperation, ApiResponse } from '@nestjs/swagger';
import Episode from '../entity/episode.entity';
import Source from '../entity/source.entity';

@SkipThrottle()
@Controller("/episode")
export default class EpisodeController {
    constructor(private readonly databaseService: DatabaseService) {
    }

    @Get(":id")
    @CacheTTL(300)
    @ApiOperation({ summary: "Get an episode objec with provided ID" })
    @ApiResponse({
        status: 200,
        description: "The found episode object with the ID provided",
        type: Episode
    })
    @ApiExtraModels(Source)
    async get(@Param("id") id: string) {
        const episode = await this.databaseService.episode.findUnique({
            where: {
                id: id
            },
            select: {
                id: true,
                number: true,
                title: true,
                anime: {
                    select: {
                        id: true,
                        title: true,
                        episodes: true
                    }
                },
                sources: {
                    select: {
                        id: true
                    }
                }
            }
        });

        if (!episode) throw new NotFoundException(`The episode with ID ${id} does not exist`);

        return {
            ...episode,
            // @ts-ignore
            anime: clearAnimeField(episode.anime),
            sources: episode.sources.map(source => {
                return {
                    ...source,
                    url: `https://api.enime.moe/proxy/source/${source.id}`
                }
            })
        };
    }
}