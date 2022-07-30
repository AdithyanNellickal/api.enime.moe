import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GraphQLClient } from 'graphql-request';
import utc from 'dayjs/plugin/utc';
import dayjs from 'dayjs';
import { AIRING_ANIME } from './anilist-queries';
import DatabaseService from '../database/database.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import slugify from 'slugify';
import fetch from 'node-fetch';
import cuid from 'cuid';

@Injectable()
export default class InformationService implements OnModuleInit {
    private readonly client: GraphQLClient;
    private readonly anilistBaseEndpoint = "https://graphql.anilist.co";
    private readonly seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];
    private readonly animeListMappingEndpoint = "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json";

    constructor(private readonly databaseService: DatabaseService, @InjectQueue("scrape") private readonly queue: Queue) {
        this.client = new GraphQLClient(this.anilistBaseEndpoint, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });

        if (!process.env.TESTING) dayjs.extend(utc);
    }

    async onModuleInit() {
        // await this.resyncAnime();
    }

    async resyncAnime(ids: string[] | undefined = undefined) {
        const mappings = await (await fetch(this.animeListMappingEndpoint)).json();

        let animeList;

        if (!ids?.length) {
            animeList = await this.databaseService.anime.findMany({
                select: {
                    id: true,
                    anilistId: true
                }
            });
        } else {
            animeList = await this.databaseService.$transaction(ids.map(id => this.databaseService.anime.findUnique({
                where: {
                    id: id
                },
                select: {
                    id: true,
                    anilistId: true
                }
            })))
        }

        const transactions = [];

        for (let anime of animeList) {
            let mapping = mappings.find(mapping => mapping?.anilist_id === anime.anilistId);
            if (!mapping) continue;

            const mappingObject: object = {};

            for (let k in mapping) {
                if (k === "type") continue;

                mappingObject[k.replace("_id", "")] = mapping[k];
            }

            transactions.push(this.databaseService.anime.update({
                where: {
                    id: anime.id
                },
                data: {
                    mappings: {
                        ...mappingObject
                    }
                }
            }));
        }

        await this.databaseService.$transaction(transactions);
    }

    async refetchAnime(): Promise<object> {
        const currentSeason = Math.floor((new Date().getMonth() / 12 * 4)) % 4;

        let previousSeason = currentSeason - 1;
        if (previousSeason < 0) previousSeason = 3;

        const trackingAnime = [];
        let current = true;
        let hasNextPageCurrent = true, hasNextPagePast = true;
        let currentPage = 1;

        const requestVariables = {
            season: this.seasons[currentSeason],
            page: currentPage,
            year: new Date().getFullYear(),
            status: "RELEASING",
            format: "TV"
        };

        // No way I'm going to write types for these requests...
        while (hasNextPageCurrent || hasNextPagePast) {
            let animeList = await this.client.request(AIRING_ANIME, requestVariables);

            // @ts-ignore
            trackingAnime.push(...animeList.Page.media);

            if (current) {
                hasNextPageCurrent = animeList.Page.pageInfo.hasNextPage;
                currentPage++;

                if (!hasNextPageCurrent) {
                    current = false;
                    requestVariables.season = this.seasons[previousSeason];
                    requestVariables.year = this.seasons[currentSeason] === "SPRING" ? new Date().getFullYear() - 1 : new Date().getFullYear();

                    currentPage = 1;
                }
            } else {
                hasNextPagePast = animeList.Page.pageInfo.hasNextPage;
                currentPage++;
            }

            requestVariables.page = currentPage;
        }

        let createdAnimeIds = [];
        let updatedAnimeIds = [];

        const transactions = [];

        for (let anime of trackingAnime) {
            let nextEpisode = anime.nextAiringEpisode, currentEpisode = 0;
            if (nextEpisode) {
                currentEpisode = nextEpisode.episode - 1;
                nextEpisode = dayjs.unix(nextEpisode.airingAt).utc().toISOString();
            } else {
                if (anime.status === "FINISHED") {
                    currentEpisode = anime.episodes;
                }
            }

            let animeDb = await this.databaseService.anime.findUnique({
                where: {
                    anilistId: anime.id
                }
            });

            const animeDbObject = {
                title: anime.title,
                anilistId: anime.id,
                slug: slugify(anime.title.userPreferred || anime.title.english || anime.title.romaji).toLowerCase(),
                coverImage: anime.coverImage.extraLarge,
                color: anime.coverImage.color,
                bannerImage: anime.bannerImage,
                description: anime.description,
                duration: anime.duration,
                popularity: anime.popularity,
                averageScore: anime.averageScore,
                status: anime.status,
                season: anime.season,
                seasonInt: anime.seasonInt,
                next: nextEpisode,
                genre: {
                    connectOrCreate: anime.genres.map(genre => {
                        return {
                            where: { name: genre },
                            create: { name: genre }
                        }
                    })
                },
                currentEpisode: currentEpisode,
                synonyms: anime.synonyms,
                title_english: anime.title.english,
                title_romaji: anime.title.romaji
            }

            if (!animeDb) { // Anime does not exist in our database, immediately push it to scrape
                let id = cuid();
                transactions.push(this.databaseService.anime.create({
                    data: {
                        id: id,
                        ...animeDbObject
                    }
                }));
                createdAnimeIds.push(id);
            } else {
                if (animeDb.currentEpisode !== currentEpisode) { // Anime exists in the database but current episode count from Anilist is not the one we stored in database. This means the anime might have updated, push it to scrape queue
                    updatedAnimeIds.push(animeDb.id);
                }

                transactions.push(this.databaseService.anime.update({
                    where: {
                        anilistId: anime.id
                    },
                    data: {
                        ...animeDbObject
                    }
                }))
            }
        }

        await this.databaseService.$transaction(transactions);
        return {
            created: createdAnimeIds,
            updated: updatedAnimeIds
        }
    }
}