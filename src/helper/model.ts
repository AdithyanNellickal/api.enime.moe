import Prisma from '@prisma/client';

export function clearAnimeField(anime: Prisma.Anime) {
    delete anime["title_english"];
    delete anime["title_romaji"];

    return anime;
}