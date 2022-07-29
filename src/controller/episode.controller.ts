import { SkipThrottle } from '@nestjs/throttler';
import { CacheTTL, Controller, Get, NotFoundException, Param } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { clearAnimeField } from '../helper/model';
import { ApiExtraModels, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import Episode from '../entity/episode.entity';
import Source from '../entity/source.entity';

@SkipThrottle()
@Controller("/episode")
@ApiTags("episode")
export default class EpisodeController {
    constructor(private readonly databaseService: DatabaseService) {
    }

    @Get(":id")
    @CacheTTL(300)
    @ApiOperation({ operationId: "Get episode", summary: "Get an episode object with provided ID" })
    @ApiResponse({
        status: 200,
        description: "The found episode object with the ID provided",
        type: Episode
    })
    @ApiResponse({
        status: 404,
        description: "The episode cannot be found within the database for given ID"
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
                        episodes: true,
                        genre: {
                            select: {
                                name: true
                            }
                        },
                        bannerImage: true,
                        coverImage: true
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
            }
        });

        if (!episode) throw new NotFoundException(`The episode with ID ${id} does not exist`);

        const sources = episode.filter(episode => episode.sources?.length).sources.map(source => {
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
            anime: {
                // @ts-ignore
                ...clearAnimeField(episode.anime),
                genre: episode.anime.genre.map(g => g.name)
            },
            // @ts-ignore
            sources: sources
        };
    }
}