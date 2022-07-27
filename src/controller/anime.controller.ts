import { CacheTTL, Controller, Get, NotFoundException, Param, UseInterceptors } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';
import cuid from 'cuid';
import { clearAnimeField } from '../helper/model';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import Anime from '../entity/anime.entity';

@SkipThrottle()
@Controller("/anime")
@ApiTags("anime")
export default class AnimeController {
    constructor(private readonly databaseService: DatabaseService) {
    }

    @Get()
    @ApiOperation({ operationId: "List anime", summary: "List all anime available in the service", deprecated: true })
    @ApiResponse({
        status: 200,
        description: "All anime objects in the service"
    })
    @CacheTTL(600)
    async all(): Promise<Anime[]> {
        const all = await this.databaseService.anime.findMany({
            include: {
                genre: {
                    select: {
                        name: true
                    }
                },
                episodes: {
                    select: {
                        id: true,
                        number: true,
                        title: true,
                        sources: {
                            select: {
                                id: true
                            }
                        }
                    },
                }
            }
        });

        // @ts-ignore
        return all.map(anime => {
            delete anime["title_english"];
            delete anime["title_romaji"];

            return {
                ...anime,
                genre: anime.genre.map(g => g.name),
                episodes: anime.episodes.map(episode => {
                    return {
                        ...episode,
                        sources: episode.sources.map(source => {
                            return {
                                ...source,
                                url: `https://api.enime.moe/proxy/source/${source.id}`
                            }
                        })
                    }
                })
            }
        });
    }

    @Get(":id")
    @ApiOperation({ operationId: "Get anime", summary: "Get an anime object in the service with ID or slug" })
    @ApiResponse({
        status: 200,
        description: "The found anime object with the ID or slug provided"
    })
    @CacheTTL(300)
    async get(@Param("id") id: string): Promise<Anime> {
        const anime = await this.databaseService.anime.findFirst({
            where: {
                OR: [
                    {
                        id: id
                    },
                    {
                        slug: id
                    }
                ]
            },
            include: {
                genre: {
                    select: {
                        name: true
                    }
                },
                episodes: {
                    select: {
                        id: true,
                        number: true,
                        title: true,
                        sources: {
                            select: {
                                id: true
                            }
                        }
                    },
                }
            }
        });

        if (!anime) throw new NotFoundException(`The anime with ID ${id} does not exist`);

        clearAnimeField(anime);

        return {
            ...anime,
            genre: anime.genre.map(g => g.name),
            // @ts-ignore
            episodes: anime.episodes.map(episode => {
                return {
                    ...episode,
                    sources: episode.sources.map(source => {
                        return {
                            ...source,
                            url: `https://api.enime.moe/proxy/source/${source.id}`
                        }
                    })
                }
            })
        };
    }
}