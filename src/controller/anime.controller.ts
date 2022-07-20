import { CacheInterceptor, Controller, Get, NotFoundException, Param, UseInterceptors } from '@nestjs/common';
import DatabaseService from '../database/database.service';

@Controller("/anime")
@UseInterceptors(CacheInterceptor)
export default class AnimeController {
    constructor(private readonly databaseService: DatabaseService) {
    }

    @Get()
    async all(): Promise<Anime[]> {
        const all = await this.databaseService.anime.findMany();

        return all.map(this.transform)
    }

    @Get(":id")
    async get(@Param() params): Promise<Anime> {
        const anime = await this.databaseService.anime.findUnique({
            where: {
                id: params.id
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
            coverImage: dbAnime.coverImage
        }
    }
}

interface Anime {
    id: string;
    anilistId: number;
    title: AnimeTitle;
    season: AnimeSeason;
    coverImage: string;
}

interface AnimeTitle {
    native: string | undefined | null;
    english: string | undefined | null;
    romaji: string | undefined | null;
}

enum AnimeSeason {
    SPRING, SUMMER, FALL, WINTER
}