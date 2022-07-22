import { CacheTTL, Controller, Get, NotFoundException, Param, UseInterceptors } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller("/anime")
export default class AnimeController {
    constructor(private readonly databaseService: DatabaseService) {
    }

    @Get()
    @CacheTTL(600)
    async all() {
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

        return all.map(anime => {
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
    @CacheTTL(300)
    async get(@Param() params) {
        const anime = await this.databaseService.anime.findUnique({
            where: {
                id: params.id
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

        if (!anime) throw new NotFoundException(`The anime with ID ${params.id} does not exist`);

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
        };
    }
}