import { Logger, Module } from '@nestjs/common';
import { GraphQLClient } from 'graphql-request';
import DatabaseService from '../database/database.service';
import { AIRING_ANIME } from './anilist-queries';
import { Cron, CronExpression } from '@nestjs/schedule';
import ScraperService from '../scraper/scraper.service';

import utc from 'dayjs/plugin/utc';
import dayjs from 'dayjs';
import { BullModule } from '@nestjs/bull';

@Module({
    imports: [BullModule.registerQueue({
        name: "enime"
    })],
    providers: [DatabaseService, ScraperService]
})
export default class InformationModule {
    private readonly client: GraphQLClient;

    anilistBaseEndpoint = "https://graphql.anilist.co";

    seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];

    constructor(private readonly databaseService: DatabaseService) {
        dayjs.extend(utc);

        this.client = new GraphQLClient(this.anilistBaseEndpoint, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async updateAnime() {
        const before = Date.now();
        Logger.debug("Now we start refetching currently releasing anime from Anilist");
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
            format: "TV",
            minEpisodes: 1
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
                    requestVariables.minEpisodes = 16;

                    currentPage = 1;
                }
            } else {
                hasNextPagePast = animeList.Page.pageInfo.hasNextPage;
                currentPage++;
            }
        }

        for (let anime of trackingAnime) {
            let nextEpisode = anime.nextAiringEpisode;
            if (nextEpisode) nextEpisode = dayjs.unix(nextEpisode.airingAt).utc().toISOString();

            await this.databaseService.anime.upsert({
                where: {
                    anilistId: anime.id
                },
                create: {
                    title: anime.title,
                    anilistId: anime.id,
                    coverImage: anime.coverImage.extraLarge,
                    status: anime.status,
                    season: anime.season,
                    next: nextEpisode,
                    genre: {
                        connectOrCreate: anime.genres.map(genre => {
                            return {
                                where: { name: genre },
                                create: { name: genre }
                            }
                        })
                    },
                    synonyms: anime.synonyms
                },
                update: {
                    coverImage: anime.coverImage.extraLarge,
                    title: anime.title,
                    status: anime.status,
                    season: anime.season,
                    next: nextEpisode,
                    genre: {
                        connectOrCreate: anime.genres.map(genre => {
                            return {
                                where: { name: genre },
                                create: { name: genre }
                            }
                        })
                    },
                    synonyms: anime.synonyms
                }
            });
        }

        Logger.debug(`Refetching completed, took ${Date.now() - before}ms, tracked ${trackingAnime.length} anime entries.`);
    }
}