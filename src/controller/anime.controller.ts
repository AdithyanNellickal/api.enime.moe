import { CacheInterceptor, CacheTTL, Controller, Get, NotFoundException, Param, UseInterceptors } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller("/anime")
@UseInterceptors(CacheInterceptor)
export default class AnimeController {
    constructor(private readonly databaseService: DatabaseService) {
    }

    @Get()
    @CacheTTL(600)
    async all(): Promise<Anime[]> {
        const all = await this.databaseService.anime.findMany({
            include: {
                genre: true,
                episodes: {
                    include: {
                        sources: true
                    }
                }
            }
        });

        return all.map(this.transform)
    }

    @Get(":id")
    @CacheTTL(300)
    async get(@Param() params): Promise<Anime> {
        const anime = await this.databaseService.anime.findUnique({
            where: {
                id: params.id
            },
            include: {
                genre: true
            }
        });

        if (!anime) throw new NotFoundException(`The anime with ID ${params.id} does not exist`);

        return this.transform(anime);
    }

    transform(dbAnime): Anime {
        return {
            id: dbAnime.id,
            anilistId: dbAnime.anilistId,
            title: dbAnime.title as unknown as AnimeTitle,
            season: dbAnime.season as unknown as AnimeSeason,
            coverImage: dbAnime.coverImage,
            genres: dbAnime.genre.map(g => g.name),
            synonyms: dbAnime.synonyms,
            episodes: dbAnime.episodes
        }
    }
}

interface Anime {
    id: string;
    anilistId: number;
    title: AnimeTitle;
    season: AnimeSeason;
    coverImage: string;
    genres: string[];
    synonyms: [];
    episodes: [];
}

interface AnimeTitle {
    native: string | undefined | null;
    english: string | undefined | null;
    romaji: string | undefined | null;
}

enum AnimeSeason {
    SPRING, SUMMER, FALL, WINTER
}