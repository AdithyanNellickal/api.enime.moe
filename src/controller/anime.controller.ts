import { CacheTTL, Controller, Get, NotFoundException, Param, UseInterceptors } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';
import cuid from 'cuid';

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
    @CacheTTL(300)
    async get(@Param("id") id) {
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
        };
    }
}